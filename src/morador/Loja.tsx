import { useEffect, useState } from 'react'
import { api, ErroApi } from '../api'
import type { Loja as TipoLoja, Oferta, SessaoMorador } from '../tipos'
import { CartaoOferta } from './CartaoOferta'
import { Aviso, BarraTopo, Carregando, Etiqueta, Vazio } from '../componentes/Ui'
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

  if (carregando) return <Carregando />

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
    <div className="pb-6">
      <BarraTopo
        titulo={loja.nome}
        aoVoltar={voltar}
        acao={
          <button
            onClick={alternarFavorito}
            aria-label={favorito ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
            aria-pressed={favorito}
            className={`rounded-lg p-2 ${favorito ? 'text-red-500' : 'text-slate-400 hover:bg-slate-100'}`}
          >
            {favorito ? <CoracaoCheio /> : <Coracao />}
          </button>
        }
      />

      <header className="px-5 pt-6 pb-6 text-white" style={{ backgroundColor: loja.cor }}>
        <p className="text-xs font-semibold tracking-wide uppercase opacity-80">{loja.categoria}</p>
        <h1 className="mt-1 text-2xl leading-tight font-extrabold">{loja.nome}</h1>
        {loja.descricao && <p className="mt-2 text-sm leading-relaxed opacity-90">{loja.descricao}</p>}
      </header>

      <div className="space-y-2.5 border-b border-slate-200 bg-white p-5">
        <a
          href={mapa}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2.5 text-[15px] text-slate-800 hover:text-roxo-700"
        >
          <Local className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
          <span className="min-w-0 flex-1">
            {loja.endereco}
            {loja.referencia && <span className="block text-sm text-slate-500">{loja.referencia}</span>}
            <span className="mt-0.5 block text-sm font-semibold text-roxo-700">Como chegar</span>
          </span>
        </a>

        {loja.horario && (
          <div className="flex items-start gap-2.5 text-[15px] text-slate-800">
            <Relogio className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
            <span>{loja.horario}</span>
          </div>
        )}

        <div className="flex gap-2 pt-1.5">
          {loja.whatsapp && (
            <a
              href={`https://wa.me/55${loja.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              <Instagram className="h-4 w-4" />
              {loja.instagram}
            </a>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="mb-2.5 flex items-baseline justify-between">
          <h2 className="font-bold text-slate-900">Ofertas desta loja</h2>
          {ofertas.length > 0 && <Etiqueta cor="roxo">{ofertas.length}</Etiqueta>}
        </div>

        {ofertas.length === 0 ? (
          <Vazio icone={<Cupom />} titulo="Sem oferta ativa no momento">
            Esta loja participa do clube, mas ainda não publicou uma promoção. Volte em breve.
          </Vazio>
        ) : (
          <div className="space-y-2.5">
            {ofertas.map((o) => (
              <CartaoOferta key={o.id} oferta={o} aoAbrir={() => irPara(`/oferta/${o.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
