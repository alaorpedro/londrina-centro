import { useEffect, useState } from 'react'
import { api, ErroApi } from '../api'
import type { Cupom as TipoCupom, Oferta as TipoOferta, SessaoMorador } from '../tipos'
import { Aviso, BarraTopo, Botao, Popup } from '../componentes/Ui'
import { Capa, Monograma } from '../componentes/Capa'
import { Esqueleto, Revelar } from '../componentes/Movimento'
import {
  Calendario,
  Cadeado,
  Local,
  Raio,
  Relogio,
  SetaDireita,
  Etiqueta as IconeEtiqueta,
} from '../componentes/Icones'
import { dataBr, descreverDias, reais } from '../formato'
import { irPara, voltar } from '../rotas'
import { selo, legendaSelo } from './CartaoOferta'

export function Oferta({ id, sessao }: { id: string; sessao: SessaoMorador }) {
  const [oferta, setOferta] = useState<TipoOferta | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [barreira, setBarreira] = useState<{
    titulo: string
    texto: string
    assinar?: boolean
  } | null>(null)

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
        setBarreira({ titulo: 'Assine para usar os cupons', texto: err.message, assinar: true })
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

  if (carregando) {
    return (
      <div>
        <Esqueleto className="h-64 w-full rounded-none" />
        <div className="space-y-3 p-5">
          <Esqueleto className="h-4 w-2/3" />
          <Esqueleto className="h-20 w-full rounded-2xl" />
          <Esqueleto className="h-4 w-1/2" />
          <Esqueleto className="h-4 w-3/4" />
        </div>
      </div>
    )
  }

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
    <div className="pb-36">
      {/* capa em sangria, com a barra flutuando por cima */}
      <div className="relative">
        <div className="absolute inset-x-0 top-0 z-30">
          <BarraTopo titulo={oferta.loja_nome} aoVoltar={voltar} transparente />
        </div>

        <div className="relative h-64 overflow-hidden">
          <Capa
            nome={oferta.loja_nome}
            categoria={oferta.categoria}
            cor={oferta.cor}
            className="absolute inset-0 h-full w-full"
            glifoOpacidade={0.2}
          />
          <span className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-slate-950/30" />

          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            {oferta.relampago && (
              <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-ipe-400 px-2.5 py-1 text-[10px] font-extrabold text-slate-900 uppercase shadow-media">
                <Raio className="h-3 w-3" />
                oportunidade relâmpago
              </span>
            )}
            <p className="texto-sobre-capa text-6xl leading-none font-extrabold tracking-tight">
              {selo(oferta)}
              <span className="ml-2 align-super text-lg font-bold tracking-wide uppercase opacity-80">
                {legendaSelo(oferta)}
              </span>
            </p>
            <h1 className="texto-sobre-capa mt-2 text-xl leading-snug font-extrabold">
              {oferta.titulo}
            </h1>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {oferta.descricao && (
          <Revelar>
            <p className="text-[15px] leading-relaxed text-slate-700">{oferta.descricao}</p>
          </Revelar>
        )}

        <Revelar atraso={60}>
          <button
            onClick={() => irPara(`/loja/${oferta.loja_id}`)}
            className="pressionavel elevavel flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-suave"
          >
            <Monograma nome={oferta.loja_nome} cor={oferta.cor} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold text-slate-900">{oferta.loja_nome}</span>
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <Local className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{oferta.endereco}</span>
              </span>
            </span>
            <SetaDireita className="h-5 w-5 shrink-0 text-slate-300" />
          </button>
        </Revelar>

        <Revelar atraso={120}>
          <section className="rounded-2xl bg-white p-4 shadow-suave">
            <h2 className="mb-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Quando vale
            </h2>
            <div className="space-y-2.5">
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
                  {oferta.restantes > 0 ? (
                    <>
                      Restam <strong>{oferta.restantes}</strong> cupons desta oferta
                    </>
                  ) : (
                    'Os cupons desta oferta acabaram'
                  )}
                </Linha>
              )}
            </div>
          </section>
        </Revelar>

        {oferta.regras && (
          <Revelar atraso={180}>
            <section>
              <h2 className="mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Regras
              </h2>
              <p className="rounded-2xl bg-slate-100 p-4 text-sm leading-relaxed text-slate-700">
                {oferta.regras}
              </p>
            </section>
          </Revelar>
        )}
      </div>

      {/* barra fixa: a ação principal nunca sai da tela */}
      <div className="area-segura-baixo vidro fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg px-4 pt-3 shadow-[0_-4px_20px_-8px_rgb(74_26_148/0.18)]">
        {!oferta.disponivel ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3.5 text-center text-sm font-semibold text-slate-600">
            <Relogio className="h-4 w-4 shrink-0 text-slate-400" />
            {oferta.motivo}
          </div>
        ) : !sessao.assinante ? (
          <>
            <Botao largo grande onClick={aoTocarUsar}>
              <Cadeado className="h-5 w-5" />
              Assinar para usar
            </Botao>
            <p className="pt-2 pb-1 text-center text-xs text-slate-500">
              Este cupom sozinho já economiza{' '}
              <strong className="text-slate-700">{reais(oferta.economia_estimada)}</strong>
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
      <span className="mt-0.5 shrink-0 text-roxo-400">{icone}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  )
}
