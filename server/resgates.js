import crypto from 'node:crypto'
import { pool, auditar } from './db.js'
import { hojeBrt, horaBrt, diaSemanaBrt, inicioDoMes, inicioDaSemana } from './datas.js'

/*
  O motor de resgate. É o único ponto do sistema onde dinheiro de verdade troca
  de mão no balcão, então tudo aqui é escrito para falhar fechado: na dúvida,
  não libera o desconto.

  Fluxo:
    morador toca "Usar agora" → gerarCodigo()  → 6 dígitos, 5 minutos de vida
    balconista digita o código → validarCodigo() → grava o resgate, mata o código

  As barreiras estão no escopo como R1..R8. Cada uma vira uma frase legível para
  o morador ou para o balconista — nunca um erro técnico na tela.
*/

/** Erro de regra de negócio: vira resposta legível, não stack trace. */
export class ErroDeRegra extends Error {
  constructor(mensagem, status = 400, extra = {}) {
    super(mensagem)
    this.status = status
    this.extra = extra
  }
}

const NOMES_PERIODO = {
  total: 'no total',
  mes: 'neste mês',
  semana: 'nesta semana',
  dia: 'hoje',
}

/* ---------- janela de validade ----------
   Pura, sem banco: a mesma função decide se a oferta aparece disponível na
   lista e se o código pode ser gerado. Duas implementações separadas acabariam
   discordando, e o morador veria "usar agora" num cupom que o servidor recusa. */

export function avaliarJanela(oferta, agora = new Date()) {
  const hoje = hojeBrt(agora)
  const hora = horaBrt(agora)
  const dow = diaSemanaBrt(agora)

  if (oferta.status !== 'aprovada') {
    return { ok: false, motivo: 'Esta oferta não está ativa no momento.' }
  }
  if (hoje < oferta.inicio) {
    return { ok: false, motivo: 'Esta oferta ainda não começou.' }
  }
  if (hoje > oferta.fim) {
    return { ok: false, motivo: 'Esta oferta já encerrou.' }
  }

  const dias = oferta.dias_semana ?? []
  if (dias.length > 0 && !dias.includes(dow)) {
    return { ok: false, motivo: `Válida só ${listarDias(dias)}.` }
  }

  if (oferta.hora_inicio && hora < oferta.hora_inicio) {
    return { ok: false, motivo: `Começa às ${oferta.hora_inicio}.` }
  }
  if (oferta.hora_fim && hora > oferta.hora_fim) {
    return { ok: false, motivo: `Encerrou às ${oferta.hora_fim} de hoje.` }
  }

  return { ok: true, motivo: null }
}

const ABREV = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function listarDias(dias) {
  const nomes = [...dias].sort((a, b) => a - b).map((d) => ABREV[d])
  if (nomes.length === 1) return `às ${nomes[0]}`
  return `de ${nomes[0]} a ${nomes[nomes.length - 1]}`
}

/** Início do período de contagem do limite por morador. */
export function inicioDoPeriodo(periodo, hoje) {
  if (periodo === 'dia') return hoje
  if (periodo === 'semana') return inicioDaSemana(hoje)
  if (periodo === 'mes') return inicioDoMes(hoje)
  return '1970-01-01' // 'total'
}

/* ---------- economia ----------
   O número que vai para "quanto você economizou" e, somado, para o relatório da
   ACIL. Quando o balconista digita o valor da compra, a conta é real. Quando
   não digita, cai na estimativa cadastrada na oferta — por isso o relatório
   marca quanto do total veio de valor informado. */

export function calcularEconomia(oferta, valorCompra) {
  const estimada = Number(oferta.economia_estimada) || 0
  const desconto = Number(oferta.valor_desconto) || 0

  if (oferta.tipo === 'percentual') {
    if (valorCompra > 0) return arredondar((valorCompra * desconto) / 100)
    return estimada
  }
  if (oferta.tipo === 'valor_fixo') {
    if (valorCompra > 0) return arredondar(Math.min(desconto, valorCompra))
    return desconto || estimada
  }
  // leve_pague e brinde: o que o morador leva de graça já está estimado
  return estimada
}

function arredondar(n) {
  return Math.round(n * 100) / 100
}

/* ---------- geração do código ---------- */

