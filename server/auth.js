import crypto from 'node:crypto'
import * as cookie from 'cookie'
import { pool, auditar } from './db.js'

/*
  Três sessões independentes, uma por perfil, cada uma no seu cookie:

    lc_morador   → app do morador
    lc_lojista   → painel da loja
    lc_admin     → painel do administrador

  São cookies separados de propósito. Na apresentação para a ACIL a mesma pessoa
  precisa estar logada como morador no celular e como lojista no notebook, lado
  a lado, para demonstrar o resgate de ponta a ponta. Cookie único obrigaria a
  sair de um perfil para entrar no outro.

  A sessão é um token assinado com HMAC — nada em memória, senão o primeiro
  restart do container derrubaria todo mundo no meio da demonstração.
*/

const DURACAO_MS = 30 * 24 * 60 * 60 * 1000 // 30 dias

const SEGREDO =
  process.env.SESSION_SECRET ||
  (() => {
    console.warn('[auth] SESSION_SECRET ausente — sessões caem a cada restart.')
    return crypto.randomBytes(32).toString('hex')
  })()

const SENHA_ADMIN = process.env.ADMIN_SENHA || ''

const COOKIES = { morador: 'lc_morador', lojista: 'lc_lojista', admin: 'lc_admin' }

/* ---------- senha ---------- */

export function gerarHash(senha) {
  const sal = crypto.randomBytes(16).toString('hex')
  const derivada = crypto.scryptSync(String(senha), sal, 32).toString('hex')
  return `scrypt$${sal}$${derivada}`
}

export function conferirSenha(senha, hash) {
  if (!hash || typeof hash !== 'string') return false
  const [algo, sal, esperado] = hash.split('$')
  if (algo !== 'scrypt' || !sal || !esperado) return false
  const derivada = crypto.scryptSync(String(senha), sal, 32)
  const alvo = Buffer.from(esperado, 'hex')
  return derivada.length === alvo.length && crypto.timingSafeEqual(derivada, alvo)
}

/* ---------- token ---------- */

function assinar(payload) {
  return crypto.createHmac('sha256', SEGREDO).update(payload).digest('base64url')
}

function criarToken(tipo, id) {
  const payload = `${tipo}.${id}.${Date.now() + DURACAO_MS}`
  return `${payload}.${assinar(payload)}`
}

/** Devolve o id de quem está logado naquele perfil, ou null. */
function lerToken(token, tipoEsperado) {
  if (!token) return null
  const partes = String(token).split('.')
  if (partes.length !== 4) return null
  const [tipo, id, expira, assinatura] = partes
  if (tipo !== tipoEsperado) return null

  const esperada = Buffer.from(assinar(`${tipo}.${id}.${expira}`))
  const recebida = Buffer.from(assinatura)
  if (esperada.length !== recebida.length) return null
  if (!crypto.timingSafeEqual(esperada, recebida)) return null
  if (Number(expira) <= Date.now()) return null

  return Number(id)
}

function gravarCookie(res, tipo, id) {
  res.setHeader(
    'Set-Cookie',
    cookie.serialize(COOKIES[tipo], criarToken(tipo, id), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: DURACAO_MS / 1000,
    }),
  )
}

