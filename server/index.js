import express from 'express'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import {
  pool,
  initDb,
  lerConfig,
  gravarConfig,
  auditar,
  iniciarAgendador,
  CATEGORIAS,
  TIPOS_OFERTA,
  PERIODOS_LIMITE,
} from './db.js'
import {
  rotasAuth,
  exigirMorador,
  exigirLojista,
  exigirAdmin,
  quemEsta,
  gerarHash,
  normalizarWhatsapp,
} from './auth.js'
import {
  gerarCodigo,
  validarCodigo,
  anotarValorDaCompra,
  avaliarJanela,
  descreverDesconto,
  ErroDeRegra,
} from './resgates.js'
import { hojeBrt, somarDias, dataValida, horaValida, diferencaEmDias } from './datas.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dist = join(__dirname, '..', 'dist')

const app = express()
app.set('trust proxy', 1) // atrás do Traefik do Coolify — req.ip real
app.use(express.json({ limit: '256kb' }))
app.use(express.static(dist))

/* ---------- utilidades de validação ----------
   Toda entrada passa por aqui antes de tocar o banco. O que volta para a tela é
   sempre frase legível — nunca erro cru do Postgres. */

function texto(v, max = 500) {
  const s = String(v ?? '').trim()
  return s ? s.slice(0, max) : null
}

function inteiro(v, { min = 0, max = 1_000_000 } = {}) {
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  const i = Math.round(n)
  return i >= min && i <= max ? i : null
}

function dinheiro(v, { max = 1_000_000 } = {}) {
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  return n >= 0 && n <= max ? Math.round(n * 100) / 100 : null
}

function exigirBanco(_req, res, next) {
  if (!pool) {
    return res.status(503).json({
      erro: 'O banco de dados não está disponível agora. Tente de novo em alguns minutos.',
    })
  }
  next()
}

/** Embrulha um handler async: erro de regra vira frase, erro real vira log. */
function rota(handler) {
  return async (req, res) => {
    try {
      await handler(req, res)
    } catch (e) {
      if (e instanceof ErroDeRegra) {
        return res.status(e.status).json({ erro: e.message, ...e.extra })
      }
      console.error('[api]', req.method, req.path, e)
      if (!res.headersSent) {
        res.status(500).json({ erro: 'Algo deu errado do nosso lado. Tente de novo.' })
      }
    }
  }
}

/* ---------- fragmentos SQL reaproveitados ----------
   A loja só existe para o morador se estiver ativa E com contrato vigente. Essa
   condição aparece em toda consulta pública; escrita uma vez só para não
   divergir entre telas. `$hoje` é sempre o primeiro parâmetro de quem usa. */

const LOJA_NO_AR = `
  l.status = 'ativa'
  AND EXISTS (
    SELECT 1 FROM lc_contratos c
     WHERE c.loja_id = l.id AND c.status = 'ativo' AND c.fim >= $1
  )`

const INICIO_PERIODO = `
  CASE o.periodo_limite
    WHEN 'dia'    THEN $1::date
    WHEN 'semana' THEN date_trunc('week',  $1::date)::date
    WHEN 'mes'    THEN date_trunc('month', $1::date)::date
    ELSE '1970-01-01'::date
  END`

/* ---------- saúde ---------- */

app.get('/healthz', async (_req, res) => {
  let db = 'sem-banco'
  if (pool) {
    try {
      await pool.query('SELECT 1')
      db = 'ok'
    } catch {
      db = 'erro'
    }
  }
  res.json({ ok: true, db, hoje: hojeBrt() })
})

/* ---------- configuração pública ---------- */

/*
  Piloto: o checkout roda em modo demonstração. A tela é a real e o fluxo é o
  real, mas nenhuma cobrança acontece — a assinatura é liberada na hora, para a
  apresentação fluir sem cartão de verdade. Com MERCADO_PAGO_TOKEN configurado
  (Fase 1), a mesma rota passa a criar a cobrança real e o front não muda.
*/
const MODO_DEMO = !process.env.MERCADO_PAGO_TOKEN

app.get(
  '/api/config',
  rota(async (_req, res) => {
    const config = await lerConfig()
    res.json({
      nome_app: config.nome_app,
      chamada: config.chamada,
      preco_anual: config.preco_anual,
      preco_pix: config.preco_pix,
      parcelas_max: config.parcelas_max,
      categorias: CATEGORIAS,
      demo: MODO_DEMO,
    })
  }),
)

rotasAuth(app, rota, exigirBanco)

/* ======================================================================
   MORADOR
   ====================================================================== */

app.get(
  '/api/morador/sessao',
  rota(async (req, res) => {
    const id = quemEsta(req, 'morador')
    if (!id || !pool) return res.json({ logado: false })

    const hoje = hojeBrt()
    const { rows } = await pool.query(
      `SELECT m.id, m.nome, m.whatsapp, m.bairro,
              a.status AS assinatura_status, a.vence_em, a.valor, a.forma, a.parcelas
         FROM lc_moradores m
         LEFT JOIN LATERAL (
              SELECT * FROM lc_assinaturas s
               WHERE s.morador_id = m.id ORDER BY s.vence_em DESC LIMIT 1
         ) a ON TRUE
        WHERE m.id = $1`,
      [id],
    )
    if (!rows.length) return res.json({ logado: false })

    const m = rows[0]
    const ativa = m.assinatura_status === 'ativa' && m.vence_em >= hoje

    res.json({
      logado: true,
      morador: { id: m.id, nome: m.nome, whatsapp: m.whatsapp, bairro: m.bairro },
      assinante: ativa,
      assinatura: m.vence_em
        ? {
            status: ativa ? 'ativa' : 'vencida',
            vence_em: m.vence_em,
            dias_restantes: diferencaEmDias(hoje, m.vence_em),
            valor: m.valor,
            forma: m.forma,
            parcelas: m.parcelas,
          }
        : null,
    })
  }),
)

/* Lista pública de ofertas. R1: quem não assina vê tudo — a isca é justamente
   ver o que está perdendo. Só o botão de gerar código é que trava (R2). */
