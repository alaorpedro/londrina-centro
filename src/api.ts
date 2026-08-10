/*
  Cliente HTTP do app.

  Regra da casa (vale para as três superfícies): o usuário nunca vê erro
  técnico. Qualquer falha — rede caída, 500, JSON quebrado — sai daqui como
  `ErroApi` com uma frase em português que a tela pode mostrar direto.
*/

export class ErroApi extends Error {
  status: number
  extra: Record<string, unknown>

  constructor(mensagem: string, status = 0, extra: Record<string, unknown> = {}) {
    super(mensagem)
    this.name = 'ErroApi'
    this.status = status
    this.extra = extra
  }

  /** true quando a barreira é a assinatura — a tela abre o paywall. */
  get precisaAssinar(): boolean {
    return this.status === 402 || this.extra.precisaAssinar === true
  }

  /** true quando a sessão caiu — a tela volta para o login. */
  get precisaEntrar(): boolean {
    return this.status === 401
  }
}

type Opcoes = {
  metodo?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  corpo?: unknown
  sinal?: AbortSignal
}

async function chamar<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const { metodo = 'GET', corpo, sinal } = opcoes

  let resposta: Response
  try {
    resposta = await fetch(caminho, {
      method: metodo,
      headers: corpo ? { 'content-type': 'application/json' } : undefined,
      body: corpo ? JSON.stringify(corpo) : undefined,
      credentials: 'same-origin',
      signal: sinal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new ErroApi('Não consegui falar com o servidor. Verifique sua internet.', 0)
  }

  let dados: unknown = null
  const texto = await resposta.text()
  if (texto) {
    try {
      dados = JSON.parse(texto)
    } catch {
      // resposta que não é JSON só acontece quando algo muito errado aconteceu
      // no caminho (proxy, gateway). Não vale expor o HTML de erro na tela.
      throw new ErroApi('Recebi uma resposta inesperada do servidor. Tente de novo.', resposta.status)
    }
  }

  if (!resposta.ok) {
    const corpoErro = (dados ?? {}) as Record<string, unknown>
    const mensagem =
      typeof corpoErro.erro === 'string' ? corpoErro.erro : mensagemPadrao(resposta.status)
    throw new ErroApi(mensagem, resposta.status, corpoErro)
  }

  return dados as T
}

function mensagemPadrao(status: number): string {
  if (status === 401) return 'Sua sessão expirou. Entre de novo para continuar.'
  if (status === 403) return 'Você não tem acesso a essa parte do sistema.'
  if (status === 404) return 'Não encontrei o que você procurava.'
  if (status === 429) return 'Muitas tentativas seguidas. Espere alguns minutos.'
  if (status >= 500) return 'Algo deu errado do nosso lado. Tente de novo em instantes.'
  return 'Não consegui completar essa ação. Tente de novo.'
}

export const api = {
  get: <T>(caminho: string, sinal?: AbortSignal) => chamar<T>(caminho, { sinal }),
  post: <T>(caminho: string, corpo?: unknown) => chamar<T>(caminho, { metodo: 'POST', corpo }),
  patch: <T>(caminho: string, corpo?: unknown) => chamar<T>(caminho, { metodo: 'PATCH', corpo }),
}

/** Monta querystring ignorando vazios. */
export function query(params: Record<string, string | number | null | undefined>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== '') p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}