function sortear6() {
  // 000000–999999, uniforme. Math.random não entra aqui: o código é a chave que
  // libera desconto, e um gerador previsível seria adivinhável em massa.
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

export async function gerarCodigo({ moradorId, ofertaId, minutosValidade = 5 }) {
  const hoje = hojeBrt()

  const { rows } = await pool.query(
    `SELECT o.*, l.nome AS loja_nome, l.id AS loja_id, l.status AS loja_status,
            (SELECT COUNT(*) FROM lc_contratos c
              WHERE c.loja_id = l.id AND c.status = 'ativo' AND c.fim >= $2) AS contratos_ativos
       FROM lc_ofertas o
       JOIN lc_lojas l ON l.id = o.loja_id
      WHERE o.id = $1`,
    [ofertaId, hoje],
  )
  if (!rows.length) throw new ErroDeRegra('Esta oferta não existe mais.', 404)

  const oferta = rows[0]

  /* R9: contrato vencido tira a loja do ar mesmo que o job ainda não tenha
     rodado. A checagem em runtime é a que vale no balcão. */
  if (oferta.loja_status !== 'ativa' || Number(oferta.contratos_ativos) === 0) {
    throw new ErroDeRegra('Esta loja não está participando do clube no momento.', 409)
  }

  const janela = avaliarJanela(oferta)
  if (!janela.ok) throw new ErroDeRegra(janela.motivo, 409)

  /* R2/R3: sem assinatura vigente, sem código. */
  const assinatura = await pool.query(
    `SELECT id, vence_em FROM lc_assinaturas
      WHERE morador_id = $1 AND status = 'ativa' AND vence_em >= $2
      ORDER BY vence_em DESC LIMIT 1`,
    [moradorId, hoje],
  )
  if (!assinatura.rowCount) {
    throw new ErroDeRegra(
      'Sua assinatura não está ativa. Renove para voltar a usar os cupons.',
      402,
      { precisaAssinar: true },
    )
  }

  /*
    Já existe código pendente e vivo para esta oferta? Devolve o mesmo em vez de
    criar outro. Sem isso, o morador que fecha e reabre a tela ficaria com uma
    fila de códigos válidos ao mesmo tempo — e cada um deles resgatável.
  */
  const pendente = await pool.query(
    `SELECT id, codigo, expira_em FROM lc_resgates
      WHERE morador_id = $1 AND oferta_id = $2 AND status = 'pendente' AND expira_em > now()
      ORDER BY id DESC LIMIT 1`,
    [moradorId, ofertaId],
  )
  if (pendente.rowCount) {
    return { ...pendente.rows[0], oferta, reaproveitado: true }
  }

  /* R7: limite total de resgates da oferta. */
  if (oferta.limite_total != null) {
    const usados = await pool.query(
      `SELECT COUNT(*)::int AS n FROM lc_resgates
        WHERE oferta_id = $1 AND status IN ('validado', 'pendente')`,
      [ofertaId],
    )
    if (usados.rows[0].n >= oferta.limite_total) {
      throw new ErroDeRegra('Os cupons desta oferta acabaram. Fique de olho nas próximas!', 409)
    }
  }

  /* R6: limite por morador dentro do período. */
  const desde = inicioDoPeriodo(oferta.periodo_limite, hoje)
  const meus = await pool.query(
    `SELECT COUNT(*)::int AS n FROM lc_resgates
      WHERE morador_id = $1 AND oferta_id = $2 AND status = 'validado' AND dia >= $3`,
    [moradorId, ofertaId, desde],
  )
  if (meus.rows[0].n >= oferta.limite_por_morador) {
    const quando = NOMES_PERIODO[oferta.periodo_limite] ?? 'neste período'
    throw new ErroDeRegra(`Você já usou este cupom ${quando}. Volte no próximo período.`, 409)
  }

  /* Insere com retry: o índice parcial garante unicidade entre os pendentes, e
     a colisão é rara o bastante para 6 tentativas resolverem. */
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const codigo = sortear6()
    try {
      const inserido = await pool.query(
        `INSERT INTO lc_resgates
           (oferta_id, loja_id, morador_id, codigo, expira_em, dia)
         VALUES ($1, $2, $3, $4, now() + ($5 || ' minutes')::interval, $6)
         RETURNING id, codigo, expira_em`,
        [ofertaId, oferta.loja_id, moradorId, codigo, String(minutosValidade), hoje],
      )
      return { ...inserido.rows[0], oferta, reaproveitado: false }
    } catch (e) {
      if (e.code !== '23505') throw e // 23505 = unique_violation
    }
  }

  throw new ErroDeRegra('Não consegui gerar seu código agora. Tente de novo em instantes.', 503)
}

/* ---------- validação no balcão ---------- */