app.get(
  '/api/morador/ofertas',
  exigirBanco,
  rota(async (req, res) => {
    const hoje = hojeBrt()
    const moradorId = quemEsta(req, 'morador') ?? 0
    const categoria = texto(req.query.categoria, 60)
    const busca = texto(req.query.busca, 60)

    const filtros = []
    const params = [hoje, moradorId]

    if (categoria && CATEGORIAS.includes(categoria)) {
      params.push(categoria)
      filtros.push(`AND l.categoria = $${params.length}`)
    }
    if (busca) {
      params.push(`%${busca}%`)
      filtros.push(`AND (o.titulo ILIKE $${params.length} OR l.nome ILIKE $${params.length})`)
    }

    const { rows } = await pool.query(
      `SELECT o.id, o.titulo, o.descricao, o.tipo, o.valor_desconto, o.economia_estimada,
              o.regras, o.inicio, o.fim, o.dias_semana, o.hora_inicio, o.hora_fim,
              o.limite_total, o.limite_por_morador, o.periodo_limite,
              o.relampago, o.destaque, o.status,
              l.id AS loja_id, l.nome AS loja_nome, l.categoria, l.endereco, l.cor,
              COALESCE(u.usados, 0)  AS usados,
              COALESCE(mm.meus, 0)   AS meus_no_periodo
         FROM lc_ofertas o
         JOIN lc_lojas l ON l.id = o.loja_id
         LEFT JOIN LATERAL (
              SELECT COUNT(*)::int AS usados FROM lc_resgates r
               WHERE r.oferta_id = o.id AND r.status IN ('validado', 'pendente')
         ) u ON TRUE
         LEFT JOIN LATERAL (
              SELECT COUNT(*)::int AS meus FROM lc_resgates r
               WHERE r.oferta_id = o.id AND r.morador_id = $2
                 AND r.status = 'validado' AND r.dia >= ${INICIO_PERIODO}
         ) mm ON TRUE
        WHERE o.status = 'aprovada'
          AND o.inicio <= $1 AND o.fim >= $1
          AND ${LOJA_NO_AR}
          ${filtros.join(' ')}
        ORDER BY o.relampago DESC, o.destaque DESC, o.criada_em DESC`,
      params,
    )

    res.json({ hoje, ofertas: rows.map(enriquecerOferta) })
  }),
)

/** Acrescenta a leitura de disponibilidade que o front só precisa exibir. */
function enriquecerOferta(o) {
  const janela = avaliarJanela(o)
  const esgotada = o.limite_total != null && o.usados >= o.limite_total
  const jaUsou = o.meus_no_periodo >= o.limite_por_morador

  let motivo = null
  if (!janela.ok) motivo = janela.motivo
  else if (esgotada) motivo = 'Os cupons desta oferta acabaram.'
  else if (jaUsou) motivo = 'Você já usou este cupom neste período.'

  return {
    ...o,
    aplicar: descreverDesconto(o),
    disponivel: janela.ok && !esgotada && !jaUsou,
    motivo,
    restantes: o.limite_total != null ? Math.max(0, o.limite_total - o.usados) : null,
  }
}

app.get(
  '/api/morador/ofertas/:id',
  exigirBanco,
  rota(async (req, res) => {
    const hoje = hojeBrt()
    const moradorId = quemEsta(req, 'morador') ?? 0
    const id = inteiro(req.params.id)
    if (!id) return res.status(400).json({ erro: 'Oferta não encontrada.' })

    const { rows } = await pool.query(
      `SELECT o.*, l.id AS loja_id, l.nome AS loja_nome, l.categoria, l.endereco,
              l.referencia, l.horario, l.whatsapp, l.instagram, l.cor, l.descricao AS loja_descricao,
              COALESCE(u.usados, 0) AS usados,
              COALESCE(mm.meus, 0)  AS meus_no_periodo
         FROM lc_ofertas o
         JOIN lc_lojas l ON l.id = o.loja_id
         LEFT JOIN LATERAL (
              SELECT COUNT(*)::int AS usados FROM lc_resgates r
               WHERE r.oferta_id = o.id AND r.status IN ('validado', 'pendente')
         ) u ON TRUE
         LEFT JOIN LATERAL (
              SELECT COUNT(*)::int AS meus FROM lc_resgates r
               WHERE r.oferta_id = o.id AND r.morador_id = $2
                 AND r.status = 'validado' AND r.dia >= ${INICIO_PERIODO}
         ) mm ON TRUE
        WHERE o.id = $3 AND ${LOJA_NO_AR}`,
      [hoje, moradorId, id],
    )
    if (!rows.length) return res.status(404).json({ erro: 'Essa oferta não está mais disponível.' })

    res.json({ oferta: enriquecerOferta(rows[0]) })
  }),
)

app.get(
  '/api/morador/lojas',
  exigirBanco,
  rota(async (_req, res) => {
    const hoje = hojeBrt()
    const { rows } = await pool.query(
      `SELECT l.id, l.nome, l.categoria, l.endereco, l.referencia, l.lat, l.lng,
              l.horario, l.cor,
              COALESCE(o.n, 0) AS ofertas_ativas
         FROM lc_lojas l
         LEFT JOIN LATERAL (
              SELECT COUNT(*)::int AS n FROM lc_ofertas o
               WHERE o.loja_id = l.id AND o.status = 'aprovada'
                 AND o.inicio <= $1 AND o.fim >= $1
         ) o ON TRUE
        WHERE ${LOJA_NO_AR}
        ORDER BY COALESCE(o.n, 0) DESC, l.nome`,
      [hoje],
    )
    res.json({ lojas: rows })
  }),
)

app.get(
  '/api/morador/lojas/:id',
  exigirBanco,
  rota(async (req, res) => {
    const hoje = hojeBrt()
    const moradorId = quemEsta(req, 'morador') ?? 0
    const id = inteiro(req.params.id)
    if (!id) return res.status(400).json({ erro: 'Loja não encontrada.' })

    const loja = await pool.query(
      `SELECT l.* FROM lc_lojas l WHERE l.id = $2 AND ${LOJA_NO_AR}`,
      [hoje, id],
    )
    if (!loja.rowCount) {
      return res.status(404).json({ erro: 'Essa loja não está participando do clube agora.' })
    }

    const ofertas = await pool.query(
      `SELECT o.*, l.id AS loja_id, l.nome AS loja_nome, l.categoria, l.endereco, l.cor,
              COALESCE(u.usados, 0) AS usados,
              COALESCE(mm.meus, 0)  AS meus_no_periodo
         FROM lc_ofertas o
         JOIN lc_lojas l ON l.id = o.loja_id
         LEFT JOIN LATERAL (
              SELECT COUNT(*)::int AS usados FROM lc_resgates r
               WHERE r.oferta_id = o.id AND r.status IN ('validado', 'pendente')
         ) u ON TRUE
         LEFT JOIN LATERAL (
              SELECT COUNT(*)::int AS meus FROM lc_resgates r
               WHERE r.oferta_id = o.id AND r.morador_id = $2
                 AND r.status = 'validado' AND r.dia >= ${INICIO_PERIODO}
         ) mm ON TRUE
        WHERE o.loja_id = $3 AND o.status = 'aprovada' AND o.inicio <= $1 AND o.fim >= $1
        ORDER BY o.relampago DESC, o.criada_em DESC`,
      [hoje, moradorId, id],
    )

    const favorito = moradorId
      ? (await pool.query('SELECT 1 FROM lc_favoritos WHERE morador_id = $1 AND loja_id = $2', [
          moradorId,
          id,
        ])).rowCount > 0
      : false

    res.json({ loja: loja.rows[0], ofertas: ofertas.rows.map(enriquecerOferta), favorito })
  }),
)

