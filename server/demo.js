import { pool, auditar } from './db.js'
import { hojeBrt, diferencaEmDias } from './datas.js'

/*
  ─────────────────────────────────────────────────────────────
  MANTER A DEMONSTRAÇÃO VIVA
  ─────────────────────────────────────────────────────────────

  O problema que isto resolve, com nome e data: o seed foi rodado em 10/08/2026
  e ancorado naquele dia. Em 07/10 a apresentação abria assim —

      0 dias com movimento nos últimos 30   (todos os gráficos vazios)
      R$ 0 de receita no mês, 0 cupons no mês
      2 contratos vencidos → 2 lojas fora do app
      0 ofertas relâmpago (a "só hoje" morreu em 11/08)

  Nada disso é defeito: são as regras R9 e de vigência funcionando direito. O
  defeito é a demonstração depender de alguém lembrar de re-semear antes de cada
  reunião — e ninguém lembra na véspera de falar com a ACIL.

  A solução NÃO é gerar dado novo todo dia (a base incharia e os números
  mentiriam, crescendo sozinhos). É DESLOCAR o que já existe: calcula quantos
  dias se passaram desde o resgate mais recente e empurra o conjunto inteiro
  para a frente por esse tanto.

  O resultado é que a curva de adoção, o pico de sexta-feira e o horário de almoço
  continuam exatamente os mesmos — só que terminando hoje. Zero linha nova, zero
  inflação, e a apresentação abre viva em qualquer dia do ano.

  ⚠️  SÓ TOCA EM DADO DE DEMONSTRAÇÃO. Toda consulta aqui é filtrada por
  `lc_lojas.demo` ou `lc_moradores.demo`. Quando as lojas reais entrarem, elas
  nascem com demo = false e esta rotina passa longe delas.
*/

/** Quantos dias faltam para o conjunto de demonstração terminar hoje. */
async function defasagem() {
  const { rows } = await pool.query(
    `SELECT MAX(r.dia) AS ultimo
       FROM lc_resgates r
       JOIN lc_lojas l ON l.id = r.loja_id
      WHERE l.demo AND r.status = 'validado'`,
  )
  if (!rows[0]?.ultimo) return 0
  return diferencaEmDias(rows[0].ultimo, hojeBrt())
}

export async function reancorarDemo({ forcar = false } = {}) {
  if (!pool) return { deslocou: 0, motivo: 'sem banco' }

  const dias = await defasagem()

  /*
    Abaixo de 1 dia não há o que fazer. E sem `forcar` exigimos 2 dias: assim a
    rotina não fica empurrando o conjunto algumas horas de cada vez quando roda
    várias vezes no mesmo dia (boot + agendador).
  */
  if (dias < (forcar ? 1 : 2)) return { deslocou: 0, motivo: 'já está em dia' }

  const salto = `${dias} days`
  const hoje = hojeBrt()
  const cliente = await pool.connect()

  try {
    await cliente.query('BEGIN')

    /* ---- resgates: o histórico inteiro anda junto ---- */
    await cliente.query(
      `UPDATE lc_resgates r
          SET dia         = r.dia + $1::interval,
              gerado_em   = r.gerado_em + $1::interval,
              expira_em   = r.expira_em + $1::interval,
              validado_em = r.validado_em + $1::interval
        FROM lc_lojas l
       WHERE l.id = r.loja_id AND l.demo AND r.status = 'validado'`,
      [salto],
    )

    /* ---- contratos: andam e voltam a valer ---- */
    await cliente.query(
      `UPDATE lc_contratos c
          SET inicio = c.inicio + $1::interval,
              fim    = c.fim + $1::interval,
              status = CASE WHEN c.fim + $1::interval >= $2::date THEN 'ativo' ELSE c.status END
        FROM lc_lojas l
       WHERE l.id = c.loja_id AND l.demo`,
      [salto, hoje],
    )

    /*
      ---- ofertas ----
      A relâmpago "só hoje" volta a valer hoje, que é o cartão de visitas da
      home. `expirada` volta a `aprovada` quando a nova data alcança o presente;
      `pendente` e `reprovada` ficam como estão — são a fila de curadoria, e
      mexer nelas apagaria a demonstração do R12.
    */
    await cliente.query(
      `UPDATE lc_ofertas o
          SET inicio = o.inicio + $1::interval,
              fim    = o.fim + $1::interval,
              status = CASE
                         WHEN o.status = 'expirada' AND o.fim + $1::interval >= $2::date
                           THEN 'aprovada'
                         ELSE o.status
                       END
        FROM lc_lojas l
       WHERE l.id = o.loja_id AND l.demo`,
      [salto, hoje],
    )

    /* ---- assinaturas e pagamentos ---- */
    await cliente.query(
      `UPDATE lc_assinaturas a
          SET inicio   = a.inicio + $1::interval,
              vence_em = a.vence_em + $1::interval,
              status   = CASE WHEN a.vence_em + $1::interval >= $2::date THEN 'ativa' ELSE a.status END
        FROM lc_moradores m
       WHERE m.id = a.morador_id AND m.demo`,
      [salto, hoje],
    )

    await cliente.query(
      `UPDATE lc_pagamentos p
          SET pago_em = p.pago_em + $1::interval
        FROM lc_assinaturas a
        JOIN lc_moradores m ON m.id = a.morador_id
       WHERE a.id = p.assinatura_id AND m.demo`,
      [salto],
    )

    await cliente.query(
      `UPDATE lc_moradores SET criado_em = criado_em + $1::interval WHERE demo`,
      [salto],
    )

    await cliente.query('COMMIT')
  } catch (e) {
    await cliente.query('ROLLBACK')
    throw e
  } finally {
    cliente.release()
  }

  console.log(`[demo] conjunto de demonstração deslocado ${dias} dias — termina hoje (${hoje})`)
  await auditar('sistema', 'reancorou-demo', null, { dias })

  return { deslocou: dias }
}

/*
  Roda no boot e uma vez por dia. Uma volta é barata (seis UPDATEs numa
  transação) e, quando já está em dia, sai na primeira consulta.
*/
export function iniciarManutencaoDemo() {
  if (!pool) return
  const rodar = () => reancorarDemo().catch((e) => console.error('[demo]', e.message))
  rodar()
  setInterval(rodar, 24 * 60 * 60 * 1000)
}