export async function validarCodigo({ codigo, lojistaId, valorCompra = null }) {
  const limpo = String(codigo ?? '').replace(/\D/g, '')
  if (limpo.length !== 6) {
    throw new ErroDeRegra('O código tem 6 números. Confira com o cliente.', 400)
  }

  const lojista = await pool.query('SELECT id, loja_id, nome FROM lc_lojistas WHERE id = $1', [
    lojistaId,
  ])
  if (!lojista.rowCount) throw new ErroDeRegra('Sua conta não está mais ativa.', 401)
  const { loja_id: lojaId } = lojista.rows[0]

  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')

    /*
      R5 — o coração do anti-fraude. O FOR UPDATE trava a linha até o COMMIT:
      dois balconistas digitando o mesmo código no mesmo segundo, um passa e o
      outro encontra a linha já como 'validado'. Sem o lock, os dois passariam.
    */
    const trava = await cliente.query(
      `SELECT id, oferta_id, loja_id, morador_id, status, expira_em
         FROM lc_resgates
        WHERE codigo = $1 AND status = 'pendente'
        FOR UPDATE`,
      [limpo],
    )

    if (!trava.rowCount) {
      await cliente.query('ROLLBACK')
      // pode ser código errado, já usado ou expirado — a mensagem cobre os três
      // sem contar ao balconista qual é, para não virar sonda de códigos
      throw new ErroDeRegra('Código inválido, já usado ou expirado. Peça um novo ao cliente.', 404)
    }

    const resgate = trava.rows[0]

    if (new Date(resgate.expira_em).getTime() <= Date.now()) {
      await cliente.query(`UPDATE lc_resgates SET status = 'expirado' WHERE id = $1`, [resgate.id])
      await cliente.query('COMMIT')
      throw new ErroDeRegra('Esse código expirou. Peça para o cliente gerar outro no app.', 409)
    }

    if (resgate.loja_id !== lojaId) {
      await cliente.query('ROLLBACK')
      throw new ErroDeRegra('Este cupom é de outra loja do clube.', 409)
    }

    const detalhe = await cliente.query(
      `SELECT o.titulo, o.tipo, o.valor_desconto, o.economia_estimada, o.regras,
              m.nome AS morador_nome
         FROM lc_ofertas o, lc_moradores m
        WHERE o.id = $1 AND m.id = $2`,
      [resgate.oferta_id, resgate.morador_id],
    )
    const oferta = detalhe.rows[0]

    const compra = Number(valorCompra) > 0 ? arredondar(Number(valorCompra)) : null
    const economia = calcularEconomia(oferta, compra ?? 0)

    await cliente.query(
      `UPDATE lc_resgates
          SET status = 'validado', validado_em = now(), validado_por = $2,
              valor_compra = $3, economia = $4
        WHERE id = $1`,
      [resgate.id, lojistaId, compra, economia],
    )

    await cliente.query('COMMIT')

    await auditar(`lojista:${lojistaId}`, 'validou-cupom', `resgate:${resgate.id}`, {
      codigo: limpo,
      economia,
    })

    return {
      ok: true,
      resgate_id: resgate.id,
      cliente: primeiroNome(oferta.morador_nome),
      oferta: oferta.titulo,
      regras: oferta.regras,
      aplicar: descreverDesconto(oferta),
      economia,
      valor_compra: compra,
    }
  } catch (e) {
    try {
      await cliente.query('ROLLBACK')
    } catch {
      /* a transação já pode ter terminado — ignorar */
    }
    throw e
  } finally {
    cliente.release()
  }
}

function primeiroNome(nome) {
  return String(nome ?? '').trim().split(/\s+/)[0] || 'Cliente'
}

/*
  Anota o valor da compra depois que o cupom já foi validado.

  O balconista informa o total DEPOIS de liberar o desconto — pedir antes
  colocaria uma pergunta entre o cliente e a promoção. Como o resgate já está
  gravado, isto aqui só troca a economia estimada pela real; se ninguém
  preencher, o relatório continua de pé, só com estimativa.

  Janela de 30 minutos: passado o atendimento, ninguém tem por que reescrever o
  valor de uma venda antiga.
*/
export async function anotarValorDaCompra({ resgateId, lojistaId, valorCompra }) {
  const compra = Number(valorCompra)
  if (!Number.isFinite(compra) || compra <= 0) {
    throw new ErroDeRegra('Informe um valor de compra válido.', 400)
  }

  const { rows } = await pool.query(
    `SELECT r.id, o.tipo, o.valor_desconto, o.economia_estimada
       FROM lc_resgates r
       JOIN lc_ofertas o ON o.id = r.oferta_id
      WHERE r.id = $1
        AND r.status = 'validado'
        AND r.validado_em > now() - interval '30 minutes'
        AND r.loja_id = (SELECT loja_id FROM lc_lojistas WHERE id = $2)`,
    [resgateId, lojistaId],
  )
  if (!rows.length) {
    throw new ErroDeRegra('Esse atendimento já foi encerrado e não pode mais ser alterado.', 409)
  }

  const economia = calcularEconomia(rows[0], arredondar(compra))

  await pool.query(
    `UPDATE lc_resgates SET valor_compra = $2, economia = $3 WHERE id = $1`,
    [resgateId, arredondar(compra), economia],
  )

  await auditar(`lojista:${lojistaId}`, 'anotou-valor', `resgate:${resgateId}`, {
    valor_compra: compra,
    economia,
  })

  return { ok: true, economia, valor_compra: arredondar(compra) }
}

/** Frase que o balconista lê na tela: o que ele tem que fazer, em português. */
export function descreverDesconto(oferta) {
  const v = Number(oferta.valor_desconto) || 0
  if (oferta.tipo === 'percentual') return `${formatarNumero(v)}% de desconto`
  if (oferta.tipo === 'valor_fixo') return `R$ ${formatarNumero(v)} de desconto`
  if (oferta.tipo === 'leve_pague') return 'Leve 2, pague 1'
  if (oferta.tipo === 'brinde') return 'Entregar o brinde da promoção'
  return 'Aplicar a promoção'
}

function formatarNumero(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')
}