/* Geração do código. Toda a regra vive em resgates.js. */
app.post(
  '/api/morador/resgates',
  exigirBanco,
  exigirMorador,
  rota(async (req, res) => {
    const ofertaId = inteiro(req.body?.oferta_id)
    if (!ofertaId) return res.status(400).json({ erro: 'Oferta não encontrada.' })

    const config = await lerConfig()
    const resultado = await gerarCodigo({
      moradorId: req.moradorId,
      ofertaId,
      minutosValidade: config.minutos_validade_codigo,
    })

    res.json({
      id: resultado.id,
      codigo: resultado.codigo,
      expira_em: resultado.expira_em,
      loja: resultado.oferta.loja_nome,
      titulo: resultado.oferta.titulo,
      aplicar: descreverDesconto(resultado.oferta),
    })
  }),
)

/* O app consulta este endpoint enquanto o código está na tela: assim que o
   balconista valida, a tela do morador vira sozinha para a confirmação. */
app.get(
  '/api/morador/resgates/:id',
  exigirBanco,
  exigirMorador,
  rota(async (req, res) => {
    const id = inteiro(req.params.id, { max: 9_000_000_000 })
    if (!id) return res.status(400).json({ erro: 'Cupom não encontrado.' })

    const { rows } = await pool.query(
      `SELECT r.id, r.codigo, r.status, r.expira_em, r.validado_em, r.economia,
              o.titulo, l.nome AS loja_nome
         FROM lc_resgates r
         JOIN lc_ofertas o ON o.id = r.oferta_id
         JOIN lc_lojas l ON l.id = r.loja_id
        WHERE r.id = $1 AND r.morador_id = $2`,
      [id, req.moradorId],
    )
    if (!rows.length) return res.status(404).json({ erro: 'Cupom não encontrado.' })
    res.json(rows[0])
  }),
)

app.get(
  '/api/morador/conta',
  exigirBanco,
  exigirMorador,
  rota(async (req, res) => {
    const hoje = hojeBrt()

    const resgates = await pool.query(
      `SELECT r.id, r.codigo, r.status, r.dia, r.validado_em, r.economia,
              o.titulo, l.nome AS loja_nome, l.cor
         FROM lc_resgates r
         JOIN lc_ofertas o ON o.id = r.oferta_id
         JOIN lc_lojas l ON l.id = r.loja_id
        WHERE r.morador_id = $1 AND r.status = 'validado'
        ORDER BY r.validado_em DESC LIMIT 100`,
      [req.moradorId],
    )

    const totais = await pool.query(
      `SELECT COUNT(*)::int AS usos, COALESCE(SUM(economia), 0) AS economia
         FROM lc_resgates WHERE morador_id = $1 AND status = 'validado'`,
      [req.moradorId],
    )

    const assinatura = await pool.query(
      `SELECT status, valor, forma, parcelas, inicio, vence_em
         FROM lc_assinaturas WHERE morador_id = $1 ORDER BY vence_em DESC LIMIT 1`,
      [req.moradorId],
    )

    const a = assinatura.rows[0] ?? null

    res.json({
      resgates: resgates.rows,
      economia_total: Number(totais.rows[0].economia) || 0,
      usos: totais.rows[0].usos,
      assinatura: a
        ? { ...a, dias_restantes: diferencaEmDias(hoje, a.vence_em), ativa: a.vence_em >= hoje && a.status === 'ativa' }
        : null,
    })
  }),
)

app.post(
  '/api/morador/favoritos',
  exigirBanco,
  exigirMorador,
  rota(async (req, res) => {
    const lojaId = inteiro(req.body?.loja_id)
    if (!lojaId) return res.status(400).json({ erro: 'Loja não encontrada.' })

    const jaTem = await pool.query(
      'DELETE FROM lc_favoritos WHERE morador_id = $1 AND loja_id = $2 RETURNING 1',
      [req.moradorId, lojaId],
    )
    if (jaTem.rowCount) return res.json({ favorito: false })

    await pool.query('INSERT INTO lc_favoritos (morador_id, loja_id) VALUES ($1, $2)', [
      req.moradorId,
      lojaId,
    ])
    res.json({ favorito: true })
  }),
)

/*
  Checkout. No piloto roda em modo demonstração: a tela é a definitiva, mas a
  cobrança não acontece e a assinatura é liberada na hora, para a apresentação
  fluir sem cartão de verdade. Com MERCADO_PAGO_TOKEN configurado, esta rota
  passa a criar a preferência real — o front não muda.
*/
app.post(
  '/api/morador/assinatura',
  exigirBanco,
  exigirMorador,
  rota(async (req, res) => {
    const config = await lerConfig()
    const forma = req.body?.forma === 'pix' ? 'pix' : 'cartao'
    const parcelas =
      forma === 'pix' ? 1 : Math.min(inteiro(req.body?.parcelas) || 1, config.parcelas_max)
    const valor = forma === 'pix' ? config.preco_pix : config.preco_anual

    if (!MODO_DEMO) {
      return res.status(501).json({
        erro: 'O pagamento real entra na Fase 1. Por enquanto o piloto roda em modo demonstração.',
      })
    }

    const hoje = hojeBrt()
    const vence = somarDias(hoje, 30 * config.meses_vigencia)

    const jaAtiva = await pool.query(
      `SELECT id FROM lc_assinaturas WHERE morador_id = $1 AND status = 'ativa' AND vence_em >= $2`,
      [req.moradorId, hoje],
    )
    if (jaAtiva.rowCount) {
      return res.status(409).json({ erro: 'Sua assinatura já está ativa.' })
    }

    const { rows } = await pool.query(
      `INSERT INTO lc_assinaturas (morador_id, status, valor, forma, parcelas, inicio, vence_em)
       VALUES ($1, 'ativa', $2, $3, $4, $5, $6) RETURNING id, vence_em`,
      [req.moradorId, valor, forma, parcelas, hoje, vence],
    )

    await pool.query(
      `INSERT INTO lc_pagamentos (assinatura_id, referencia, valor, parcela, de_parcelas, status, pago_em)
       VALUES ($1, $2, $3, 1, $4, 'pago', now())`,
      [rows[0].id, 'demo', valor, parcelas],
    )

    await auditar(`morador:${req.moradorId}`, 'assinou', `assinatura:${rows[0].id}`, {
      forma,
      parcelas,
      valor,
      demo: true,
    })

    res.json({ ok: true, vence_em: rows[0].vence_em, demo: true })
  }),
)

