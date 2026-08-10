import { useEffect, useState } from 'react'
import { api, ErroApi } from '../api'
import type { OfertaAdmin } from '../tipos'
import { Aviso, Botao, Cartao, Carregando, Etiqueta, Vazio } from '../componentes/Ui'
import { Check, Fechar, Raio, Etiqueta as IconeEtiqueta } from '../componentes/Icones'
import { dataBr, descreverDias, numero, reais } from '../formato'

/*
  Fila de curadoria.

  R12 do escopo: oferta criada pelo lojista entra pendente e só vai ao ar com
  aprovação. Esta tela é onde o valor da assinatura é defendido — uma oferta
  fraca aprovada por descuido custa a renovação de toda a base, não só a daquela
  loja. Por isso a fila abre primeiro e o desconto aparece em destaque, para a
  decisão ser tomada olhando o número.
*/

export function AdminOfertas() {
  const [ofertas, setOfertas] = useState<OfertaAdmin[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'pendente' | 'todas'>('pendente')

  async function carregar() {
    try {
      const d = await api.get<{ ofertas: OfertaAdmin[] }>(
        `/api/admin/ofertas${filtro === 'pendente' ? '?status=pendente' : ''}`,
      )
      setOfertas(d.ofertas)
      setErro(null)
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não consegui carregar as ofertas.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    setCarregando(true)
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro])

  async function agir(id: number, acao: string) {
    try {
      await api.patch(`/api/admin/ofertas/${id}`, { acao })
      await carregar()
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não consegui aplicar essa ação.')
    }
  }

  if (carregando) return <Carregando />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900">Ofertas</h2>
          <p className="text-sm text-slate-500">
            {filtro === 'pendente'
              ? 'Enviadas pelas lojas, esperando sua decisão'
              : 'Todas as ofertas do clube'}
          </p>
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {(['pendente', 'todas'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                filtro === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              {f === 'pendente' ? 'Para aprovar' : 'Todas'}
            </button>
          ))}
        </div>
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {filtro === 'pendente' && ofertas.length > 0 && (
        <Aviso tipo="atencao">
          Antes de aprovar, pergunte: <strong>eu pagaria a assinatura por causa desta oferta?</strong>{' '}
          Desconto fraco aprovado hoje vira cancelamento no mês que vem.
        </Aviso>
      )}

      {ofertas.length === 0 ? (
        <Cartao>
          <Vazio icone={<IconeEtiqueta />} titulo="Nada na fila">
            {filtro === 'pendente'
              ? 'Nenhuma oferta esperando aprovação no momento.'
              : 'Nenhuma oferta cadastrada.'}
          </Vazio>
        </Cartao>
      ) : (
        <div className="space-y-2.5">
          {ofertas.map((o) => (
            <Cartao key={o.id} className="p-4">
              <div className="flex flex-wrap items-start gap-4">
                <div className="min-w-[14rem] flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="font-semibold text-slate-900">{o.titulo}</h3>
                    {o.relampago && (
                      <Etiqueta cor="ipe">
                        <Raio className="h-3 w-3" />
                        relâmpago
                      </Etiqueta>
                    )}
                    {o.destaque && <Etiqueta cor="roxo">destaque</Etiqueta>}
                    <Situacao status={o.status} />
                  </div>

                  <p className="mt-0.5 text-sm text-slate-500">{o.loja_nome} · {o.categoria}</p>

                  {o.descricao && <p className="mt-2 text-sm text-slate-600">{o.descricao}</p>}
                  {o.regras && (
                    <p className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {o.regras}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-slate-500">
                    {descreverDias(o.dias_semana)}
                    {o.hora_inicio && `, ${o.hora_inicio}–${o.hora_fim ?? '23:59'}`} · até{' '}
                    {dataBr(o.fim)} · {o.limite_por_morador}x por{' '}
                    {o.periodo_limite === 'mes' ? 'mês' : o.periodo_limite}
                    {o.limite_total ? ` · máx ${numero(o.limite_total)} cupons` : ''}
                  </p>
                </div>

                <div className="w-32 shrink-0 rounded-xl bg-slate-50 px-3 py-2.5 text-center">
                  <p className="text-xs text-slate-500">desconto</p>
                  <p className="text-lg font-extrabold text-slate-900">{o.aplicar}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    ~{reais(o.economia_estimada)} por uso
                  </p>
                  {o.resgates > 0 && (
                    <p className="mt-1 text-xs font-semibold text-emerald-700">
                      {numero(o.resgates)} usos
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  {o.status === 'pendente' ? (
                    <>
                      <Botao onClick={() => agir(o.id, 'aprovar')}>
                        <Check className="h-4 w-4" />
                        Aprovar
                      </Botao>
                      <Botao variante="perigo" onClick={() => agir(o.id, 'reprovar')}>
                        <Fechar className="h-4 w-4" />
                        Reprovar
                      </Botao>
                    </>
                  ) : (
                    <>
                      <Botao
                        variante="secundario"
                        onClick={() => agir(o.id, o.status === 'pausada' ? 'retomar' : 'pausar')}
                      >
                        {o.status === 'pausada' ? 'Retomar' : 'Pausar'}
                      </Botao>
                      <Botao
                        variante={o.destaque ? 'claro' : 'secundario'}
                        onClick={() => agir(o.id, 'destacar')}
                      >
                        {o.destaque ? 'Tirar destaque' : 'Destacar'}
                      </Botao>
                    </>
                  )}
                </div>
              </div>
            </Cartao>
          ))}
        </div>
      )}
    </div>
  )
}

function Situacao({ status }: { status: string }) {
  if (status === 'aprovada') return <Etiqueta cor="verde">no ar</Etiqueta>
  if (status === 'pendente') return <Etiqueta cor="azul">para aprovar</Etiqueta>
  if (status === 'pausada') return <Etiqueta cor="cinza">pausada</Etiqueta>
  if (status === 'reprovada') return <Etiqueta cor="vermelho">reprovada</Etiqueta>
  if (status === 'expirada') return <Etiqueta cor="cinza">expirada</Etiqueta>
  return <Etiqueta cor="cinza">{status}</Etiqueta>
}
