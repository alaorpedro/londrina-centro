import pg from 'pg'
import { hojeBrt } from './datas.js'

/*
  Postgres dedicado no Coolify (padrão Base ON). A connection string vem de
  DATABASE_URL. Sem ela o servidor sobe assim mesmo, em modo degradado: a API
  responde 503 com mensagem legível em vez de estourar stack trace na tela.
*/

/*
  Dois parsers antes de qualquer query:
  - DATE (1082) o driver converteria para Date no fuso da máquina, e um
    '2026-08-09' viraria 08/08 à noite num container em UTC. Aqui DATE é dia de
    calendário, não instante: fica string 'AAAA-MM-DD' do começo ao fim.
  - NUMERIC (1700) vem como string por padrão. São valores de desconto em reais,
    cabem em float sem drama, e o front espera número.
*/
pg.types.setTypeParser(1082, (v) => v)
pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)))

const { Pool } = pg

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 })
  : null

/* ---------- categorias e tipos de oferta ---------- */

export const CATEGORIAS = [
  'Alimentação',
  'Moda e calçados',
  'Beleza e estética',
  'Saúde',
  'Serviços',
  'Casa e decoração',
  'Eletrônicos',
  'Lazer',
  'Pet',
  'Óticas e joalherias',
]

/*
  `tipo` é só a mecânica do desconto. "Oportunidade relâmpago" não é mecânica —
  é uma percentual (ou qualquer outra) com janela curta e destaque próprio na
  home, então virou a flag `relampago` na oferta. Misturar as duas coisas na
  mesma coluna obrigaria a duplicar o cálculo de economia para cada combinação.
*/
export const TIPOS_OFERTA = ['percentual', 'valor_fixo', 'leve_pague', 'brinde']

export const PERIODOS_LIMITE = ['total', 'mes', 'semana', 'dia']

/* ---------- schema ---------- */

