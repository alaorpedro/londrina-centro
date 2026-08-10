import { useEffect, useState } from 'react'
import { api } from './api'
import type { Config } from './tipos'
import { useCaminho } from './rotas'
import { Carregando } from './componentes/Ui'
import { AppMorador } from './morador/AppMorador'
import { AppLojista } from './lojista/AppLojista'
import { AppAdmin } from './admin/AppAdmin'

/*
  Três superfícies num mesmo deploy, separadas por prefixo de rota:

    /            app do morador (PWA)
    /lojista     painel da loja
    /admin       painel do administrador

  Cada uma tem seu cookie de sessão próprio (ver server/auth.js), então dá para
  estar logado nas três ao mesmo tempo — que é como a apresentação para a ACIL
  precisa acontecer: o celular gerando o cupom e o notebook validando, lado a
  lado, na mesma máquina do apresentador se for o caso.
*/

export function App() {
  const caminho = useCaminho()
  const [config, setConfig] = useState<Config | null>(null)
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    api
      .get<Config>('/api/config')
      .catch(() => null)
      .then((c) => {
        setConfig(c)
        setPronto(true)
      })
  }, [])

  useEffect(() => {
    if (config?.nome_app) document.title = tituloDaTela(caminho, config.nome_app)
  }, [caminho, config])

  if (!pronto) return <Carregando />

  if (caminho.startsWith('/admin')) return <AppAdmin config={config} />
  if (caminho.startsWith('/lojista')) return <AppLojista />
  return <AppMorador config={config} />
}

function tituloDaTela(caminho: string, nome: string) {
  if (caminho.startsWith('/admin')) return `Administração · ${nome}`
  if (caminho.startsWith('/lojista')) return `Painel da loja · ${nome}`
  return nome
}
