import { useEffect, useState } from 'react'
import { api, ErroApi } from '../api'
import type { PainelLojista } from '../tipos'
import { Aviso, Botao, Campo, Cartao, Carregando, Etiqueta, Folha, Selecao, AreaTexto } from '../componentes/Ui'
import { Mais, Raio } from '../componentes/Icones'
import { dataBr, descreverDias, DIAS_CURTOS } from '../formato'

/*
  Ofertas da loja.

  Oferta criada aqui entra como PENDENTE e só vai ao ar depois que a equipe do
  clube aprovar (R12 do escopo). Isso é dito na tela, antes de o lojista
  preencher — descobrir a moderação só depois de enviar seria uma frustração
  evitável. A curadoria é o que protege o valor da assinatura do morador: um
  "5% acima de R$ 300" no meio do app derruba a renovação de todo mundo.
*/

const TIPOS = [
  { valor: 'percentual', rotulo: 'Desconto em %' },
  { valor: 'valor_fixo', rotulo: 'Desconto em reais' },
  { valor: 'leve_pague', rotulo: 'Leve 2, pague 1' },
  { valor: 'brinde', rotulo: 'Brinde na compra' },
]

const PERIODOS = [
  { valor: 'dia', rotulo: 'por dia' },
  { valor: 'semana', rotulo: 'por semana' },
  { valor: 'mes', rotulo: 'por mês' },
  { valor: 'total', rotulo: 'uma vez só' },
]

