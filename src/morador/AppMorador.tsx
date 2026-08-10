import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { Config, SessaoMorador } from '../tipos'
import { casar, irPara, useCaminho } from '../rotas'
import { Carregando } from '../componentes/Ui'
import { Dock, type ItemDock } from '../componentes/Dock'
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
    <div className={`mx-auto min-h-screen max-w-lg bg-white ${comAbas ? 'pb-28' : ''}`}>
      {tela}
      {comAbas && (
        <Dock
          itens={ABAS}
          ativo={caminho}
          aoTrocar={(rota) => {
            if (rota !== window.location.pathname) irPara(rota)
          }}
        />
      )}
    </div>
  )
}

/* O `id` da aba É a rota: assim o dock não precisa de tabela de tradução, e a
   aba ativa sai direto do caminho atual. */
const ABAS: ItemDock[] = [
  { id: '/', rotulo: 'Ofertas', Icone: Casa },
  { id: '/mapa', rotulo: 'Mapa', Icone: IconeMapa },
  { id: '/conta', rotulo: 'Minha conta', Icone: Usuario },
]