function limparCookie(res, tipo) {
  res.setHeader(
    'Set-Cookie',
    cookie.serialize(COOKIES[tipo], '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    }),
  )
}

export function quemEsta(req, tipo) {
  const cookies = cookie.parse(req.headers.cookie || '')
  return lerToken(cookies[COOKIES[tipo]], tipo)
}

/* ---------- freio de força bruta ----------
   Por IP e em memória. Não é fortaleza — é o suficiente para uma senha não cair
   em varredura automática. */

const tentativas = new Map()
const JANELA_MS = 15 * 60 * 1000
const LIMITE = 10

function podeTentar(chave) {
  const agora = Date.now()
  const reg = tentativas.get(chave)
  if (!reg || agora - reg.desde > JANELA_MS) {
    tentativas.set(chave, { desde: agora, n: 0 })
    return true
  }
  return reg.n < LIMITE
}

function registrarFalha(chave) {
  const reg = tentativas.get(chave) ?? { desde: Date.now(), n: 0 }
  reg.n += 1
  tentativas.set(chave, reg)
}

/* ---------- utilidades ---------- */

/** Guarda só os dígitos e valida um celular brasileiro com DDD. */
export function normalizarWhatsapp(v) {
  const digitos = String(v ?? '').replace(/\D/g, '')
  const sem55 = digitos.startsWith('55') && digitos.length > 11 ? digitos.slice(2) : digitos
  return /^\d{10,11}$/.test(sem55) ? sem55 : null
}

function emailValido(v) {
  const s = String(v ?? '').trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? s : null
}

/* ---------- middlewares ---------- */

export function exigirMorador(req, res, next) {
  const id = quemEsta(req, 'morador')
  if (!id) return res.status(401).json({ erro: 'Entre na sua conta para continuar.' })
  req.moradorId = id
  next()
}

export function exigirLojista(req, res, next) {
  const id = quemEsta(req, 'lojista')
  if (!id) return res.status(401).json({ erro: 'Sua sessão expirou. Entre de novo para continuar.' })
  req.lojistaId = id
  next()
}

export function exigirAdmin(req, res, next) {
  const id = quemEsta(req, 'admin')
  if (!id) return res.status(401).json({ erro: 'Sua sessão expirou. Entre de novo para continuar.' })
  next()
}

/* ---------- rotas ---------- */

export function rotasAuth(app, rota, exigirBanco) {
  /* --- morador --- */

  app.post(
    '/api/morador/cadastro',
    exigirBanco,
    rota(async (req, res) => {
      const nome = String(req.body?.nome ?? '').trim().slice(0, 120)
      const whatsapp = normalizarWhatsapp(req.body?.whatsapp)
      const email = req.body?.email ? emailValido(req.body.email) : null
      const senha = String(req.body?.senha ?? '')
      const bairro = String(req.body?.bairro ?? '').trim().slice(0, 80) || null

      if (nome.length < 2) return res.status(400).json({ erro: 'Escreva seu nome completo.' })
      if (!whatsapp)
        return res.status(400).json({ erro: 'Informe um WhatsApp válido, com DDD.' })
      if (req.body?.email && !email)
        return res.status(400).json({ erro: 'Esse e-mail não parece válido.' })
      if (senha.length < 6)
        return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' })

      const jaTem = await pool.query('SELECT id FROM lc_moradores WHERE whatsapp = $1', [whatsapp])
      if (jaTem.rowCount) {
        return res
          .status(409)
          .json({ erro: 'Esse WhatsApp já tem conta aqui. Tente entrar em vez de se cadastrar.' })
      }

      const { rows } = await pool.query(
        `INSERT INTO lc_moradores (nome, whatsapp, email, senha_hash, bairro)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [nome, whatsapp, email, gerarHash(senha), bairro],
      )

      gravarCookie(res, 'morador', rows[0].id)
      res.json({ ok: true })
    }),
  )

  app.post(
    '/api/morador/entrar',
    exigirBanco,
    rota(async (req, res) => {
      const ip = req.ip || 'sem-ip'
      if (!podeTentar(`m:${ip}`)) {
        return res
          .status(429)
          .json({ erro: 'Muitas tentativas seguidas. Espere 15 minutos e tente de novo.' })
      }

      const whatsapp = normalizarWhatsapp(req.body?.whatsapp)
      const senha = String(req.body?.senha ?? '')
      if (!whatsapp) return res.status(400).json({ erro: 'Informe um WhatsApp válido, com DDD.' })

      const { rows } = await pool.query(
        'SELECT id, senha_hash FROM lc_moradores WHERE whatsapp = $1',
        [whatsapp],
      )
      if (!rows.length || !conferirSenha(senha, rows[0].senha_hash)) {
        registrarFalha(`m:${ip}`)
        return res.status(401).json({ erro: 'WhatsApp ou senha incorretos.' })
      }

      tentativas.delete(`m:${ip}`)
      gravarCookie(res, 'morador', rows[0].id)
      res.json({ ok: true })
    }),
  )

  app.post('/api/morador/sair', (_req, res) => {
    limparCookie(res, 'morador')
    res.json({ ok: true })
  })

  /* --- lojista --- */

  app.post(
    '/api/lojista/entrar',
    exigirBanco,
    rota(async (req, res) => {
      const ip = req.ip || 'sem-ip'
      if (!podeTentar(`l:${ip}`)) {
        return res
          .status(429)
          .json({ erro: 'Muitas tentativas seguidas. Espere 15 minutos e tente de novo.' })
      }

      const email = emailValido(req.body?.email)
      const senha = String(req.body?.senha ?? '')
      if (!email) return res.status(400).json({ erro: 'Informe o e-mail cadastrado.' })

      const { rows } = await pool.query(
        'SELECT id, senha_hash, loja_id FROM lc_lojistas WHERE email = $1',
        [email],
      )
      if (!rows.length || !conferirSenha(senha, rows[0].senha_hash)) {
        registrarFalha(`l:${ip}`)
        return res.status(401).json({ erro: 'E-mail ou senha incorretos.' })
      }

      tentativas.delete(`l:${ip}`)
      gravarCookie(res, 'lojista', rows[0].id)
      await auditar(`lojista:${rows[0].id}`, 'entrou', `loja:${rows[0].loja_id}`)
      res.json({ ok: true })
    }),
  )

  app.post('/api/lojista/sair', (_req, res) => {
    limparCookie(res, 'lojista')
    res.json({ ok: true })
  })

  /* --- admin --- */

  app.post('/api/admin/entrar', (req, res) => {
    const ip = req.ip || 'sem-ip'

    if (!SENHA_ADMIN) {
      return res
        .status(503)
        .json({ erro: 'O painel ainda não tem senha configurada. Avise o suporte da ONMID.' })
    }
    if (!podeTentar(`a:${ip}`)) {
      return res
        .status(429)
        .json({ erro: 'Muitas tentativas seguidas. Espere 15 minutos e tente de novo.' })
    }

    const enviada = Buffer.from(String(req.body?.senha ?? ''))
    const guardada = Buffer.from(SENHA_ADMIN)
    const confere =
      enviada.length === guardada.length && crypto.timingSafeEqual(enviada, guardada)

    if (!confere) {
      registrarFalha(`a:${ip}`)
      return res.status(401).json({ erro: 'Senha incorreta.' })
    }

    tentativas.delete(`a:${ip}`)
    gravarCookie(res, 'admin', 1)
    res.json({ ok: true })
  })

  app.post('/api/admin/sair', (_req, res) => {
    limparCookie(res, 'admin')
    res.json({ ok: true })
  })

  app.get('/api/admin/tem-senha', (_req, res) => res.json({ configurado: Boolean(SENHA_ADMIN) }))
}
