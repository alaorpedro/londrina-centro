import { useEffect, useState, useCallback } from 'react'

/*
  Roteador mínimo sobre a History API.

  Por que não react-router: o app tem três superfícies com poucas telas cada e
  nenhuma rota aninhada. A biblioteca inteira entraria para resolver o que cabe
  em quarenta linhas — e num PWA que o morador instala no celular, cada kilobyte
  do primeiro carregamento é conversão.
*/

type Ouvinte = () => void
const ouvintes = new Set<Ouvinte>()

function avisar() {
  for (const o of ouvintes) o()
}

export function irPara(caminho: string, { substituir = false } = {}) {
  if (caminho === window.location.pathname + window.location.search) return
  if (substituir) window.history.replaceState({}, '', caminho)
  else window.history.pushState({}, '', caminho)
  window.scrollTo(0, 0)
  avisar()
}

export function voltar() {
  window.history.back()
}

export function useCaminho(): string {
  const [caminho, setCaminho] = useState(() => window.location.pathname)

  useEffect(() => {
    const atualizar = () => setCaminho(window.location.pathname)
    ouvintes.add(atualizar)
    window.addEventListener('popstate', atualizar)
    return () => {
      ouvintes.delete(atualizar)
      window.removeEventListener('popstate', atualizar)
    }
  }, [])

  return caminho
}

/**
 * Casa o caminho contra um molde com `:param`.
 * casar('/loja/12', '/loja/:id') → { id: '12' }
 */
export function casar(caminho: string, molde: string): Record<string, string> | null {
  const partesCaminho = caminho.replace(/\/+$/, '').split('/').filter(Boolean)
  const partesMolde = molde.replace(/\/+$/, '').split('/').filter(Boolean)
  if (partesCaminho.length !== partesMolde.length) return null

  const params: Record<string, string> = {}
  for (let i = 0; i < partesMolde.length; i++) {
    const m = partesMolde[i]
    if (m.startsWith(':')) params[m.slice(1)] = decodeURIComponent(partesCaminho[i])
    else if (m !== partesCaminho[i]) return null
  }
  return params
}

/** Link que não recarrega a página. Usado em toda navegação interna. */
export function useIr() {
  return useCallback((caminho: string) => irPara(caminho), [])
}