/* ======================================================================
   LOJISTA
   ====================================================================== */

app.get(
  '/api/lojista/sessao',
  rota(async (req, res) => {
    const id = quemEsta(req, 'lojista')
    if (!id || !pool) return res.json({ logado: false })

    const { rows } = await pool.query(
      `SELECT u.id, u.nome, u.papel, l.id AS loja_id, l.nome AS loja_nome, l.cor, l.categoria
         FROM lc_lojistas u JOIN lc_lojas l ON l.id = u.loja_id
        WHERE u.id = $1`,
      [id],
    )
    if (!rows.length) return res.json({ logado: false })
    res.json({ logado: true, lojista: rows[0] })
  }),
)

/* A tela mais importante do painel: o balconista digita 6 números e pronto. */
app.post(
  '/api/lojista/validar',
  exigirBanco,
  exigirLojista,
  rota(async (req, res) => {
    const valorCompra = req.body?.valor_compra != null ? dinheiro(req.body.valor_compra) : null
    const resultado = await validarCodigo({
      codigo: req.body?.codigo,
      lojistaId: req.lojistaId,
      valorCompra,
    })
    res.json(resultado)
  }),
)

/* Anota o valor da compra logo depois de validar — troca a economia estimada
   pela real no relatório. Ver anotarValorDaCompra em resgates.js. */
app.patch(
  '/api/lojista/resgates/:id',
  exigirBanco,
  exigirLojista,
  rota(async (req, res) => {
    const id = inteiro(req.params.id, { max: 9_000_000_000 })
    if (!id) return res.status(400).json({ erro: 'Atendimento não encontrado.' })

    const resultado = await anotarValorDaCompra({
      resgateId: id,
      lojistaId: req.lojistaId,
      valorCompra: dinheiro(req.body?.valor_compra),
    })
    res.json(resultado)
  }),
)