export async function initDb() {
  if (!pool) {
    console.warn('[db] DATABASE_URL ausente — API vai responder 503 nas rotas de dados.')
    return
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lc_config (
      chave TEXT PRIMARY KEY,
      valor JSONB NOT NULL
    )
  `)

  /* ---------- morador ---------- */

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lc_moradores (
      id          SERIAL PRIMARY KEY,
      nome        TEXT NOT NULL,
      whatsapp    TEXT NOT NULL UNIQUE,
      email       TEXT,
      senha_hash  TEXT NOT NULL,
      bairro      TEXT,
      demo        BOOLEAN NOT NULL DEFAULT FALSE,
      criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  /*
    Assinatura é pagamento único com vigência de 12 meses — não é recorrência.
    O Mercado Pago não combina Preapproval com parcelamento, e o parcelamento em
    3x é requisito comercial. Quem manda no acesso é `vence_em`.
  */
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lc_assinaturas (
      id          SERIAL PRIMARY KEY,
      morador_id  INTEGER NOT NULL REFERENCES lc_moradores(id) ON DELETE CASCADE,
      status      TEXT NOT NULL DEFAULT 'ativa',
      valor       NUMERIC(10,2) NOT NULL,
      forma       TEXT NOT NULL,
      parcelas    INTEGER NOT NULL DEFAULT 1,
      inicio      DATE NOT NULL,
      vence_em    DATE NOT NULL,
      criada_em   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lc_pagamentos (
      id             SERIAL PRIMARY KEY,
      assinatura_id  INTEGER NOT NULL REFERENCES lc_assinaturas(id) ON DELETE CASCADE,
      referencia     TEXT,
      valor          NUMERIC(10,2) NOT NULL,
      parcela        INTEGER NOT NULL DEFAULT 1,
      de_parcelas    INTEGER NOT NULL DEFAULT 1,
      status         TEXT NOT NULL DEFAULT 'pago',
      pago_em        TIMESTAMPTZ
    )
  `)

  /* ---------- loja ---------- */

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lc_lojas (
      id          SERIAL PRIMARY KEY,
      nome        TEXT NOT NULL,
      categoria   TEXT NOT NULL,
      descricao   TEXT,
      endereco    TEXT NOT NULL,
      referencia  TEXT,
      lat         NUMERIC(10,7),
      lng         NUMERIC(10,7),
      whatsapp    TEXT,
      instagram   TEXT,
      horario     TEXT,
      cor         TEXT NOT NULL DEFAULT '#5B21B6',
      status      TEXT NOT NULL DEFAULT 'ativa',
      demo        BOOLEAN NOT NULL DEFAULT FALSE,
      criada_em   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lc_contratos (
      id         SERIAL PRIMARY KEY,
      loja_id    INTEGER NOT NULL REFERENCES lc_lojas(id) ON DELETE CASCADE,
      vendedor   TEXT,
      valor      NUMERIC(10,2) NOT NULL DEFAULT 0,
      inicio     DATE NOT NULL,
      fim        DATE NOT NULL,
      status     TEXT NOT NULL DEFAULT 'ativo',
      observacao TEXT,
      criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lc_lojistas (
      id          SERIAL PRIMARY KEY,
      loja_id     INTEGER NOT NULL REFERENCES lc_lojas(id) ON DELETE CASCADE,
      nome        TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      senha_hash  TEXT NOT NULL,
      papel       TEXT NOT NULL DEFAULT 'dono',
      criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  /* ---------- oferta ---------- */

  /*
    `dias_semana` é array de 0-6 (0 = domingo). Vazio significa "todo dia" —
    é o padrão, e evita ter que marcar sete caixinhas no cadastro.
    `economia_estimada` é a base do "quanto você economizou" quando o balconista
    não digita o valor da compra.
  */
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lc_ofertas (
      id                 SERIAL PRIMARY KEY,
      loja_id            INTEGER NOT NULL REFERENCES lc_lojas(id) ON DELETE CASCADE,
      titulo             TEXT NOT NULL,
      descricao          TEXT,
      tipo               TEXT NOT NULL,
      valor_desconto     NUMERIC(10,2) NOT NULL DEFAULT 0,
      economia_estimada  NUMERIC(10,2) NOT NULL DEFAULT 0,
      regras             TEXT,
      inicio             DATE NOT NULL,
      fim                DATE NOT NULL,
      dias_semana        INTEGER[] NOT NULL DEFAULT '{}',
      hora_inicio        TEXT,
      hora_fim           TEXT,
      limite_total       INTEGER,
      limite_por_morador INTEGER NOT NULL DEFAULT 1,
      periodo_limite     TEXT NOT NULL DEFAULT 'mes',
      relampago          BOOLEAN NOT NULL DEFAULT FALSE,
      destaque           BOOLEAN NOT NULL DEFAULT FALSE,
      status             TEXT NOT NULL DEFAULT 'pendente',
      criada_por         TEXT NOT NULL DEFAULT 'admin',
      criada_em          TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  /* ---------- resgate ---------- */

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lc_resgates (
      id            BIGSERIAL PRIMARY KEY,
      oferta_id     INTEGER NOT NULL REFERENCES lc_ofertas(id) ON DELETE CASCADE,
      loja_id       INTEGER NOT NULL REFERENCES lc_lojas(id) ON DELETE CASCADE,
      morador_id    INTEGER NOT NULL REFERENCES lc_moradores(id) ON DELETE CASCADE,
      codigo        TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'pendente',
      gerado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
      expira_em     TIMESTAMPTZ NOT NULL,
      validado_em   TIMESTAMPTZ,
      validado_por  INTEGER REFERENCES lc_lojistas(id) ON DELETE SET NULL,
      valor_compra  NUMERIC(10,2),
      economia      NUMERIC(10,2) NOT NULL DEFAULT 0,
      dia           DATE NOT NULL
    )
  `)

  /*
    O código só precisa ser único entre os que ainda podem ser validados. Índice
    parcial: 6 dígitos dariam colisão rápido se a unicidade fosse sobre a tabela
    inteira, e um código já usado pode ser reciclado sem risco.
  */
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS lc_resgates_codigo_pendente
      ON lc_resgates (codigo) WHERE status = 'pendente'
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS lc_resgates_loja_dia ON lc_resgates (loja_id, dia)`)
  await pool.query(
    `CREATE INDEX IF NOT EXISTS lc_resgates_morador ON lc_resgates (morador_id, oferta_id, status)`,
  )
  await pool.query(`CREATE INDEX IF NOT EXISTS lc_ofertas_loja ON lc_ofertas (loja_id, status)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS lc_contratos_loja ON lc_contratos (loja_id, status)`)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lc_favoritos (
      morador_id INTEGER NOT NULL REFERENCES lc_moradores(id) ON DELETE CASCADE,
      loja_id    INTEGER NOT NULL REFERENCES lc_lojas(id) ON DELETE CASCADE,
      criado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (morador_id, loja_id)
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lc_auditoria (
      id        BIGSERIAL PRIMARY KEY,
      ator      TEXT NOT NULL,
      acao      TEXT NOT NULL,
      alvo      TEXT,
      detalhe   JSONB,
      em        TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  /* A tabela nasceu sem `demo` e já existe em produção — CREATE TABLE IF NOT
     EXISTS não acrescenta coluna em tabela existente, então o ALTER abaixo é o
     que leva o marcador para lá. Idempotente. */
  await pool.query(
    `ALTER TABLE lc_moradores ADD COLUMN IF NOT EXISTS demo BOOLEAN NOT NULL DEFAULT FALSE`,
  )

  await semearConfig()
  console.log('[db] schema pronto')
}

/* ---------- configuração ---------- */

const CONFIG_PADRAO = {
  preco_anual: 99.9,
  preco_pix: 89.9,
  parcelas_max: 3,
  meses_vigencia: 12,
  minutos_validade_codigo: 5,
  dias_carencia: 5,
  // enquanto a marca não fecha, é isto que aparece no app
  nome_app: 'Club43 de Vantagens',
  chamada: 'Mais para você, mais para Londrina.',
}

async function semearConfig() {
  for (const [chave, valor] of Object.entries(CONFIG_PADRAO)) {
    await pool.query(
      `INSERT INTO lc_config (chave, valor) VALUES ($1, $2::jsonb)
       ON CONFLICT (chave) DO NOTHING`,
      [chave, JSON.stringify(valor)],
    )
  }
}

export async function lerConfig() {
  if (!pool) return { ...CONFIG_PADRAO }
  const { rows } = await pool.query('SELECT chave, valor FROM lc_config')
  const config = { ...CONFIG_PADRAO }
  for (const r of rows) config[r.chave] = r.valor
  return config
}

export async function gravarConfig(chave, valor) {
  await pool.query(
    `INSERT INTO lc_config (chave, valor) VALUES ($1, $2::jsonb)
     ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor`,
    [chave, JSON.stringify(valor)],
  )
}

export async function auditar(ator, acao, alvo, detalhe) {
  if (!pool) return
  try {
    await pool.query(
      'INSERT INTO lc_auditoria (ator, acao, alvo, detalhe) VALUES ($1, $2, $3, $4::jsonb)',
      [ator, acao, alvo ?? null, JSON.stringify(detalhe ?? {})],
    )
  } catch (e) {
    // auditoria nunca pode derrubar a operação principal
    console.error('[auditoria]', e.message)
  }
}

/* ---------- rotinas de vigência ----------
   R9 do escopo: contrato vencido tira a loja do app sem ninguém mexer. Roda no
   boot e de hora em hora. As consultas do app também filtram por contrato ativo
   — cinto e suspensório, porque um container parado a noite toda não rodaria o
   job e a loja amanheceria no ar sem contrato. */

export async function rodarVigencias() {
  if (!pool) return
  const hoje = hojeBrt()

  const contratos = await pool.query(
    `UPDATE lc_contratos SET status = 'vencido'
      WHERE status = 'ativo' AND fim < $1 RETURNING id`,
    [hoje],
  )

  const ofertas = await pool.query(
    `UPDATE lc_ofertas SET status = 'expirada'
      WHERE status = 'aprovada' AND fim < $1 RETURNING id`,
    [hoje],
  )

  const assinaturas = await pool.query(
    `UPDATE lc_assinaturas SET status = 'vencida'
      WHERE status = 'ativa' AND vence_em < $1 RETURNING id`,
    [hoje],
  )

  // código não validado a tempo devolve o direito de resgate ao morador (R8)
  const codigos = await pool.query(
    `UPDATE lc_resgates SET status = 'expirado'
      WHERE status = 'pendente' AND expira_em < now() RETURNING id`,
  )

  const total =
    contratos.rowCount + ofertas.rowCount + assinaturas.rowCount + codigos.rowCount
  if (total > 0) {
    console.log(
      `[vigencias] contratos:${contratos.rowCount} ofertas:${ofertas.rowCount} ` +
        `assinaturas:${assinaturas.rowCount} codigos:${codigos.rowCount}`,
    )
  }
}

export function iniciarAgendador() {
  if (!pool) return
  rodarVigencias().catch((e) => console.error('[vigencias]', e))
  // de hora em hora para contrato/oferta/assinatura
  setInterval(() => rodarVigencias().catch((e) => console.error('[vigencias]', e)), 60 * 60 * 1000)
  // de minuto em minuto só para expirar código pendente
  setInterval(() => {
    pool
      .query(`UPDATE lc_resgates SET status='expirado' WHERE status='pendente' AND expira_em < now()`)
      .catch((e) => console.error('[expirar-codigo]', e))
  }, 60 * 1000)
}
