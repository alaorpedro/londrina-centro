import { useCallback, useEffect, useState } from 'react'
import { api, ErroApi } from '../api'
import type { Config } from '../tipos'
import { irPara, useCaminho } from '../rotas'
import { Aviso, Botao, Campo, Carregando } from '../componentes/Ui'
import { Grafico, Loja, Sair, Usuario, Etiqueta as IconeEtiqueta } from '../componentes/Icones'
import { LogoEscura } from '../componentes/Logo'
import { AdminPainel } from './Painel'
import { AdminLojas } from './Lojas'
import { AdminOfertas } from './Ofertas'
import { AdminAssinantes } from './Assinantes'
import { AdminRelatorio } from './RelatorioAcil'

const ABAS = [
  { rota: '/admin', rotulo: 'Visão geral', Icone: Grafico },
  { rota: '/admin/lojas', rotulo: 'Lojas', Icone: Loja },
  { rota: '/admin/ofertas', rotulo: 'Ofertas', Icone: IconeEtiqueta },
  { rota: '/admin/assinantes', rotulo: 'Moradores', Icone: Usuario },
  { rota: '/admin/relatorio', rotulo: 'Relatório ACIL', Icone: Grafico },
]

export function AppAdmin({ config }: { config: Config | null }) {
  const caminho = useCaminho()
  const [logado, setLogado] = useState<boolean | null>(null)

  const conferir = useCallback(async () => {
    try {
      const d = await api.get<{ logado: boolean }>('/api/admin/sessao')
      setLogado(d.logado)
    } catch {
      setLogado(false)
    }
  }, [])

  useEffect(() => {
    conferir()
  }, [conferir])

  if (logado === null) return <Carregando />
  if (!logado) return <EntrarAdmin aoEntrar={conferir} />

  let tela: React.ReactNode
  if (caminho === '/admin/lojas') tela = <AdminLojas />
  else if (caminho === '/admin/ofertas') tela = <AdminOfertas />
  else if (caminho === '/admin/assinantes') tela = <AdminAssinantes />
  else if (caminho === '/admin/relatorio') tela = <AdminRelatorio />
  else tela = <AdminPainel />

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="vidro sticky top-0 z-40 shadow-suave print:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <LogoEscura className="h-9 w-auto shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-extrabold tracking-tight text-slate-900">Administração</p>
            <p className="truncate text-xs text-slate-500">
              {config?.nome_app ?? 'Club43 de Vantagens'}
            </p>
          </div>
          {config?.demo && (
            <span className="hidden rounded-full bg-verde-100 px-2.5 py-1 text-xs font-bold text-verde-700 sm:inline">
              piloto · pagamento em modo demonstração
            </span>
          )}
          <button
            onClick={async () => {
              await api.post('/api/admin/sair').catch(() => {})
              await conferir()
              irPara('/admin')
            }}
            className="pressionavel flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
          >
            <Sair className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>

        <nav className="mx-auto max-w-6xl px-2 pb-2">
          <div className="rolagem-sem-barra flex gap-1 overflow-x-auto">
            {ABAS.map(({ rota, rotulo, Icone }) => {
              const ativa = caminho === rota || (rota === '/admin' && caminho === '/admin/')
              return (
                <button
                  key={rota}
                  onClick={() => irPara(rota)}
                  aria-current={ativa ? 'page' : undefined}
                  className={`pressionavel flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold whitespace-nowrap transition ${
                    ativa
                      ? 'bg-navy-700 text-white shadow-media'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
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

      <main className="mx-auto max-w-6xl px-4 py-5 print:max-w-none print:px-0">{tela}</main>
    </div>
  )
}

function EntrarAdmin({ aoEntrar }: { aoEntrar: () => Promise<void> }) {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await api.post('/api/admin/entrar', { senha })
      await aoEntrar()
    } catch (e2) {
      setErro(e2 instanceof ErroApi ? e2.message : 'Não consegui entrar.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-5">
      <div className="w-full max-w-sm">
        <div className="animate-surgir mb-6 text-center">
          <LogoEscura className="mx-auto mb-4 h-14 w-auto" />
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Administração</h1>
          <p className="mt-1 text-[15px] text-slate-600">Acesso restrito à equipe do clube.</p>
        </div>

        <form onSubmit={enviar} className="animate-surgir space-y-4 rounded-3xl bg-white p-6 shadow-alta">
          <Campo
            rotulo="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
          />
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <Botao type="submit" largo grande carregando={enviando}>
            Entrar
          </Botao>
        </form>
      </div>
    </div>
  )
}