export function Ofertas({ recarga, aoMudar }: { recarga: number; aoMudar: () => void }) {
  const [dados, setDados] = useState<PainelLojista | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<PainelLojista>('/api/lojista/painel')
      .then(setDados)
      .catch((e) => setErro(e instanceof ErroApi ? e.message : 'Não consegui carregar as ofertas.'))
      .finally(() => setCarregando(false))
  }, [recarga])

  async function alternar(id: number, pausada: boolean) {
    try {
      await api.patch(`/api/lojista/ofertas/${id}`, { acao: pausada ? 'retomar' : 'pausar' })
      aoMudar()
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não consegui mudar essa oferta.')
    }
  }

  if (carregando) return <Carregando />
  if (!dados) return <Aviso tipo="erro">{erro ?? 'Não consegui carregar as ofertas.'}</Aviso>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900">Minhas ofertas</h2>
          <p className="text-sm text-slate-500">
            {dados.ofertas.length} cadastradas nesta loja
          </p>
        </div>
        <Botao onClick={() => setCriando(true)}>
          <Mais className="h-4 w-4" />
          Nova oferta
        </Botao>
      </div>

      {aviso && <Aviso tipo="sucesso">{aviso}</Aviso>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {dados.ofertas.length === 0 ? (
        <Cartao className="p-8 text-center">
          <p className="font-semibold text-slate-700">Nenhuma oferta ainda</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Sua loja aparece no app, mas sem promoção ativa ela some da lista principal. Crie a
            primeira oferta para começar a receber clientes do clube.
          </p>
        </Cartao>
      ) : (
        <div className="space-y-2.5">
          {dados.ofertas.map((o) => {
            const pausada = o.status === 'pausada'
            const pendente = o.status === 'pendente'
            return (
              <Cartao key={o.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="font-semibold text-slate-900">{o.titulo}</h3>
                      {o.relampago && (
                        <Etiqueta cor="ipe">
                          <Raio className="h-3 w-3" />
                          relâmpago
                        </Etiqueta>
                      )}
                      <SituacaoOferta status={o.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{o.aplicar}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {descreverDias(o.dias_semana)} · até {dataBr(o.fim)} ·{' '}
                      {o.limite_por_morador}x {PERIODOS.find((p) => p.valor === o.periodo_limite)?.rotulo}
                    </p>
                  </div>

                  {!pendente && (
                    <Botao
                      variante="secundario"
                      onClick={() => alternar(o.id, pausada)}
                      className="shrink-0"
                    >
                      {pausada ? 'Retomar' : 'Pausar'}
                    </Botao>
                  )}
                </div>

                {pendente && (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Em análise pela equipe do clube. Você recebe um aviso quando ela for publicada.
                  </p>
                )}
              </Cartao>
            )
          })}
        </div>
      )}

      <FormularioOferta
        aberto={criando}
        aoFechar={() => setCriando(false)}
        aoCriar={(mensagem) => {
          setCriando(false)
          setAviso(mensagem)
          aoMudar()
        }}
      />
    </div>
  )
}

function SituacaoOferta({ status }: { status: string }) {
  if (status === 'aprovada') return <Etiqueta cor="verde">no ar</Etiqueta>
  if (status === 'pendente') return <Etiqueta cor="azul">em análise</Etiqueta>
  if (status === 'pausada') return <Etiqueta cor="cinza">pausada</Etiqueta>
  if (status === 'reprovada') return <Etiqueta cor="vermelho">reprovada</Etiqueta>
  return <Etiqueta cor="cinza">{status}</Etiqueta>
}

function FormularioOferta({
  aberto,
  aoFechar,
  aoCriar,
}: {
  aberto: boolean
  aoFechar: () => void
  aoCriar: (mensagem: string) => void
}) {
  const hoje = new Date().toISOString().slice(0, 10)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState('percentual')
  const [valor, setValor] = useState('')
  const [estimada, setEstimada] = useState('')
  const [regras, setRegras] = useState('')
  const [fim, setFim] = useState('')
  const [dias, setDias] = useState<number[]>([])
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFim, setHoraFim] = useState('')
  const [limitePorMorador, setLimitePorMorador] = useState('1')
  const [periodo, setPeriodo] = useState('mes')
  const [limiteTotal, setLimiteTotal] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const pedeValor = tipo === 'percentual' || tipo === 'valor_fixo'

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      const r = await api.post<{ aviso: string }>('/api/lojista/ofertas', {
        titulo,
        descricao,
        tipo,
        valor_desconto: Number(valor.replace(',', '.')) || 0,
        economia_estimada: Number(estimada.replace(',', '.')) || 0,
        regras,
        inicio: hoje,
        fim,
        dias_semana: dias,
        hora_inicio: horaInicio || null,
        hora_fim: horaFim || null,
        limite_por_morador: Number(limitePorMorador) || 1,
        periodo_limite: periodo,
        limite_total: limiteTotal ? Number(limiteTotal) : null,
      })
      aoCriar(r.aviso)
    } catch (e2) {
      setErro(e2 instanceof ErroApi ? e2.message : 'Não consegui salvar a oferta.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Folha titulo="Nova oferta" aberto={aberto} aoFechar={aoFechar}>
      <Aviso tipo="info" className="mb-5">
        A oferta entra <strong>em análise</strong> e vai ao ar assim que a equipe do clube aprovar.
        Costuma levar menos de um dia útil.
      </Aviso>

      <form onSubmit={enviar} className="space-y-4">
        <Campo
          rotulo="Título da oferta"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex: 25% de desconto em qualquer calçado"
          dica="É o que o morador lê primeiro. Diga o desconto no título."
          required
        />

        <Selecao rotulo="Tipo de desconto" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.rotulo}
            </option>
          ))}
        </Selecao>

        {pedeValor && (
          <Campo
            rotulo={tipo === 'percentual' ? 'Desconto (%)' : 'Desconto (R$)'}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            inputMode="decimal"
            placeholder={tipo === 'percentual' ? '25' : '50,00'}
            required
          />
        )}

        <Campo
          rotulo="Economia média por cliente (R$)"
          value={estimada}
          onChange={(e) => setEstimada(e.target.value)}
          inputMode="decimal"
          placeholder="60,00"
          dica="Usada no relatório quando o balconista não digita o valor da compra."
        />

        <AreaTexto
          rotulo="Descrição (opcional)"
          rows={2}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Uma frase que ajude o morador a decidir."
        />

        <AreaTexto
          rotulo="Regras"
          rows={2}
          value={regras}
          onChange={(e) => setRegras(e.target.value)}
          placeholder="Ex: não acumula com outras promoções."
          dica="Tudo que o cliente precisa saber antes de ir até a loja."
        />

        <Campo
          rotulo="Vale até"
          type="date"
          value={fim}
          min={hoje}
          onChange={(e) => setFim(e.target.value)}
          required
        />

        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Dias da semana</span>
          <div className="flex gap-1.5">
            {DIAS_CURTOS.map((d, i) => {
              const ativo = dias.includes(i)
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDias(ativo ? dias.filter((x) => x !== i) : [...dias, i])}
                  className={`h-10 flex-1 rounded-lg border text-sm font-medium capitalize transition ${
                    ativo
                      ? 'border-roxo-700 bg-roxo-700 text-white'
                      : 'border-slate-300 text-slate-600'
                  }`}
                >
                  {d}
                </button>
              )
            })}
          </div>
          <span className="mt-1.5 block text-sm text-slate-500">
            Nenhum marcado = vale todos os dias.
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Campo
            rotulo="A partir das"
            type="time"
            value={horaInicio}
            onChange={(e) => setHoraInicio(e.target.value)}
          />
          <Campo
            rotulo="Até as"
            type="time"
            value={horaFim}
            onChange={(e) => setHoraFim(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Campo
            rotulo="Cada cliente usa"
            type="number"
            min={1}
            max={30}
            value={limitePorMorador}
            onChange={(e) => setLimitePorMorador(e.target.value)}
          />
          <Selecao rotulo="Com que frequência" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
            {PERIODOS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.rotulo}
              </option>
            ))}
          </Selecao>
        </div>

        <Campo
          rotulo="Limite total de cupons (opcional)"
          type="number"
          min={1}
          value={limiteTotal}
          onChange={(e) => setLimiteTotal(e.target.value)}
          placeholder="Sem limite"
          dica="Quando atingir esse número, a oferta sai do ar sozinha."
        />

        {erro && <Aviso tipo="erro">{erro}</Aviso>}

        <div className="flex gap-2 pt-2">
          <Botao type="submit" largo carregando={enviando}>
            Enviar para análise
          </Botao>
          <Botao type="button" variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
        </div>
      </form>
    </Folha>
  )
}
