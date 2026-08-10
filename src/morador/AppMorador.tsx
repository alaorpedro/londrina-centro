import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { Config, SessaoMorador } from '../tipos'
import { casar, irPara, useCaminho } from '../rotas'
import { Carregando } from '../componentes/Ui'
import { Casa, Mapa as IconeMapa, Usuario } from '../componentes/Icones'
import { Home } from './Home'
import { Oferta } from './Oferta'
import { Cupom } from './Cupom'
import { Loja } from './Loja'
import { Mapa } from './Mapa'
import { Conta } from './Conta'
import { Assinar } from './Assinar'
import { Entrar } from './Entrar'

export function AppMorador({ config }: { config: Config | null }) {
  const caminho = useCaminho()
  const [sessao, setSessao] = useState<SessaoMorador | null>(null)

  const recarregarSessao = useCallback(async () => {
    try {
      setSessao(await api.get<SessaoMorador>('/api/morador/sessao'))
    } catch {
      // sessão é informação, não bloqueio: sem ela o app segue como visitante,
      // que é exatamente o estado de quem ainda não assinou (R1)
      setSessao({ logado: false })
    }
  }, [])

  useEffect(() => {
    recarregarSessao()
  }, [recarregarSessao])

  const sair = useCallback(async () => {
    await api.post('/api/morador/sair').catch(() => {})
    await recarregarSessao()
  }, [recarregarSessao])

  if (!sessao) return <Carregando />

  const oferta = casar(caminho, '/oferta/:id')
  const cupom = casar(caminho, '/cupom/:id')
  const loja = casar(caminho, '/loja/:id')

  /* A tela do cupom ocupa a tela inteira: no balcão, a barra de navegação só
     atrapalha e aumenta a chance de um toque errado apagar o código. */
  if (cupom) return <Cupom id={cupom.id} />

  if (caminho === '/entrar') return <Entrar aoEntrar={recarregarSessao} />

  let tela: React.ReactNode
  if (oferta) tela = <Oferta id={oferta.id} sessao={sessao} />
  else if (loja) tela = <Loja id={loja.id} sessao={sessao} />
  else if (caminho === '/mapa') tela = <Mapa />
  else if (caminho === '/conta') tela = <Conta sessao={sessao} aoSair={sair} />
  else if (caminho === '/assinar') tela = <Assinar config={config} aoAssinar={recarregarSessao} />
  else tela = <Home sessao={sessao} config={config} />

  const comAbas = ['/', '/mapa', '/conta'].includes(caminho)

  return (
    <div className={`mx-auto min-h-screen max-w-lg bg-white ${comAbas ? 'pb-20' : ''}`}>
      {tela}
      {comAbas && <Abas caminho={caminho} />}
    </div>
  )
}

function Abas({ caminho }: { caminho: string }) {
  const abas = [
    { rota: '/', rotulo: 'Ofertas', Icone: Casa },
    { rota: '/mapa', rotulo: 'Mapa', Icone: IconeMapa },
    { rota: '/conta', rotulo: 'Minha conta', Icone: Usuario },
  ]

  return (
    <nav className="area-segura-baixo fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex">
        {abas.map(({ rota, rotulo, Icone }) => {
          const ativa = caminho === rota
          return (
            <button
              key={rota}
              onClick={() => irPara(rota)}
              aria-current={ativa ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 pt-2.5 pb-1.5 text-[11px] font-semibold transition-colors ${
                ativa ? 'text-roxo-700' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icone className="h-6 w-6" />
              {rotulo}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