app.get(
  '/api/lojista/painel',
  exigirBanco,
  exigirLojista,
  rota(async (req, res) => {
    const hoje = hojeBrt()
    const de = dataValida(req.query.de) ?? somarDias(hoje, -29)

    const lojista = await pool.query('SELECT loja_id FROM lc_lojistas WHERE id = $1', [
      req.lojistaId,
    ])
    const lojaId = lojista.rows[0]?.loja_id
    if (!lojaId) return res.status(401).json({ erro: 'Sua conta não está mais ativa.' })

    const [resumo, porDia, porHora, porOferta, contrato, ofertas] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE dia = $2)::int                         AS hoje,
           COUNT(*) FILTER (WHERE dia >= date_trunc('week', $2::date))::int  AS semana,
           COUNT(*) FILTER (WHERE dia >= date_trunc('month', $2::date))::int AS mes,
           COUNT(*)::int                                                 AS periodo,
           COALESCE(SUM(economia), 0)                                    AS economia,
           COUNT(DISTINCT morador_id)::int                               AS clientes
         FROM lc_resgates
        WHERE loja_id = $1 AND status = 'validado' AND dia >= $3`,
        [lojaId, hoje, de],
      ),
      pool.query(
        `SELECT dia, COUNT(*)::int AS n, COALESCE(SUM(economia), 0) AS economia
           FROM lc_resgates
          WHERE loja_id = $1 AND status = 'validado' AND dia >= $2
          GROUP BY dia ORDER BY dia`,
        [lojaId, de],
      ),
      pool.query(
        `SELECT EXTRACT(HOUR FROM validado_em AT TIME ZONE 'America/Sao_Paulo')::int AS hora,
                COUNT(*)::int AS n
           FROM lc_resgates
          WHERE loja_id = $1 AND status = 'validado' AND dia >= $2
          GROUP BY 1 ORDER BY 1`,
        [lojaId, de],
      ),
      pool.query(
        `SELECT o.id, o.titulo, COUNT(r.id)::int AS n, COALESCE(SUM(r.economia), 0) AS economia
           FROM lc_ofertas o
           LEFT JOIN lc_resgates r
                  ON r.oferta_id = o.id AND r.status = 'validado' AND r.dia >= $2
          WHERE o.loja_id = $1
          GROUP BY o.id, o.titulo ORDER BY n DESC`,
        [lojaId, de],
      ),
      pool.query(
        `SELECT vendedor, inicio, fim, status FROM lc_contratos
          WHERE loja_id = $1 ORDER BY fim DESC LIMIT 1`,
        [lojaId],
      ),
      pool.query(
        `SELECT id, titulo, tipo, valor_desconto, status, inicio, fim, relampago,
                limite_total, limite_por_morador, periodo_limite
           FROM lc_ofertas WHERE loja_id = $1 ORDER BY criada_em DESC`,
        [lojaId],
      ),
    ])

    const c = contrato.rows[0] ?? null

    res.json({
      hoje,
      de,
      resumo: resumo.rows[0],
      por_dia: porDia.rows,
      por_hora: porHora.rows,
      por_oferta: porOferta.rows,
      ofertas: ofertas.rows.map((o) => ({ ...o, aplicar: descreverDesconto(o) })),
      contrato: c ? { ...c, dias_restantes: diferencaEmDias(hoje, c.fim) } : null,
    })
  }),
)

app.get(
  '/api/lojista/resgates',
  exigirBanco,
  exigirLojista,
  rota(async (req, res) => {
    const hoje = hojeBrt()
    const de = dataValida(req.query.de) ?? somarDias(hoje, -29)

    const { rows } = await pool.query(
      `SELECT r.id, r.codigo, r.dia, r.validado_em, r.valor_compra, r.economia,
              o.titulo, m.nome AS morador_nome, u.nome AS validado_por_nome
         FROM lc_resgates r
         JOIN lc_ofertas o ON o.id = r.oferta_id
         JOIN lc_moradores m ON m.id = r.morador_id
         LEFT JOIN lc_lojistas u ON u.id = r.validado_por
        WHERE r.loja_id = (SELECT loja_id FROM lc_lojistas WHERE id = $1)
          AND r.status = 'validado' AND r.dia >= $2
        ORDER BY r.validado_em DESC LIMIT 300`,
      [req.lojistaId, de],
    )

    res.json({
      resgates: rows.map((r) => ({ ...r, morador_nome: r.morador_nome.split(/\s+/)[0] })),
    })
  }),
)

/* Oferta criada pela loja entra como pendente (R12). A curadoria do admin é o
   que protege o valor da assinatura do morador. */
app.post(
  '/api/lojista/ofertas',
  exigirBanco,
  exigirLojista,
  rota(async (req, res) => {
    const lojista = await pool.query('SELECT loja_id FROM lc_lojistas WHERE id = $1', [
      req.lojistaId,
    ])
    const lojaId = lojista.rows[0]?.loja_id
    if (!lojaId) return res.status(401).json({ erro: 'Sua conta não está mais ativa.' })

    const dados = lerOferta(req.body)
    if (dados.erro) return res.status(400).json({ erro: dados.erro })

    const { rows } = await pool.query(
      `INSERT INTO lc_ofertas
         (loja_id, titulo, descricao, tipo, valor_desconto, economia_estimada, regras,
          inicio, fim, dias_semana, hora_inicio, hora_fim, limite_total,
          limite_por_morador, periodo_limite, relampago, status, criada_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'pendente','lojista')
       RETURNING id`,
      [lojaId, ...dados.valores],
    )

    await auditar(`lojista:${req.lojistaId}`, 'criou-oferta', `oferta:${rows[0].id}`, {
      titulo: dados.valores[0],
    })

    res.json({
      ok: true,
      id: rows[0].id,
      aviso: 'Oferta enviada! Ela entra no app assim que a equipe do clube aprovar.',
    })
  }),
)

app.patch(
  '/api/lojista/ofertas/:id',
  exigirBanco,
  exigirLojista,
  rota(async (req, res) => {
    const id = inteiro(req.params.id)
    const acao = texto(req.body?.acao, 20)
    if (!id || !['pausar', 'retomar'].includes(acao)) {
      return res.status(400).json({ erro: 'Ação inválida.' })
    }

    const novo = acao === 'pausar' ? 'pausada' : 'aprovada'
    const anterior = acao === 'pausar' ? 'aprovada' : 'pausada'

    const { rowCount } = await pool.query(
      `UPDATE lc_ofertas SET status = $3
        WHERE id = $1 AND status = $4
          AND loja_id = (SELECT loja_id FROM lc_lojistas WHERE id = $2)`,
      [id, req.lojistaId, novo, anterior],
    )
    if (!rowCount) {
      return res.status(409).json({ erro: 'Não foi possível mudar essa oferta agora.' })
    }

    await auditar(`lojista:${req.lojistaId}`, `oferta-${acao}`, `oferta:${id}`)
    res.json({ ok: true })
  }),
)

/* ======================================================================
   ADMIN
   ====================================================================== */

app.get('/api/admin/sessao', (req, res) => {
  res.json({ logado: Boolean(quemEsta(req, 'admin')) })
})

app.get(
  '/api/admin/painel',
  exigirBanco,
  exigirAdmin,
  rota(async (_req, res) => {
    const hoje = hojeBrt()
    const mesPassado = somarDias(hoje, -29)

    const [assinantes, resgates, lojas, alertas, porDia] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE a.status = 'ativa' AND a.vence_em >= $1)::int AS pagantes,
           COUNT(*) FILTER (WHERE a.vence_em < $1)::int                          AS vencidas,
           COUNT(*) FILTER (WHERE a.inicio >= date_trunc('month', $1::date))::int AS novos_no_mes,
           COALESCE(SUM(a.valor) FILTER (WHERE a.inicio >= date_trunc('month', $1::date)), 0) AS receita_mes,
           COALESCE(SUM(a.valor), 0) AS receita_total
         FROM lc_assinaturas a`,
        [hoje],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE dia >= date_trunc('month', $1::date))::int AS no_mes,
                COALESCE(SUM(economia), 0) AS economia,
                COUNT(DISTINCT morador_id)::int AS moradores_ativos
           FROM lc_resgates WHERE status = 'validado'`,
        [hoje],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE l.status = 'ativa' AND EXISTS (
                    SELECT 1 FROM lc_contratos c
                     WHERE c.loja_id = l.id AND c.status = 'ativo' AND c.fim >= $1))::int AS no_ar
           FROM lc_lojas l`,
        [hoje],
      ),
      pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM lc_ofertas WHERE status = 'pendente')          AS ofertas_pendentes,
           (SELECT COUNT(*)::int FROM lc_contratos
             WHERE status = 'ativo' AND fim BETWEEN $1 AND $1::date + 30)            AS contratos_vencendo,
           (SELECT COUNT(*)::int FROM lc_assinaturas
             WHERE status = 'ativa' AND vence_em BETWEEN $1 AND $1::date + 60)       AS assinaturas_vencendo,
           (SELECT COUNT(*)::int FROM lc_lojas l
             WHERE l.status = 'ativa' AND NOT EXISTS (
                   SELECT 1 FROM lc_ofertas o WHERE o.loja_id = l.id
                    AND o.status = 'aprovada' AND o.fim >= $1))                      AS lojas_sem_oferta,
           (SELECT COUNT(*)::int FROM lc_lojas l
             WHERE l.status = 'ativa' AND NOT EXISTS (
                   SELECT 1 FROM lc_resgates r WHERE r.loja_id = l.id
                    AND r.status = 'validado' AND r.dia >= date_trunc('month', $1::date))) AS lojas_sem_resgate,
           (SELECT COUNT(*)::int FROM lc_moradores m
             WHERE EXISTS (SELECT 1 FROM lc_assinaturas a
                            WHERE a.morador_id = m.id AND a.status = 'ativa' AND a.vence_em >= $1)
               AND NOT EXISTS (SELECT 1 FROM lc_resgates r
                                WHERE r.morador_id = m.id AND r.status = 'validado'))  AS assinantes_sem_uso`,
        [hoje],
      ),
      pool.query(
        `SELECT dia, COUNT(*)::int AS n FROM lc_resgates
          WHERE status = 'validado' AND dia >= $1 GROUP BY dia ORDER BY dia`,
        [mesPassado],
      ),
    ])

    res.json({
      hoje,
      assinantes: assinantes.rows[0],
      resgates: resgates.rows[0],
      lojas: lojas.rows[0],
      alertas: alertas.rows[0],
      por_dia: porDia.rows,
    })
  }),
)

app.get(
  '/api/admin/lojas',
  exigirBanco,
  exigirAdmin,
  rota(async (_req, res) => {
    const hoje = hojeBrt()
    const { rows } = await pool.query(
      `SELECT l.*,
              c.id AS contrato_id, c.vendedor, c.inicio AS contrato_inicio,
              c.fim AS contrato_fim, c.status AS contrato_status, c.valor AS contrato_valor,
              COALESCE(o.ativas, 0)   AS ofertas_ativas,
              COALESCE(o.pendentes, 0) AS ofertas_pendentes,
              COALESCE(r.no_mes, 0)   AS resgates_no_mes,
              COALESCE(u.n, 0)        AS logins
         FROM lc_lojas l
         LEFT JOIN LATERAL (
              SELECT * FROM lc_contratos c WHERE c.loja_id = l.id ORDER BY c.fim DESC LIMIT 1
         ) c ON TRUE
         LEFT JOIN LATERAL (
              SELECT COUNT(*) FILTER (WHERE status = 'aprovada' AND fim >= $1)::int AS ativas,
                     COUNT(*) FILTER (WHERE status = 'pendente')::int               AS pendentes
                FROM lc_ofertas WHERE loja_id = l.id
         ) o ON TRUE
         LEFT JOIN LATERAL (
              SELECT COUNT(*)::int AS no_mes FROM lc_resgates
               WHERE loja_id = l.id AND status = 'validado'
                 AND dia >= date_trunc('month', $1::date)
         ) r ON TRUE
         LEFT JOIN LATERAL (
              SELECT COUNT(*)::int AS n FROM lc_lojistas WHERE loja_id = l.id
         ) u ON TRUE
        ORDER BY l.nome`,
      [hoje],
    )
    res.json({
      hoje,
      lojas: rows.map((l) => ({
        ...l,
        dias_para_vencer: l.contrato_fim ? diferencaEmDias(hoje, l.contrato_fim) : null,
        no_ar: l.status === 'ativa' && l.contrato_status === 'ativo' && l.contrato_fim >= hoje,
      })),
      categorias: CATEGORIAS,
    })
  }),
)

/* Cadastro completo de loja: é o que o admin faz quando o vendedor manda o
   contrato fechado. Loja + contrato + acesso do lojista numa transação só —
   metade cadastrada seria pior que nada. */
app.post(
  '/api/admin/lojas',
  exigirBanco,
  exigirAdmin,
  rota(async (req, res) => {
    const nome = texto(req.body?.nome, 120)
    const categoria = texto(req.body?.categoria, 60)
    const endereco = texto(req.body?.endereco, 200)
    const emailLojista = texto(req.body?.email_lojista, 160)?.toLowerCase()
    const senhaLojista = String(req.body?.senha_lojista ?? '')
    const inicio = dataValida(req.body?.contrato_inicio) ?? hojeBrt()
    const fim = dataValida(req.body?.contrato_fim)

    if (!nome) return res.status(400).json({ erro: 'Informe o nome da loja.' })
    if (!categoria || !CATEGORIAS.includes(categoria)) {
      return res.status(400).json({ erro: 'Escolha uma categoria válida.' })
    }
    if (!endereco) return res.status(400).json({ erro: 'Informe o endereço da loja.' })
    if (!fim) return res.status(400).json({ erro: 'Informe a data de fim do contrato.' })
    if (fim < inicio) {
      return res.status(400).json({ erro: 'O fim do contrato não pode ser antes do início.' })
    }
    if (!emailLojista || !emailLojista.includes('@')) {
      return res.status(400).json({ erro: 'Informe um e-mail válido para o acesso do lojista.' })
    }
    if (senhaLojista.length < 6) {
      return res.status(400).json({ erro: 'A senha do lojista precisa ter pelo menos 6 caracteres.' })
    }

    const duplicado = await pool.query('SELECT 1 FROM lc_lojistas WHERE email = $1', [emailLojista])
    if (duplicado.rowCount) {
      return res.status(409).json({ erro: 'Já existe um acesso com esse e-mail.' })
    }

    const cliente = await pool.connect()
    try {
      await cliente.query('BEGIN')

      const loja = await cliente.query(
        `INSERT INTO lc_lojas (nome, categoria, descricao, endereco, referencia, lat, lng,
                               whatsapp, instagram, horario, cor)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11,'#5B21B6')) RETURNING id`,
        [
          nome,
          categoria,
          texto(req.body?.descricao, 400),
          endereco,
          texto(req.body?.referencia, 120),
          req.body?.lat != null ? Number(req.body.lat) : null,
          req.body?.lng != null ? Number(req.body.lng) : null,
          normalizarWhatsapp(req.body?.whatsapp),
          texto(req.body?.instagram, 80),
          texto(req.body?.horario, 120),
          texto(req.body?.cor, 9),
        ],
      )
      const lojaId = loja.rows[0].id

      await cliente.query(
        `INSERT INTO lc_contratos (loja_id, vendedor, valor, inicio, fim, observacao)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          lojaId,
          texto(req.body?.vendedor, 120),
          dinheiro(req.body?.contrato_valor) ?? 0,
          inicio,
          fim,
          texto(req.body?.observacao, 400),
        ],
      )

      await cliente.query(
        `INSERT INTO lc_lojistas (loja_id, nome, email, senha_hash, papel)
         VALUES ($1,$2,$3,$4,'dono')`,
        [lojaId, texto(req.body?.nome_lojista, 120) ?? nome, emailLojista, gerarHash(senhaLojista)],
      )

      await cliente.query('COMMIT')
      await auditar('admin', 'cadastrou-loja', `loja:${lojaId}`, { nome, vendedor: req.body?.vendedor })
      res.json({ ok: true, id: lojaId })
    } catch (e) {
      await cliente.query('ROLLBACK')
      throw e
    } finally {
      cliente.release()
    }
  }),
)

