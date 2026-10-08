import { useEffect, useState } from 'react'
import { api, ErroApi, query } from '../api'
import type { RelatorioAcil } from '../tipos'
import { Aviso, Botao, Cartao, Carregando } from '../componentes/Ui'
import { BarrasRanking, Colunas, PorHora } from '../componentes/Graficos'
import { Baixar } from '../componentes/Icones'
import { Logo } from '../componentes/Logo'
import { dataPorExtenso, numero, reais, DIAS_CURTOS } from '../formato'

/*
  Relatório da ACIL.

  É a peça institucional, não o painel de operação: aqui não se fala de churn
  nem de receita, fala-se de quanta gente o clube trouxe ao centro e quanto isso
  deixou no bolso do morador. A "economia total gerada" é o número que a
  associação leva para a imprensa e para os associados.

  Por isso a nota sobre APURADO x ESTIMADO fica visível junto do número, e não
  escondida num rodapé. Parte da economia vem do valor de compra digitado pelo
  balconista (exato) e parte vem da estimativa cadastrada na oferta. Apresentar
  os dois como se fossem a mesma coisa é o tipo de detalhe que derruba a
  credibilidade inteira na primeira pergunta de um associado.
*/

export function AdminRelatorio() {
  const hoje = new Date().toISOString().slice(0, 10)
  const [de, setDe] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 89)
    return d.toISOString().slice(0, 10)
  })
  const [ate, setAte] = useState(hoje)
  const [dados, setDados] = useState<RelatorioAcil | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setCarregando(true)
    api
      .get<RelatorioAcil>(`/api/admin/relatorio-acil${query({ de, ate })}`)
      .then(setDados)
      .catch((e) => setErro(e instanceof ErroApi ? e.message : 'Não consegui montar o relatório.'))
      .finally(() => setCarregando(false))
  }, [de, ate])

  if (carregando) return <Carregando texto="Montando o relatório…" />
  if (erro || !dados) return <Aviso tipo="erro">{erro ?? 'Não consegui montar o relatório.'}</Aviso>

  const g = dados.geral
  const proporcaoApurada = g.economia > 0 ? g.economia_apurada / g.economia : 0

  return (
    <div className="space-y-5">
      {/* controles fora da área impressa */}
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">De</span>
          <input
            type="date"
            value={de}
            max={ate}
            onChange={(e) => setDe(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-navy-500"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Até</span>
          <input
            type="date"
            value={ate}
            min={de}
            max={hoje}
            onChange={(e) => setAte(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-navy-500"
          />
        </label>
        <Botao variante="secundario" onClick={() => window.print()}>
          <Baixar className="h-4 w-4" />
          Salvar em PDF
        </Botao>
      </div>

      {/* capa */}
      <Cartao className="overflow-hidden">
        <div className="bg-navy-800 px-6 py-7 text-white">
          <Logo className="mb-3 h-12 w-auto" />
          <p className="text-sm text-navy-200">Relatório de impacto no comércio de Londrina</p>
          <p className="mt-1 text-sm text-navy-100">
            {dataPorExtenso(dados.de)} a {dataPorExtenso(dados.ate)}
          </p>
        </div>

        <div className="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          <Numero
            rotulo="Economia gerada"
            valor={reais(g.economia)}
            nota="devolvida ao bolso do morador"
            heroi
          />
          <Numero
            rotulo="Visitas ao centro"
            valor={numero(g.resgates)}
            nota="cupons usados presencialmente"
          />
          <Numero
            rotulo="Moradores atraídos"
            valor={numero(g.moradores)}
            nota="pessoas diferentes"
          />
          <Numero
            rotulo="Lojas participantes"
            valor={numero(g.lojas)}
            nota="com pelo menos um resgate"
          />
        </div>
      </Cartao>

      <Aviso tipo="info">
        <strong>Como o valor da economia é apurado.</strong>{' '}
        {Math.round(proporcaoApurada * 100)}% ({reais(g.economia_apurada)}) vem do valor de compra
        informado pelo lojista no momento da validação — é número exato. O restante usa a economia
        média cadastrada em cada oferta. O movimento total registrado no caixa das lojas
        participantes foi de <strong>{reais(g.movimentado)}</strong>.
      </Aviso>

      <Cartao className="p-5">
        <h2 className="font-bold text-slate-900">Evolução mês a mês</h2>
        <p className="mb-4 text-sm text-slate-500">
          Cupons usados por mês no período — a curva de adoção do clube.
        </p>
        <Colunas
          altura={190}
          intervaloRotulos={1}
          sufixoDica=" cupons"
          dados={dados.por_mes.map((m) => ({
            chave: m.mes,
            rotulo: rotuloMes(m.mes),
            valor: m.resgates,
          }))}
        />
      </Cartao>

      <div className="grid gap-5 lg:grid-cols-2">
        <Cartao className="p-5">
          <h2 className="font-bold text-slate-900">Lojas com mais movimento</h2>
          <p className="mb-4 text-sm text-slate-500">Cupons validados no período.</p>
          <BarrasRanking
            maximo={10}
            dados={dados.por_loja
              .filter((l) => l.resgates > 0)
              .map((l) => ({
                chave: l.id,
                rotulo: l.nome,
                valor: l.resgates,
                nota: `${reais(l.economia)} de desconto concedido`,
              }))}
          />
        </Cartao>

        <Cartao className="p-5">
          <h2 className="font-bold text-slate-900">Setores mais procurados</h2>
          <p className="mb-4 text-sm text-slate-500">
            Onde o morador gasta quando vem ao centro.
          </p>
          <BarrasRanking
            maximo={10}
            dados={dados.por_categoria.map((c) => ({
              chave: c.categoria,
              rotulo: c.categoria,
              valor: c.resgates,
              nota: `${reais(c.economia)} economizados`,
            }))}
          />
        </Cartao>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Cartao className="p-5">
          <h2 className="font-bold text-slate-900">Que dia da semana o centro enche</h2>
          <p className="mb-4 text-sm text-slate-500">
            Distribuição dos cupons usados por dia da semana.
          </p>
          <Colunas
            altura={150}
            intervaloRotulos={1}
            sufixoDica=" cupons"
            dados={Array.from({ length: 7 }, (_, i) => {
              const achado = dados.por_dia_semana.find((d) => d.dow === i)
              const max = Math.max(...dados.por_dia_semana.map((d) => d.n), 0)
              return {
                chave: String(i),
                rotulo: DIAS_CURTOS[i],
                valor: achado?.n ?? 0,
                destaque: (achado?.n ?? 0) === max && max > 0,
              }
            })}
          />
        </Cartao>

        <Cartao className="p-5">
          <h2 className="font-bold text-slate-900">Em que horário</h2>
          <p className="mb-4 text-sm text-slate-500">
            Útil para a associação planejar horário estendido e eventos.
          </p>
          <PorHora dados={dados.por_hora} />
        </Cartao>
      </div>

      <Cartao className="p-5">
        <h2 className="font-bold text-slate-900">De onde vem quem visita o centro</h2>
        <p className="mb-4 text-sm text-slate-500">
          Bairro declarado no cadastro dos moradores que usaram cupom no período. É a prova de que o
          clube traz gente de fora da região central.
        </p>
        {dados.bairros.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Sem dados no período.</p>
        ) : (
          <BarrasRanking
            maximo={12}
            dados={dados.bairros.map((b) => ({
              chave: b.bairro,
              rotulo: b.bairro,
              valor: b.resgates,
              nota: `${numero(b.moradores)} ${b.moradores === 1 ? 'morador' : 'moradores'}`,
            }))}
          />
        )}
      </Cartao>

      <p className="pb-4 text-center text-xs text-slate-400">
        Relatório gerado pelo Club43 de Vantagens · dados de {dataPorExtenso(dados.de)} a{' '}
        {dataPorExtenso(dados.ate)}
      </p>
    </div>
  )
}

function Numero({
  rotulo,
  valor,
  nota,
  heroi,
}: {
  rotulo: string
  valor: string
  nota: string
  heroi?: boolean
}) {
  return (
    <div className="bg-white px-5 py-5">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{rotulo}</p>
      {/* figura herói: proporcional, nunca tabular — em corpo grande tabular
          dá a todo dígito a largura do zero e o número parece frouxo */}
      <p
        className={`mt-1 font-extrabold ${heroi ? 'text-4xl text-navy-800' : 'text-3xl text-slate-900'}`}
      >
        {valor}
      </p>
      <p className="mt-1 text-xs text-slate-500">{nota}</p>
    </div>
  )
}

function rotuloMes(iso: string) {
  const [ano, mes] = iso.split('-').map(Number)
  const nomes = [
    'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
    'jul', 'ago', 'set', 'out', 'nov', 'dez',
  ]
  return `${nomes[mes - 1]}/${String(ano).slice(2)}`
}
