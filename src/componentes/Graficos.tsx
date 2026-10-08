import { useLayoutEffect, useRef, useState } from 'react'
import { diaMes, somarDias } from '../formato'

/*
  Gráficos do painel do lojista, do admin e do relatório da ACIL.

  Decisão de leitura: todos são de SÉRIE ÚNICA. O trabalho dos dados aqui é
  sempre magnitude ("quantos resgates neste dia", "quais lojas puxam mais"),
  nunca identidade — então a cor é sequencial de uma hue só. É o navy-600
  (#1C5798), e NÃO o navy do logo (#052A52): o do logo tem L 0.285 e cai fora
  da banda de luminosidade do validador. Cor de marca e cor de dado são
  escolhas diferentes e não existe paleta categórica para
  dar errado sob daltonismo. Onde um valor precisa se destacar do resto (o dia
  de hoje, a loja campeã), a forma é ênfase: a hue no marco em foco e cinza de
  recuo no contexto — não uma segunda cor.

  Especificação dos marcos, igual em todos:
    coluna/barra   ≤ 24px de espessura, ponta arredondada em 4px, quadrada na base
    espaçador      2px na cor da superfície entre marcos vizinhos
    grade          1px sólida, cinza um passo fora da superfície, recessiva
    rótulo         seletivo (só o extremo), nunca um número em cada ponto
    texto          sempre em tinta, nunca na cor do dado

  Sem legenda: com uma série só, o título já diz o que está plotado.
*/

const HUE = '#1C5798'
const RECUO = '#CBD5E1'
const GRADE = '#E2E8F0'
const EIXO = '#94A3B8'

const RAIO = 4
const ESPESSURA_MAX = 24
const GAP = 2

/** Largura real do container — corner radius e traço precisam de pixel, não de viewBox esticado. */
function useLargura<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [largura, setLargura] = useState(0)

  useLayoutEffect(() => {
    const alvo = ref.current
    if (!alvo) return
    const observador = new ResizeObserver(([entrada]) => {
      setLargura(entrada.contentRect.width)
    })
    observador.observe(alvo)
    setLargura(alvo.getBoundingClientRect().width)
    return () => observador.disconnect()
  }, [])

  return [ref, largura] as const
}