app.patch(
  '/api/admin/lojas/:id',
  exigirBanco,
  exigirAdmin,
  rota(async (req, res) => {
    const id = inteiro(req.params.id)
    const acao = texto(req.body?.acao, 20)
    if (!id) return res.status(400).json({ erro: 'Loja não encontrada.' })

    if (acao === 'pausar' || acao === 'reativar') {
      const status = acao === 'pausar' ? 'pausada' : 'ativa'
      await pool.query('UPDATE lc_lojas SET status = $2 WHERE id = $1', [id, status])
      await auditar('admin', `loja-${acao}`, `loja:${id}`)
      return res.json({ ok: true })
    }

    if (acao === 'renovar') {
      const fim = dataValida(req.body?.fim)
      if (!fim) return res.status(400).json({ erro: 'Informe a nova data de fim do contrato.' })
      const hoje = hojeBrt()
      await pool.query(
        `INSERT INTO lc_contratos (loja_id, vendedor, valor, inicio, fim, status)
         VALUES ($1,$2,$3,$4,$5,'ativo')`,
        [
          id,
          texto(req.body?.vendedor, 120),
          dinheiro(req.body?.valor) ?? 0,
          dataValida(req.body?.inicio) ?? hoje,
          fim,
        ],
      )
      await auditar('admin', 'renovou-contrato', `loja:${id}`, { fim })
      return res.json({ ok: true })
    }

    res.status(400).json({ erro: 'Ação inválida.' })
  }),
)

