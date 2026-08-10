import { useEffect, useState } from 'react'
import { api, ErroApi } from '../api'
import type { Cupom as TipoCupom, Oferta as TipoOferta, SessaoMorador } from '../tipos'
import { Aviso, BarraTopo, Botao, Carregando, Popup } from '../componentes/Ui'
import { Calendario, Cadeado, Local, Raio, Relogio, Etiqueta as IconeEtiqueta } from '../componentes/Icones'
import { dataBr, descreverDias, reais } from '../formato'
import { irPara, voltar } from '../rotas'
import { selo } from './CartaoOferta'

export function Oferta({ id, sessao }: { id: string; sessao: SessaoMorador }) {
  const [oferta, setOferta] = useState<TipoOferta | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [barreira, setBarreira] = useState<{ titulo: string; texto: string; assinar?: boolean } | null>(
    null,
  )

  useEffect(() => {
    setCarregando(true)
    api
      .get<{ oferta: TipoOferta }>(`/api/morador/ofertas/${id}`)
      .then((d) => setOferta(d.oferta))
      .catch((e) => setErro(e instanceof ErroApi ? e.message : 'Não consegui abrir esta oferta.'))
      .finally(() => setCarregando(false))
  }, [id])

  async function gerar() {
    if (!oferta) return
    setConfirmando(false)
    setGerando(true)
    try {
      const cupom = await api.post<TipoCupom>('/api/morador/resgates', { oferta_id: oferta.id })
      irPara(`/cupom/${cupom.id}`)
    } catch (e) {
      const err = e as ErroApi
      if (err.precisaAssinar) {
        setBarreira({
          titulo: 'Assine para usar os cupons',
          texto: err.message,
          assinar: true,
        })
      } else if (err.precisaEntrar) {
        irPara('/entrar')
      } else {
        setBarreira({ titulo: 'Não deu para gerar o cupom', texto: err.message })
      }
    } finally {
      setGerando(false)
    }
  }

  function aoTocarUsar() {
    if (!sessao.logado) return irPara('/entrar')
    if (!sessao.assinante) return irPara('/assinar')
    setConfirmando(true)
  }

  if (carregando) return <Carregando texto="Abrindo a oferta…" />

  if (erro || !oferta) {
    return (
      <div>
        <BarraTopo titulo="Oferta" aoVoltar={voltar} />
        <div className="p-4">
          <Aviso tipo="erro">{erro ?? 'Essa oferta não está mais disponível.'}</Aviso>
          <Botao className="mt-4" variante="secundario" onClick={() => irPara('/')}>
            Ver outras ofertas
          </Botao>
        </div>
      </div>
    )
  }

  const semanaToda = !oferta.dias_semana || oferta.dias_semana.length === 0
  const temHorario = Boolean(oferta.hora_inicio || oferta.hora_fim)

  return (
    <div className="pb-32">
      <BarraTopo titulo={oferta.loja_nome} aoVoltar={voltar} />

      <div className="px-5 pt-6 pb-5 text-white" style={{ backgroundColor: oferta.cor }}>
        {oferta.relampago && (
          <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-ipe-400 px-2.5 py-1 text-[11px] font-bold text-slate-900 uppercase">
            <Raio className="h-3 w-3" />
            oportunidade relâmpago
          </span>
        )}
        <p className="text-5xl font-extrabold tracking-tight">{selo(oferta)}</p>
        <h1 className="mt-2 text-xl leading-snug font-bold">{oferta.titulo}</h1>
        <p className="mt-2 text-sm opacity-90">{oferta.aplicar}</p>
      </div>

      <div className="space-y-5 p-5">
        {oferta.descricao && (
          <p className="text-[15px] leading-relaxed text-slate-700">{oferta.descricao}</p>
        )}

        <button
          onClick={() => irPara(`/loja/${oferta.loja_id}`)}
          className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left hover:border-roxo-300"
        >
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: oferta.cor }}
          >
            {oferta.loja_nome.slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-slate-900">{oferta.loja_nome}</span>
            <span className="block truncate text-sm text-slate-500">{oferta.endereco}</span>
          </span>
          <Local className="h-5 w-5 shrink-0 text-slate-400" />
        </button>

        <section className="space-y-2.5">
          <h2 className="text-sm font-bold tracking-wide text-slate-500 uppercase">
            Quando vale
          </h2>
          <Linha icone={<Calendario className="h-4 w-4" />}>
            {semanaToda ? 'Todos os dias' : `Só ${descreverDias(oferta.dias_semana)}`}
            <span className="text-slate-500"> · até {dataBr(oferta.fim)}</span>
          </Linha>
          {temHorario && (
            <Linha icone={<Relogio className="h-4 w-4" />}>
              {oferta.hora_inicio && oferta.hora_fim
                ? `Das ${oferta.hora_inicio} às ${oferta.hora_fim}`
                : oferta.hora_inicio
                  ? `A partir das ${oferta.hora_inicio}`
                  : `Até as ${oferta.hora_fim}`}
            </Linha>
          )}
          <Linha icone={<IconeEtiqueta className="h-4 w-4" />}>
            {oferta.limite_por_morador === 1 ? 'Uma vez' : `${oferta.limite_por_morador} vezes`}{' '}
            {oferta.periodo_limite === 'dia'
              ? 'por dia'
              : oferta.periodo_limite === 'semana'
                ? 'por semana'
                : oferta.periodo_limite === 'mes'
                  ? 'por mês'
                  : 'no total'}
          </Linha>
          {oferta.restantes !== null && (
            <Linha icone={<Cadeado className="h-4 w-4" />}>
              {oferta.restantes > 0
                ? `Restam ${oferta.restantes} cupons desta oferta`
                : 'Os cupons desta oferta acabaram'}
            </Linha>
          )}
        </section>

        {oferta.regras && (
          <section>
            <h2 className="mb-2 text-sm font-bold tracking-wide text-slate-500 uppercase">
              Regras
            </h2>
            <p className="rounded-xl bg-slate-100 p-3.5 text-sm leading-relaxed text-slate-700">
              {oferta.regras}
            </p>
          </section>
        )}
      </div>

      {/* barra fixa: a ação principal nunca sai da tela */}
      <div className="area-segura-baixo fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 pt-3 backdrop-blur">
        {!oferta.disponivel ? (
          <div className="rounded-xl bg-slate-100 px-4 py-3.5 text-center text-sm font-medium text-slate-600">
            {oferta.motivo}
          </div>
        ) : !sessao.assinante ? (
          <>
            <Botao largo grande onClick={aoTocarUsar}>
              <Cadeado className="h-5 w-5" />
              Assinar para usar
            </Botao>
            <p className="pt-2 pb-1 text-center text-xs text-slate-500">
              Este cupom sozinho já economiza {reais(oferta.economia_estimada)}
            </p>
          </>
        ) : (
          <>
            <Botao largo grande carregando={gerando} onClick={aoTocarUsar}>
              Usar agora
            </Botao>
            <p className="pt-2 pb-1 text-center text-xs text-slate-500">
              Gere o código só quando estiver na loja — ele vale 5 minutos
            </p>
          </>
        )}
      </div>

      {confirmando && (
        <Popup
          titulo="Você já está na loja?"
          tipo="info"
          aoFechar={() => setConfirmando(false)}
          acao={{ texto: 'Sim, gerar código', ao: gerar }}
        >
          O código vale por <strong>5 minutos</strong> e só pode ser usado uma vez. Gere quando
          estiver no balcão de {oferta.loja_nome}.
        </Popup>
      )}

      {barreira && (
        <Popup
          titulo={barreira.titulo}
          tipo={barreira.assinar ? 'info' : 'atencao'}
          aoFechar={() => setBarreira(null)}
          acao={barreira.assinar ? { texto: 'Ver planos', ao: () => irPara('/assinar') } : undefined}
        >
          {barreira.texto}
        </Popup>
      )}
    </div>
  )
}

function Linha({ icone, children }: { icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-[15px] text-slate-800">
      <span className="mt-0.5 shrink-0 text-slate-400">{icone}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  )
}
