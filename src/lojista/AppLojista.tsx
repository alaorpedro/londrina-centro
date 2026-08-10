import { useCallback, useEffect, useState } from 'react'
import { api, ErroApi } from '../api'
import type { SessaoLojista } from '../tipos'
import { irPara, useCaminho } from '../rotas'
import { Aviso, Botao, Campo, Carregando } from '../componentes/Ui'
import { Cupom, Grafico, Etiqueta as IconeEtiqueta, Relogio, Sair } from '../componentes/Icones'
import { Validar } from './Validar'
import { Painel } from './Painel'
import { Ofertas } from './Ofertas'
import { Historico } from './Historico'

/*
  Painel da loja.

  A aba de validação é a primeira e a que abre por padrão: quem usa este painel
  no dia a dia é o balconista, e para ele o painel É a tela de validar. Os
  relatórios são para o dono, que entra bem menos vezes.
*/

const ABAS = [
  { rota: '/lojista', rotulo: 'Validar', Icone: Cupom },
  { rota: '/lojista/painel', rotulo: 'Resultados', Icone: Grafico },
  { rota: '/lojista/ofertas', rotulo: 'Minhas ofertas', Icone: IconeEtiqueta },
  { rota: '/lojista/historico', rotulo: 'Atendimentos', Icone: Relogio },
]

export function AppLojista() {
  const caminho = useCaminho()
  const [sessao, setSessao] = useState<SessaoLojista | null>(null)
  const [recarga, setRecarga] = useState(0)

  const recarregar = useCallback(() => setRecarga((n) => n + 1), [])

  const buscarSessao = useCallback(async () => {
    try {
      setSessao(await api.get<SessaoLojista>('/api/lojista/sessao'))
    } catch {
      setSessao({ logado: false })
    }
  }, [])

  useEffect(() => {
    buscarSessao()
  }, [buscarSessao])

  if (!sessao) return <Carregando />
  if (!sessao.logado || !sessao.lojista) return <EntrarLojista aoEntrar={buscarSessao} />

  const loja = sessao.lojista

  let tela: React.ReactNode
  if (caminho === '/lojista/painel') tela = <Painel recarga={recarga} />
  else if (caminho === '/lojista/ofertas')
    tela = <Ofertas recarga={recarga} aoMudar={recarregar} />
  else if (caminho === '/lojista/historico') tela = <Historico recarga={recarga} />
  else tela = <Validar aoValidar={recarregar} />

  const naValidacao = caminho === '/lojista' || caminho === '/lojista/'

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
            style={{ backgroundColor: loja.cor }}
          >
            {loja.loja_nome.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-slate-900">{loja.loja_nome}</p>
            <p className="truncate text-xs text-slate-500">
              {loja.categoria} · {loja.nome}
            </p>
          </div>
          <button
            onClick={async () => {
              await api.post('/api/lojista/sair').catch(() => {})
              await buscarSessao()
              irPara('/lojista')
            }}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-slate-500 hover:bg-slate-100"
          >
            <Sair className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>

        <nav className="mx-auto max-w-5xl px-2">
          <div className="rolagem-sem-barra flex gap-1 overflow-x-auto">
            {ABAS.map(({ rota, rotulo, Icone }) => {
              const ativa =
                rota === '/lojista' ? naValidacao : caminho === rota
              return (
                <button
                  key={rota}
                  onClick={() => irPara(rota)}
                  aria-current={ativa ? 'page' : undefined}
                  className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition ${
                    ativa
                      ? 'border-roxo-700 text-roxo-800'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icone className="h-4 w-4" />
                  {rotulo}
                </button>
              )
            })}
          </div>
        </nav>
      </header>

      <main className={naValidacao ? '' : 'mx-auto max-w-5xl px-4 py-5'}>{tela}</main>
    </div>
  )
}

function EntrarLojista({ aoEntrar }: { aoEntrar: () => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await api.post('/api/lojista/entrar', { email, senha })
      await aoEntrar()
    } catch (e2) {
      setErro(e2 instanceof ErroApi ? e2.message : 'Não consegui entrar. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-5">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-roxo-700 text-white">
            <Cupom />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Painel da loja</h1>
          <p className="mt-1 text-[15px] text-slate-600">
            Valide cupons e acompanhe quantos clientes o clube trouxe.
          </p>
        </div>

        <form onSubmit={enviar} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
          <Campo
            rotulo="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            placeholder="o e-mail cadastrado no contrato"
            required
          />
          <Campo
            rotulo="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
            required
          />
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <Botao type="submit" largo grande carregando={enviando}>
            Entrar
          </Botao>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Perdeu o acesso? Fale com o consultor que fechou seu contrato.
        </p>
      </div>
    </div>
  )
}