app.get(
  '/api/admin/ofertas',
  exigirBanco,
  exigirAdmin,
  rota(async (req, res) => {
    const status = texto(req.query.status, 20)
    const filtro = status ? 'WHERE o.status = $1' : ''
    const { rows } = await pool.query(
      `SELECT o.*, l.nome AS loja_nome, l.categoria,
              COALESCE(r.n, 0) AS resgates
         FROM lc_ofertas o
         JOIN lc_lojas l ON l.id = o.loja_id
         LEFT JOIN LATERAL (
              SELECT COUNT(*)::int AS n FROM lc_resgates
               WHERE oferta_id = o.id AND status = 'validado'
         ) r ON TRUE
         ${filtro}
        ORDER BY (o.status = 'pendente') DESC, o.criada_em DESC
        LIMIT 300`,
      status ? [status] : [],
    )
    res.json({
      ofertas: rows.map((o) => ({ ...o, aplicar: descreverDesconto(o) })),
      tipos: TIPOS_OFERTA,
      periodos: PERIODOS_LIMITE,
    })
  }),
)

app.post(
  '/api/admin/ofertas',
  exigirBanco,
  exigirAdmin,
  rota(async (req, res) => {
    const lojaId = inteiro(req.body?.loja_id)
    if (!lojaId) return res.status(400).json({ erro: 'Escolha a loja da oferta.' })

    const dados = lerOferta(req.body)
    if (dados.erro) return res.status(400).json({ erro: dados.erro })

    const { rows } = await pool.query(
      `INSERT INTO lc_ofertas
         (loja_id, titulo, descricao, tipo, valor_desconto, economia_estimada, regras,
          inicio, fim, dias_semana, hora_inicio, hora_fim, limite_total,
          limite_por_morador, periodo_limite, relampago, status, criada_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'aprovada','admin')
       RETURNING id`,
      [lojaId, ...dados.valores],
    )
    await auditar('admin', 'criou-oferta', `oferta:${rows[0].id}`)
    res.json({ ok: true, id: rows[0].id })
  }),
)

app.patch(
  '/api/admin/ofertas/:id',
  exigirBanco,
  exigirAdmin,
  rota(async (req, res) => {
    const id = inteiro(req.params.id)
    const acao = texto(req.body?.acao, 20)
    if (!id) return res.status(400).json({ erro: 'Oferta não encontrada.' })

    const mapa = {
      aprovar: 'aprovada',
      reprovar: 'reprovada',
      pausar: 'pausada',
      retomar: 'aprovada',
    }

    if (acao === 'destacar') {
      const { rows } = await pool.query(
        'UPDATE lc_ofertas SET destaque = NOT destaque WHERE id = $1 RETURNING destaque',
        [id],
      )
      if (!rows.length) return res.status(404).json({ erro: 'Oferta não encontrada.' })
      await auditar('admin', 'destacou-oferta', `oferta:${id}`, { destaque: rows[0].destaque })
      return res.json({ ok: true, destaque: rows[0].destaque })
    }

    if (!mapa[acao]) return res.status(400).json({ erro: 'Ação inválida.' })

    const { rowCount } = await pool.query('UPDATE lc_ofertas SET status = $2 WHERE id = $1', [
      id,
      mapa[acao],
    ])
    if (!rowCount) return res.status(404).json({ erro: 'Oferta não encontrada.' })

    await auditar('admin', `oferta-${acao}`, `oferta:${id}`)
    res.json({ ok: true })
  }),
)

app.get(
  '/api/admin/assinantes',
  exigirBanco,
  exigirAdmin,
  rota(async (_req, res) => {
    const hoje = hojeBrt()
    const { rows } = await pool.query(
      `SELECT m.id, m.nome, m.whatsapp, m.bairro, m.criado_em,
              a.status, a.valor, a.forma, a.parcelas, a.inicio, a.vence_em,
              COALESCE(r.usos, 0)     AS usos,
              COALESCE(r.economia, 0) AS economia
         FROM lc_moradores m
         LEFT JOIN LATERAL (
              SELECT * FROM lc_assinaturas s WHERE s.morador_id = m.id
               ORDER BY s.vence_em DESC LIMIT 1
         ) a ON TRUE
         LEFT JOIN LATERAL (
              SELECT COUNT(*)::int AS usos, COALESCE(SUM(economia), 0) AS economia
                FROM lc_resgates WHERE morador_id = m.id AND status = 'validado'
         ) r ON TRUE
        ORDER BY m.criado_em DESC LIMIT 500`,
      [],
    )
    res.json({
      hoje,
      assinantes: rows.map((a) => ({
        ...a,
        ativa: a.status === 'ativa' && a.vence_em >= hoje,
        dias_restantes: a.vence_em ? diferencaEmDias(hoje, a.vence_em) : null,
      })),
    })
  }),
)

