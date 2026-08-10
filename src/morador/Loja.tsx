import { useEffect, useState } from 'react'
import { api, ErroApi } from '../api'
import type { Loja as TipoLoja, Oferta, SessaoMorador } from '../tipos'
import { CartaoLista } from './CartaoOferta'
import { Aviso, BarraTopo, Etiqueta, Vazio } from '../componentes/Ui'
import { Capa } from '../componentes/Capa'
import { Esqueleto, Revelar } from '../componentes/Movimento'
import {
  Coracao,
  CoracaoCheio,
  Cupom,
  Instagram,
  Local,
  Relogio,
  Whatsapp,
} from '../componentes/Icones'
import { irPara, voltar } from '../rotas'

export function Loja({ id, sessao }: { id: string; sessao: SessaoMorador }) {
  const [loja, setLoja] = useState<TipoLoja | null>(null)
  const [ofertas, setOfertas] = useState<Oferta[]>([])
  const [favorito, setFavorito] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setCarregando(true)
    api
      .get<{ loja: TipoLoja; ofertas: Oferta[]; favorito: boolean }>(`/api/morador/lojas/${id}`)
      .then((d) => {
        setLoja(d.loja)
        setOfertas(d.ofertas)
        setFavorito(d.favorito)
      })
      .catch((e) => setErro(e instanceof ErroApi ? e.message : 'Não consegui abrir esta loja.'))
      .finally(() => setCarregando(false))
  }, [id])

  async function alternarFavorito() {
    if (!sessao.logado) return irPara('/entrar')
    const anterior = favorito
    setFavorito(!anterior) // otimista: o coração responde na hora
    try {
      const d = await api.post<{ favorito: boolean }>('/api/morador/favoritos', {
        loja_id: Number(id),
      })
      setFavorito(d.favorito)
    } catch {
      setFavorito(anterior)
    }
  }

  if (carregando) {
    return (
      <div>
        <Esqueleto className="h-52 w-full rounded-none" />
        <div className="space-y-3 p-5">
          <Esqueleto className="h-5 w-1/2" />
          <Esqueleto className="h-4 w-3/4" />
          <Esqueleto className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (erro || !loja) {
    return (
      <div>
        <BarraTopo titulo="Loja" aoVoltar={voltar} />
        <div className="p-4">
          <Aviso tipo="erro">{erro ?? 'Essa loja não está no clube agora.'}</Aviso>
        </div>
      </div>
    )
  }

  const mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${loja.endereco}, Londrina PR`,
  )}`

  return (
    <div className="pb-8">
      <div className="relative">
        <div className="absolute inset-x-0 top-0 z-30">
          <BarraTopo
            titulo={loja.nome}
            aoVoltar={voltar}
            transparente
            acao={
              <button
                onClick={alternarFavorito}
                aria-label={favorito ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
                aria-pressed={favorito}
                className={`pressionavel rounded-xl p-2 backdrop-blur ${
                  favorito
                    ? 'bg-white/90 text-red-500'
                    : 'bg-slate-900/25 text-white hover:bg-slate-900/40'
                }`}
              >
                {favorito ? <CoracaoCheio /> : <Coracao />}
              </button>
            }
          />
        </div>

        <div className="relative h-52 overflow-hidden">
          <Capa
            nome={loja.nome}
            categoria={loja.categoria}
            cor={loja.cor}
            className="absolute inset-0 h-full w-full"
            glifoOpacidade={0.2}
          />
          <span className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/25" />

          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <p className="texto-sobre-capa text-[10px] font-bold tracking-wider uppercase opacity-90">
              {loja.categoria}
            </p>
            <h1 className="texto-sobre-capa mt-1 text-2xl leading-tight font-extrabold tracking-tight">
              {loja.nome}
            </h1>
          </div>
        </div>
      </div>

      {loja.descricao && (
        <p className="px-5 pt-5 text-[15px] leading-relaxed text-slate-700">{loja.descricao}</p>
      )}

      <div className="p-5">
        <div className="space-y-3 rounded-2xl bg-white p-4 shadow-suave">
          <a
            href={mapa}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2.5 text-[15px] text-slate-800 hover:text-roxo-700"
          >
            <Local className="mt-0.5 h-5 w-5 shrink-0 text-roxo-400" />
            <span className="min-w-0 flex-1">
              {loja.endereco}
              {loja.referencia && (
                <span className="block text-sm text-slate-500">{loja.referencia}</span>
              )}
              <span className="mt-0.5 block text-sm font-bold text-roxo-700">Como chegar →</span>
            </span>
          </a>

          {loja.horario && (
            <div className="flex items-start gap-2.5 text-[15px] text-slate-800">
              <Relogio className="mt-0.5 h-5 w-5 shrink-0 text-roxo-400" />
              <span>{loja.horario}</span>
            </div>
          )}

          {(loja.whatsapp || loja.instagram) && (
            <div className="flex gap-2 pt-1">
              {loja.whatsapp && (
                <a
                  href={`https://wa.me/55${loja.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pressionavel inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  <Whatsapp className="h-4 w-4" />
                  WhatsApp
                </a>
              )}
              {loja.instagram && (
                <a
                  href={`https://instagram.com/${loja.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pressionavel inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
                >
                  <Instagram className="h-4 w-4" />
                  {loja.instagram}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-4">
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Ofertas da loja</h2>
          {ofertas.length > 0 && <Etiqueta cor="roxo">{ofertas.length}</Etiqueta>}
        </div>

        {ofertas.length === 0 ? (
          <Vazio icone={<Cupom />} titulo="Sem oferta ativa no momento">
            Esta loja participa do clube, mas ainda não publicou uma promoção. Volte em breve.
          </Vazio>
        ) : (
          <div className="space-y-2.5">
            {ofertas.map((o, i) => (
              <Revelar key={o.id} atraso={i * 50}>
                <CartaoLista oferta={o} aoAbrir={() => irPara(`/oferta/${o.id}`)} />
              </Revelar>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