/** Retângulo com topo arredondado e base reta — o marco cresce de uma linha só. */
function caminhoColuna(x: number, y: number, w: number, h: number) {
  const r = Math.min(RAIO, w / 2, h)
  if (h <= 0) return ''
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`
}

/** Teto arredondado para número limpo no eixo (0 / 10 / 25 / 50 / 100…). */
function tetoLimpo(max: number) {
  if (max <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(max))
  for (const passo of [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]) {
    const candidato = passo * magnitude
    if (candidato >= max) return candidato
  }
  return 10 * magnitude
}

const inteiroBr = new Intl.NumberFormat('pt-BR')

/* ---------- dica de valor ----------
   Um gráfico em HTML é interativo por natureza; sem isso o leitor fica sem os
   valores que não foram rotulados. */

type Dica = { x: number; y: number; titulo: string; valor: string } | null

function Balao({ dica, largura }: { dica: Dica; largura: number }) {
  if (!dica) return null
  const encostaNaDireita = dica.x > largura - 90
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 -translate-y-full rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg"
      style={{
        left: dica.x,
        top: dica.y - 8,
        transform: `translate(${encostaNaDireita ? '-100%' : '-50%'}, -100%)`,
      }}
    >
      <span className="block font-semibold">{dica.titulo}</span>
      <span className="tabular block text-slate-300">{dica.valor}</span>
    </div>
  )
}

/* ====================================================================== */

export type PontoColuna = { chave: string; rotulo: string; valor: number; destaque?: boolean }

/*
  Preenche os dias sem movimento com zero.

  O GROUP BY do banco só devolve os dias que tiveram resgate. Plotar isso direto
  produz uma série temporal que mente: quatro barras encostadas sugerem quatro
  dias seguidos de movimento quando na verdade houve duas semanas de silêncio
  entre elas. Dia sem resgate é dado — é um zero, não uma ausência.
*/
export function serieDiaria(
  dados: { dia: string; n: number }[],
  de: string,
  ate: string,
  hoje?: string,
): PontoColuna[] {
  const mapa = new Map(dados.map((d) => [d.dia.slice(0, 10), d.n]))
  const pontos: PontoColuna[] = []

  for (let dia = de; dia <= ate; dia = somarDias(dia, 1)) {
    pontos.push({
      chave: dia,
      rotulo: diaMes(dia),
      valor: mapa.get(dia) ?? 0,
      destaque: hoje ? dia === hoje : undefined,
    })
    if (pontos.length > 400) break // trava contra intervalo absurdo
  }

  return pontos
}

/**
 * Colunas para série temporal e distribuições (por dia, por hora, por mês).
 * Rotula só o pico — número em cima de toda coluna vira ruído e não é lido.
 */
export function Colunas({
  dados,
  altura = 160,
  formatar = (v: number) => inteiroBr.format(v),
  sufixoDica = '',
  intervaloRotulos,
}: {
  dados: PontoColuna[]
  altura?: number
  formatar?: (v: number) => string
  sufixoDica?: string
  intervaloRotulos?: number
}) {
  const [ref, largura] = useLargura<HTMLDivElement>()
  const [dica, setDica] = useState<Dica>(null)

  if (dados.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">Sem dados no período.</p>
  }

  const margemEsq = 34
  const margemBaixo = 20
  const margemTopo = 14
  const areaLargura = Math.max(0, largura - margemEsq)
  const areaAltura = altura - margemBaixo - margemTopo

  const max = Math.max(...dados.map((d) => d.valor))
  const teto = tetoLimpo(max)
  const indicePico = dados.reduce((melhor, d, i) => (d.valor > dados[melhor].valor ? i : melhor), 0)

  const banda = areaLargura / dados.length
  const espessura = Math.max(2, Math.min(ESPESSURA_MAX, banda - GAP))

  const marcas = [0, teto / 2, teto]
  const passoRotulo = intervaloRotulos ?? Math.max(1, Math.ceil(dados.length / 8))

  return (
    <div ref={ref} className="relative w-full">
      {largura > 0 && (
        <svg width={largura} height={altura} role="img" aria-label="Gráfico de colunas">
          {/* grade recessiva: hairline sólida, um passo fora da superfície */}
          {marcas.map((m) => {
            const y = margemTopo + areaAltura - (m / teto) * areaAltura
            return (
              <g key={m}>
                <line x1={margemEsq} y1={y} x2={largura} y2={y} stroke={GRADE} strokeWidth={1} />
                <text
                  x={margemEsq - 6}
                  y={y + 3.5}
                  textAnchor="end"
                  className="tabular fill-slate-400 text-[10px]"
                >
                  {inteiroBr.format(Math.round(m))}
                </text>
              </g>
            )
          })}

          {dados.map((d, i) => {
            const h = teto > 0 ? (d.valor / teto) * areaAltura : 0
            const x = margemEsq + i * banda + (banda - espessura) / 2
            const y = margemTopo + areaAltura - h
            const emFoco = d.destaque
            const temFoco = dados.some((p) => p.destaque)

            return (
              <g key={d.chave}>
                <path
                  d={caminhoColuna(x, y, espessura, h)}
                  fill={temFoco && !emFoco ? RECUO : HUE}
                />
                {/* alvo de hover maior que o marco — coluna fina é impossível de acertar */}
                <rect
                  x={margemEsq + i * banda}
                  y={margemTopo}
                  width={banda}
                  height={areaAltura}
                  fill="transparent"
                  onMouseEnter={() =>
                    setDica({
                      x: margemEsq + i * banda + banda / 2,
                      y: margemTopo + areaAltura,
                      titulo: d.rotulo,
                      valor: `${formatar(d.valor)}${sufixoDica}`,
                    })
                  }
                  onMouseLeave={() => setDica(null)}
                />
              </g>
            )
          })}

          {/* rótulo direto só no pico */}
          {max > 0 && (
            <text
              x={margemEsq + indicePico * banda + banda / 2}
              y={margemTopo + areaAltura - (dados[indicePico].valor / teto) * areaAltura - 5}
              textAnchor="middle"
              className="tabular fill-slate-600 text-[10px] font-semibold"
            >
              {formatar(dados[indicePico].valor)}
            </text>
          )}

          {/* eixo x: um rótulo a cada N para não colidir. Os das pontas mudam de
              âncora, senão metade do texto sai para fora do SVG e é cortada. */}
          {dados.map((d, i) => {
            const ultimoIndice = dados.length - 1
            /* O último rótulo só entra se estiver longe o bastante do anterior:
               com passo 4 e 30 pontos, o regular cai no índice 28 e o último no
               29 — os dois colados viram borrão. */
            const sobra = ultimoIndice % passoRotulo
            const cabeUltimo = sobra === 0 || sobra >= passoRotulo / 2
            const mostrar =
              i === ultimoIndice ? cabeUltimo : i % passoRotulo === 0 && ultimoIndice - i > 1
            if (!mostrar) return null

            const centro = margemEsq + i * banda + banda / 2
            const primeiro = centro - 14 < margemEsq
            const ultimo = centro + 14 > largura

            return (
              <text
                key={`r-${d.chave}`}
                x={primeiro ? margemEsq : ultimo ? largura : centro}
                y={altura - 5}
                textAnchor={primeiro ? 'start' : ultimo ? 'end' : 'middle'}
                className="tabular fill-slate-400 text-[10px]"
              >
                {d.rotulo}
              </text>
            )
          })}

          <line
            x1={margemEsq}
            y1={margemTopo + areaAltura}
            x2={largura}
            y2={margemTopo + areaAltura}
            stroke={EIXO}
            strokeWidth={1}
          />
        </svg>
      )}
      <Balao dica={dica} largura={largura} />
    </div>
  )
}

/* ====================================================================== */

export type PontoBarra = { chave: string | number; rotulo: string; valor: number; nota?: string }

/**
 * Ranking horizontal. Vai para horizontal justamente porque os nomes são longos
 * (nome de loja, categoria) — em coluna eles virariam texto na diagonal.
 */
export function BarrasRanking({
  dados,
  formatar = (v: number) => inteiroBr.format(v),
  maximo = 8,
  aoClicar,
}: {
  dados: PontoBarra[]
  formatar?: (v: number) => string
  maximo?: number
  aoClicar?: (chave: string | number) => void
}) {
  const visiveis = dados.slice(0, maximo)

  if (visiveis.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">Sem dados no período.</p>
  }

  const teto = Math.max(...visiveis.map((d) => d.valor), 1)

  return (
    <div className="space-y-2.5">
      {visiveis.map((d, i) => {
        const proporcao = d.valor / teto
        const Elemento = aoClicar ? 'button' : 'div'
        return (
          <Elemento
            key={d.chave}
            {...(aoClicar ? { onClick: () => aoClicar(d.chave), type: 'button' as const } : {})}
            className={`block w-full text-left ${aoClicar ? 'cursor-pointer' : ''}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm text-slate-700">
                <span className="tabular mr-1.5 text-slate-400">{i + 1}.</span>
                {d.rotulo}
              </span>
              <span className="tabular shrink-0 text-sm font-semibold text-slate-900">
                {formatar(d.valor)}
              </span>
            </div>
            {/* ponta arredondada em 4px, reta na base do eixo — mesma regra da coluna */}
            <div className="mt-1 h-2.5 w-full rounded-sm bg-slate-100">
              <div
                className="h-full transition-[width] duration-500"
                style={{
                  width: `${Math.max(proporcao * 100, 1)}%`,
                  backgroundColor: i === 0 ? HUE : RECUO,
                  borderRadius: `0 ${RAIO}px ${RAIO}px 0`,
                }}
              />
            </div>
            {d.nota && <p className="mt-0.5 text-xs text-slate-500">{d.nota}</p>}
          </Elemento>
        )
      })}
    </div>
  )
}