/*
  Relatório da ACIL. É a peça institucional: não fala de churn nem de MRR, fala
  de quanta gente o app trouxe ao centro e quanto isso deixou no bolso do
  morador. `economia_apurada` separa o que veio de valor de compra digitado pelo
  balconista do que veio de estimativa — sem essa distinção o número não
  aguentaria a primeira pergunta de um associado.
*/
app.get(
  '/api/admin/relatorio-acil',
  exigirBanco,
  exigirAdmin,
  rota(async (req, res) => {
    const hoje = hojeBrt()
    const ate = dataValida(req.query.ate) ?? hoje
    const de = dataValida(req.query.de) ?? somarDias(ate, -89)

    const [geral, porLoja, porCategoria, porDiaSemana, porHora, porMes, bairros] =
      await Promise.all([
        pool.query(
          `SELECT COUNT(*)::int                       AS resgates,
                  COUNT(DISTINCT morador_id)::int     AS moradores,
                  COUNT(DISTINCT loja_id)::int        AS lojas,
                  COALESCE(SUM(economia), 0)          AS economia,
                  COALESCE(SUM(economia) FILTER (WHERE valor_compra IS NOT NULL), 0) AS economia_apurada,
                  COALESCE(SUM(valor_compra), 0)      AS movimentado
             FROM lc_resgates
            WHERE status = 'validado' AND dia BETWEEN $1 AND $2`,
          [de, ate],
        ),
        pool.query(
          `SELECT l.id, l.nome, l.categoria, COUNT(r.id)::int AS resgates,
                  COALESCE(SUM(r.economia), 0) AS economia
             FROM lc_lojas l
             LEFT JOIN lc_resgates r ON r.loja_id = l.id AND r.status = 'validado'
                                    AND r.dia BETWEEN $1 AND $2
            GROUP BY l.id, l.nome, l.categoria
            ORDER BY resgates DESC, l.nome`,
          [de, ate],
        ),
        pool.query(
          `SELECT l.categoria, COUNT(r.id)::int AS resgates,
                  COALESCE(SUM(r.economia), 0) AS economia
             FROM lc_resgates r JOIN lc_lojas l ON l.id = r.loja_id
            WHERE r.status = 'validado' AND r.dia BETWEEN $1 AND $2
            GROUP BY l.categoria ORDER BY resgates DESC`,
          [de, ate],
        ),
        pool.query(
          `SELECT EXTRACT(DOW FROM dia)::int AS dow, COUNT(*)::int AS n
             FROM lc_resgates
            WHERE status = 'validado' AND dia BETWEEN $1 AND $2
            GROUP BY 1 ORDER BY 1`,
          [de, ate],
        ),
        pool.query(
          `SELECT EXTRACT(HOUR FROM validado_em AT TIME ZONE 'America/Sao_Paulo')::int AS hora,
                  COUNT(*)::int AS n
             FROM lc_resgates
            WHERE status = 'validado' AND dia BETWEEN $1 AND $2
            GROUP BY 1 ORDER BY 1`,
          [de, ate],
        ),
        pool.query(
          `SELECT to_char(dia, 'YYYY-MM') AS mes, COUNT(*)::int AS resgates,
                  COALESCE(SUM(economia), 0) AS economia
             FROM lc_resgates
            WHERE status = 'validado' AND dia BETWEEN $1 AND $2
            GROUP BY 1 ORDER BY 1`,
          [de, ate],
        ),
        pool.query(
          `SELECT COALESCE(m.bairro, 'Não informado') AS bairro,
                  COUNT(DISTINCT m.id)::int AS moradores,
                  COUNT(r.id)::int AS resgates
             FROM lc_moradores m
             JOIN lc_resgates r ON r.morador_id = m.id AND r.status = 'validado'
                               AND r.dia BETWEEN $1 AND $2
            GROUP BY 1 ORDER BY resgates DESC LIMIT 15`,
          [de, ate],
        ),
      ])

    res.json({
      de,
      ate,
      geral: geral.rows[0],
      por_loja: porLoja.rows,
      por_categoria: porCategoria.rows,
      por_dia_semana: porDiaSemana.rows,
      por_hora: porHora.rows,
      por_mes: porMes.rows,
      bairros: bairros.rows,
    })
  }),
)

app.get(
  '/api/admin/config',
  exigirBanco,
  exigirAdmin,
  rota(async (_req, res) => res.json(await lerConfig())),
)

app.patch(
  '/api/admin/config',
  exigirBanco,
  exigirAdmin,
  rota(async (req, res) => {
    const permitidas = [
      'preco_anual',
      'preco_pix',
      'parcelas_max',
      'minutos_validade_codigo',
      'nome_app',
      'chamada',
    ]
    for (const [chave, valor] of Object.entries(req.body ?? {})) {
      if (!permitidas.includes(chave)) continue
      await gravarConfig(chave, valor)
    }
    await auditar('admin', 'mudou-config', null, req.body)
    res.json(await lerConfig())
  }),
)

/* ---------- leitura de oferta (lojista e admin usam a mesma) ---------- */

function lerOferta(body) {
  const titulo = texto(body?.titulo, 120)
  const tipo = texto(body?.tipo, 20)
  const inicio = dataValida(body?.inicio) ?? hojeBrt()
  const fim = dataValida(body?.fim)

  if (!titulo) return { erro: 'Escreva o título da oferta.' }
  if (!tipo || !TIPOS_OFERTA.includes(tipo)) return { erro: 'Escolha o tipo de desconto.' }
  if (!fim) return { erro: 'Informe até quando a oferta vale.' }
  if (fim < inicio) return { erro: 'O fim da oferta não pode ser antes do início.' }

  const valorDesconto = dinheiro(body?.valor_desconto) ?? 0
  if (tipo === 'percentual' && (valorDesconto <= 0 || valorDesconto > 100)) {
    return { erro: 'O desconto em porcentagem tem que ficar entre 1 e 100.' }
  }
  if (tipo === 'valor_fixo' && valorDesconto <= 0) {
    return { erro: 'Informe o valor do desconto em reais.' }
  }

  const dias = Array.isArray(body?.dias_semana)
    ? [...new Set(body.dias_semana.map(Number).filter((d) => d >= 0 && d <= 6))]
    : []

  const periodo = texto(body?.periodo_limite, 10)

  return {
    valores: [
      titulo,
      texto(body?.descricao, 400),
      tipo,
      valorDesconto,
      dinheiro(body?.economia_estimada) ?? 0,
      texto(body?.regras, 400),
      inicio,
      fim,
      dias,
      horaValida(body?.hora_inicio),
      horaValida(body?.hora_fim),
      body?.limite_total ? inteiro(body.limite_total, { min: 1, max: 100000 }) : null,
      inteiro(body?.limite_por_morador, { min: 1, max: 100 }) ?? 1,
      PERIODOS_LIMITE.includes(periodo) ? periodo : 'mes',
      Boolean(body?.relampago),
    ],
  }
}

/* ---------- SPA ---------- */

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ erro: 'Rota não encontrada.' })
  res.sendFile(join(dist, 'index.html'))
})

/* ---------- sobe ---------- */

const porta = Number(process.env.PORT) || 3000

initDb()
  .then(() => iniciarAgendador())
  .catch((e) => console.error('[db] falha ao preparar o schema:', e))

app.listen(porta, () => {
  console.log(`[londrina-centro] no ar em :${porta}${MODO_DEMO ? ' (pagamento em modo demo)' : ''}`)
})
