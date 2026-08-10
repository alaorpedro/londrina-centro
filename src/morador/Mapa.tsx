import { useEffect, useMemo, useState } from 'react'
import { api, ErroApi } from '../api'
import type { Loja } from '../tipos'
import { Aviso, BarraTopo, Carregando, Etiqueta } from '../componentes/Ui'
import { Local, SetaDireita } from '../componentes/Icones'
import { irPara } from '../rotas'

/*
  Mapa esquemático das lojas do clube.

  Não usa tiles do OpenStreetMap/Google de propósito no piloto: seriam
  requisições a terceiros dentro de um PWA que precisa abrir rápido no 4G do
  calçadão, e a chave/atribuição são decisão de produção, não de demonstração.
  O que esta tela precisa provar para a ACIL é a concentração — "as lojas estão
  todas nestas poucas quadras" — e para isso a projeção das coordenadas reais
  sobre um plano já basta.

  Mapa com tiles de verdade e rota a pé é Fase 1.
*/

export function Mapa() {
  const [lojas, setLojas] = useState<Loja[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [ativa, setAtiva] = useState<number | null>(null)

  useEffect(() => {
    api
      .get<{ lojas: Loja[] }>('/api/morador/lojas')
      .then((d) => setLojas(d.lojas))
      .catch((e) => setErro(e instanceof ErroApi ? e.message : 'Não consegui carregar o mapa.'))
      .finally(() => setCarregando(false))
  }, [])

  /* Projeta lat/lng no quadro, com uma margem para o pin não colar na borda.
     Latitude cresce para o norte e o eixo Y da tela cresce para baixo — por
     isso o Y é invertido. Sem isso o mapa sai de cabeça para baixo. */
  const pinos = useMemo(() => {
    const comCoordenada = lojas.filter((l) => l.lat != null && l.lng != null)
    if (comCoordenada.length === 0) return []

    const lats = comCoordenada.map((l) => Number(l.lat))
    const lngs = comCoordenada.map((l) => Number(l.lng))
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    const alturaLat = maxLat - minLat || 0.001
    const larguraLng = maxLng - minLng || 0.001
    const margem = 12 // %

    return comCoordenada.map((l) => ({
      loja: l,
      x: margem + ((Number(l.lng) - minLng) / larguraLng) * (100 - margem * 2),
      y: margem + ((maxLat - Number(l.lat)) / alturaLat) * (100 - margem * 2),
    }))
  }, [lojas])

  if (carregando) return <Carregando texto="Carregando as lojas do centro…" />

  return (
    <div className="pb-4">
      <BarraTopo titulo="Lojas no centro" />

      {erro && (
        <div className="p-4">
          <Aviso tipo="erro">{erro}</Aviso>
        </div>
      )}

      <div className="relative mx-4 mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        {/* grade discreta, só para dar noção de quadra */}
        <svg viewBox="0 0 100 100" className="block h-72 w-full" preserveAspectRatio="none">
          <defs>
            <pattern id="quadras" width="12.5" height="12.5" patternUnits="userSpaceOnUse">
              <path d="M12.5 0V12.5M0 12.5H12.5" stroke="#cbd5e1" strokeWidth="0.4" fill="none" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#quadras)" />
        </svg>

        {pinos.map(({ loja, x, y }) => {
          const selecionada = ativa === loja.id
          return (
            <button
              key={loja.id}
              onClick={() => setAtiva(selecionada ? null : loja.id)}
              aria-label={loja.nome}
              className="absolute -translate-x-1/2 -translate-y-full transition-transform"
              style={{ left: `${x}%`, top: `${y}%`, zIndex: selecionada ? 20 : 10 }}
            >
              <span
                className={`flex items-center justify-center rounded-full border-2 border-white shadow-md transition-all ${
                  selecionada ? 'h-8 w-8' : 'h-6 w-6'
                }`}
                style={{ backgroundColor: loja.cor }}
              >
                <Local className={selecionada ? 'h-4 w-4 text-white' : 'h-3.5 w-3.5 text-white'} />
              </span>
              {selecionada && (
                <span className="surgir absolute bottom-full left-1/2 mb-1 w-max max-w-[9rem] -translate-x-1/2 rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white">
                  {loja.nome}
                </span>
              )}
            </button>
          )
        })}

        <p className="absolute right-2 bottom-2 rounded bg-white/85 px-1.5 py-0.5 text-[10px] text-slate-500">
          posições aproximadas
        </p>
      </div>

      <div className="mt-5 px-4">
        <h2 className="mb-2.5 font-bold text-slate-900">
          {lojas.length} lojas participando
        </h2>
        <div className="space-y-2">
          {lojas.map((l) => (
            <button
              key={l.id}
              onClick={() => irPara(`/loja/${l.id}`)}
              onMouseEnter={() => setAtiva(l.id)}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-roxo-300"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                style={{ backgroundColor: l.cor }}
              >
                {l.nome.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-900">{l.nome}</span>
                <span className="block truncate text-sm text-slate-500">{l.endereco}</span>
              </span>
              {(l.ofertas_ativas ?? 0) > 0 ? (
                <Etiqueta cor="roxo">
                  {l.ofertas_ativas} {l.ofertas_ativas === 1 ? 'oferta' : 'ofertas'}
                </Etiqueta>
              ) : (
                <Etiqueta cor="cinza">sem oferta</Etiqueta>
              )}
              <SetaDireita className="h-4 w-4 shrink-0 text-slate-300" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