/* ====================================================================== */

/** Faixa de 24h — leitura de "a que horas o centro enche". */
export function PorHora({ dados }: { dados: { hora: number; n: number }[] }) {
  const mapa = new Map(dados.map((d) => [d.hora, d.n]))
  const faixa = Array.from({ length: 15 }, (_, i) => i + 7) // 7h às 21h
  const pico = faixa.reduce((m, h) => ((mapa.get(h) ?? 0) > (mapa.get(m) ?? 0) ? h : m), faixa[0])

  return (
    <Colunas
      altura={130}
      intervaloRotulos={2}
      sufixoDica=" resgates"
      dados={faixa.map((h) => ({
        chave: String(h),
        rotulo: `${h}h`,
        valor: mapa.get(h) ?? 0,
        destaque: h === pico,
      }))}
    />
  )
}

/* Barra de progresso simples — trilho é um passo claro da mesma rampa, para o
   estado ser lido na barra inteira. */
export function Medidor({
  proporcao,
  rotulo,
  valor,
}: {
  proporcao: number
  rotulo: string
  valor: string
}) {
  const p = Math.max(0, Math.min(1, proporcao))
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-slate-600">{rotulo}</span>
        <span className="text-sm font-semibold text-slate-900">{valor}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-navy-100">
        <div
          className="h-full rounded-full bg-navy-700 transition-[width] duration-500"
          style={{ width: `${p * 100}%` }}
        />
      </div>
    </div>
  )
}
