import { useEffect, useRef } from 'react'

/*
  ─────────────────────────────────────────────────────────────
  DOCK MENISCUS
  ─────────────────────────────────────────────────────────────

  A barra inferior com uma bola encaixada num recorte que é, literalmente, o
  contorno da própria bola.

  A geometria não é desenhada no olho: o recorte central usa o MESMO raio da
  bola, e um filete tangente ao plano da barra e ao círculo da bola costura os
  dois sem quina. A tangência é resolvida analiticamente em calcularGeometria()
  — por isso a bola encaixa em vez de flutuar sobre um entalhe aproximado.
  Uma posição só (bx) alimenta o recorte e a bola, então os dois não têm como se
  desencontrar.

  ── O QUE MUDOU EM RELAÇÃO À VERSÃO DO chic-vendas ──

  Lá o requestAnimationFrame se reagenda incondicionalmente: o laço roda a 60fps
  enquanto a aba estiver aberta, mesmo com a bola parada. Num painel de gestão
  que se abre no desktop de propósito, tudo bem. Aqui é um PWA que o morador
  instala e deixa no bolso — 60fps eternos são bateria indo embora sem nada
  acontecendo na tela.

  Então o laço DORME. Quando a mola assenta (velocidade e distância abaixo de
  meio pixel), ele encaixa no destino, desenha o último quadro e para. Qualquer
  interação — toque, arrasto, troca de aba, redimensionamento — chama acordar().
  Em repouso o custo é exatamente zero.

  E com `prefers-reduced-motion` a mola não existe: a bola salta direto para a
  aba, sem quadro nenhum.
*/

const RAIO_BOLA = 28 // raio da bola — e do recorte, idênticos de propósito
const CENTRO_Y = 33 // profundidade do centro da bola = metade da barra
const RAIO_FILETE = 12 // filete que costura o plano ao recorte
const ALTURA_BARRA = 66
const CANTO = 33 // pílula completa (metade da altura)
const FOLGA_TOPO = 24 // espaço acima da barra para o rótulo

const MOLA_K = 0.22
const AMORTECIMENTO = 0.72
const REPOUSO = 0.4 // px: abaixo disso a mola assentou e o laço dorme

type Circulo = { c: { x: number; y: number }; r: number; a0: number; a1: number }

function calcularGeometria() {
  const R = RAIO_BOLA
  const D = CENTRO_Y
  const rf = RAIO_FILETE

  const distFC = R + rf // filete e recorte são tangentes externos
  const dy = rf - D
  const fx0 = Math.sqrt(Math.max(distFC * distFC - dy * dy, 1))

  const centroFilete = { x: -fx0, y: rf } // tangente ao plano y=0 em (-fx0, 0)
  const centroRecorte = { x: 0, y: D } // o próprio centro da bola

  const dx = centroRecorte.x - centroFilete.x
  const dyy = centroRecorte.y - centroFilete.y
  const dist = Math.hypot(dx, dyy)
  const T = {
    x: centroFilete.x + (dx / dist) * rf,
    y: centroFilete.y + (dyy / dist) * rf,
  } // ponto de tangência

  const filete: Circulo = {
    c: centroFilete,
    r: rf,
    a0: -Math.PI / 2,
    a1: Math.atan2(T.y - centroFilete.y, T.x - centroFilete.x),
  }
  const recorte: Circulo = {
    c: centroRecorte,
    r: R,
    a0: Math.atan2(T.y - centroRecorte.y, T.x - centroRecorte.x),
    a1: -Math.PI / 2,
  }
  return { fx0, filete, recorte }
}

function amostrarArco(circulo: Circulo, passos: number) {
  const pts: [number, number][] = []
  for (let i = 0; i <= passos; i++) {
    const t = i / passos
    const a = circulo.a0 + (circulo.a1 - circulo.a0) * t
    pts.push([circulo.c.x + circulo.r * Math.cos(a), circulo.c.y + circulo.r * Math.sin(a)])
  }
  return pts
}

const GEO = calcularGeometria()
const METADE_ESQ = amostrarArco(GEO.filete, 10).concat(amostrarArco(GEO.recorte, 20))
// metade direita = espelho da esquerda, invertida para a sequência seguir para fora
const METADE_DIR = METADE_ESQ.slice(0, -1)
  .reverse()
  .map(([x, y]) => [-x, y] as [number, number])
const CURVA = METADE_ESQ.concat(METADE_DIR)
const FX0 = GEO.fx0

const limitar = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

export type ItemDock = {
  id: string
  rotulo: string
  Icone: (p: { className?: string }) => React.ReactElement
}

export function Dock({
  itens,
  ativo,
  aoTrocar,
}: {
  itens: ItemDock[]
  ativo: string
  aoTrocar: (id: string) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const abasRef = useRef<HTMLDivElement>(null)
  const camadaIconesRef = useRef<HTMLDivElement>(null)
  const bolaRef = useRef<HTMLDivElement>(null)
  const rotuloRef = useRef<HTMLDivElement>(null)

  // estado de animação fica em ref: muda a 60fps, não pode virar render
  const alvo = useRef(0)
  const atual = useRef(0)
  const veloc = useRef(0)
  const arrastando = useRef(false)
  const indiceAtual = useRef(-1)
  const larguraBarra = useRef(0)
  const minBx = useRef(0)
  const maxBx = useRef(0)
  const topoBarra = useRef(0)
  const acordarRef = useRef<() => void>(() => {})
  const aoTrocarRef = useRef(aoTrocar)
  const itensRef = useRef(itens)

  aoTrocarRef.current = aoTrocar
  itensRef.current = itens

  useEffect(() => {
    const wrap = wrapRef.current
    const svg = svgRef.current
    const path = pathRef.current
    const abasEl = abasRef.current
    const camada = camadaIconesRef.current
    const bola = bolaRef.current
    if (!wrap || !svg || !path || !abasEl || !camada || !bola) return

    const semMola = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const abas = () => Array.from(abasEl.querySelectorAll<HTMLButtonElement>('[data-aba]'))
    const slots = () => Array.from(camada.querySelectorAll<HTMLElement>('[data-slot]'))

    function medir() {
      if (!abasEl || !svg || !camada || !wrap) return
      const n = itensRef.current.length
      const largura = abasEl.getBoundingClientRect().width
      if (largura <= 0 || largura < FX0 * 2.2) return // layout ainda não assentou

      /*
        A bola só pode passear entre minBx e maxBx (senão o recorte invadiria o
        canto arredondado da pílula). Numa tela estreita, os centros das abas
        distribuídos por igual cairiam FORA desse intervalo e a bola nunca
        alcançaria a primeira nem a última.

        Em vez de aceitar isso, empurramos as abas para dentro: com padding p, o
        centro da 1ª aba é p + (L-2p)/2n, e basta que ele alcance minBx.
        Resolvendo para p dá a conta abaixo — o dock se ajusta sozinho a qualquer
        largura, em vez de depender de a tela ser larga.
      */
      const minSemPad = CANTO + FX0 + 2
      const padNecessario = Math.max(0, Math.ceil((minSemPad - largura / (2 * n)) / (1 - 1 / n)))
      const padAtual = parseFloat(abasEl.style.paddingLeft || '0')
      if (Math.abs(padAtual - padNecessario) > 0.5) {
        abasEl.style.paddingLeft = `${padNecessario}px`
        abasEl.style.paddingRight = `${padNecessario}px`
        camada.style.paddingLeft = `${padNecessario}px`
        camada.style.paddingRight = `${padNecessario}px`
      }

      larguraBarra.current = largura
      svg.setAttribute('viewBox', `0 0 ${largura} ${ALTURA_BARRA}`)

      // a bola é posicionada a partir do topo do wrap, enquanto barra e ícones
      // ancoram embaixo — medir a diferença mantém os três travados juntos
      topoBarra.current = svg.getBoundingClientRect().top - wrap.getBoundingClientRect().top

      minBx.current = minSemPad
      maxBx.current = largura - CANTO - FX0 - 2
      if (minBx.current > maxBx.current) {
        minBx.current = maxBx.current = largura / 2
      }
    }

    /** Desenha a pílula com o recorte em bx e devolve o bx já limitado —
     *  fonte única da verdade para o recorte e para a bola. */
    function desenhar(x: number) {
      const bx = limitar(x, minBx.current, maxBx.current)
      const L = larguraBarra.current
      const r = CANTO
      const partes = [`M ${r} 0`, `L ${(bx - FX0).toFixed(2)} 0`]
      for (const [px, py] of CURVA) partes.push(`L ${(bx + px).toFixed(2)} ${py.toFixed(2)}`)
      partes.push(
        `L ${L - r} 0`,
        `A ${r} ${r} 0 0 1 ${L} ${r}`,
        `L ${L} ${ALTURA_BARRA - r}`,
        `A ${r} ${r} 0 0 1 ${L - r} ${ALTURA_BARRA}`,
        `L ${r} ${ALTURA_BARRA}`,
        `A ${r} ${r} 0 0 1 0 ${ALTURA_BARRA - r}`,
        `L 0 ${r}`,
        `A ${r} ${r} 0 0 1 ${r} 0`,
        'Z',
      )
      path!.setAttribute('d', partes.join(' '))
      return bx
    }

    function centroAba(i: number) {
      const lista = abas()
      if (!lista[i] || !abasEl) return larguraBarra.current / 2
      const r = lista[i].getBoundingClientRect()
      const base = abasEl.getBoundingClientRect()
      return (r.left + r.right) / 2 - base.left
    }

    function indiceMaisProximo(x: number) {
      let melhor = 0
      let menor = Infinity
      itensRef.current.forEach((_, i) => {
        const d = Math.abs(centroAba(i) - x)
        if (d < menor) {
          menor = d
          melhor = i
        }
      })
      return melhor
    }

    function atualizarAtivo(i: number) {
      if (i === indiceAtual.current) return
      const anterior = indiceAtual.current
      indiceAtual.current = i

      abas().forEach((b, j) => {
        b.setAttribute('aria-selected', j === i ? 'true' : 'false')
        b.tabIndex = j === i ? -1 : 0
      })
      // a camada de ícones é fixa: só a cor reage, ela nunca se move
      slots().forEach((s, j) => s.classList.toggle('ativo', j === i))
      if (rotuloRef.current) rotuloRef.current.textContent = itensRef.current[i]?.rotulo ?? ''

      if (anterior !== -1 && itensRef.current[i]) aoTrocarRef.current(itensRef.current[i].id)
    }

    function posicionarBola(bx: number, velocidade: number) {
      // squash & stretch proporcional à velocidade — a bola parece ter massa
      const v = limitar(Math.abs(velocidade), 0, 26)
      const estica = 1 + v * 0.014
      const achata = 1 - v * 0.009
      bola!.style.transform =
        `translate(${(bx - RAIO_BOLA).toFixed(2)}px, ${(topoBarra.current + CENTRO_Y - RAIO_BOLA).toFixed(2)}px)` +
        ` scaleX(${estica}) scaleY(${achata})`
      if (rotuloRef.current) {
        rotuloRef.current.style.transform = `translateX(${bx.toFixed(2)}px) translateX(-50%)`
      }
    }

    let raf = 0

    function quadro() {
      const forca = (alvo.current - atual.current) * MOLA_K
      veloc.current = (veloc.current + forca) * AMORTECIMENTO
      atual.current += veloc.current

      const bx = desenhar(atual.current)
      posicionarBola(bx, veloc.current)
      atualizarAtivo(indiceMaisProximo(bx))

      /*
        O laço dorme aqui. Sem esta guarda o rAF se reagenda para sempre e o app
        gasta 60fps de CPU com a bola imóvel — o custo real do dock não são os
        bytes, é isto.
      */
      const assentou =
        Math.abs(veloc.current) < REPOUSO && Math.abs(alvo.current - atual.current) < REPOUSO

      if (assentou && !arrastando.current) {
        atual.current = alvo.current
        veloc.current = 0
        const finalBx = desenhar(atual.current)
        posicionarBola(finalBx, 0)
        atualizarAtivo(indiceMaisProximo(finalBx))
        raf = 0
        return
      }

      raf = requestAnimationFrame(quadro)
    }

    function acordar() {
      if (raf) return
      if (semMola) {
        // sem mola: encaixa no destino em um quadro só
        atual.current = alvo.current
        veloc.current = 0
        const bx = desenhar(atual.current)
        posicionarBola(bx, 0)
        atualizarAtivo(indiceMaisProximo(bx))
        return
      }
      raf = requestAnimationFrame(quadro)
    }
    acordarRef.current = acordar

    // ---- arrastar a bola ----
    const aoPressionar = (e: PointerEvent) => {
      arrastando.current = true
      bola.setPointerCapture(e.pointerId)
      acordar()
    }
    const aoMover = (e: PointerEvent) => {
      if (!arrastando.current || !abasEl) return
      const base = abasEl.getBoundingClientRect()
      alvo.current = limitar(e.clientX - base.left, minBx.current, maxBx.current)
      acordar()
    }
    const aoSoltar = () => {
      if (!arrastando.current) return
      arrastando.current = false
      alvo.current = centroAba(indiceAtual.current) // encaixa no slot mais próximo
      acordar()
    }

    bola.addEventListener('pointerdown', aoPressionar)
    window.addEventListener('pointermove', aoMover)
    window.addEventListener('pointerup', aoSoltar)
    window.addEventListener('pointercancel', aoSoltar)

    const aoClicar = (e: Event) => {
      const btn = (e.target as HTMLElement).closest('[data-aba]') as HTMLButtonElement | null
      if (!btn) return
      alvo.current = centroAba(Number(btn.dataset.aba))
      acordar()
    }
    abasEl.addEventListener('click', aoClicar)

    function iniciar() {
      medir()
      const i = Math.max(0, itensRef.current.findIndex((t) => t.id === ativo))
      alvo.current = centroAba(i)
      atual.current = alvo.current
      indiceAtual.current = -1
      atualizarAtivo(i)
      const bx = desenhar(atual.current)
      posicionarBola(bx, 0)
    }

    function ressincronizar() {
      medir()
      alvo.current = centroAba(indiceAtual.current === -1 ? 0 : indiceAtual.current)
      acordar()
    }

    iniciar()

    const ro = new ResizeObserver(ressincronizar)
    ro.observe(abasEl)
    window.addEventListener('resize', ressincronizar)
    // as fontes mudam a largura das abas ao carregar — remedir depois delas
    document.fonts?.ready.then(ressincronizar).catch(() => {})

    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', ressincronizar)
      window.removeEventListener('pointermove', aoMover)
      window.removeEventListener('pointerup', aoSoltar)
      window.removeEventListener('pointercancel', aoSoltar)
      bola.removeEventListener('pointerdown', aoPressionar)
      abasEl.removeEventListener('click', aoClicar)
    }
    // o dock se monta uma vez; troca de aba vinda de fora entra pelo efeito abaixo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // navegação disparada por fora (ex.: "ver as lojas no mapa" no fim da home)
  useEffect(() => {
    const i = itens.findIndex((t) => t.id === ativo)
    if (i < 0 || i === indiceAtual.current) return
    const lista = abasRef.current?.querySelectorAll<HTMLButtonElement>('[data-aba]')
    const alvoEl = lista?.[i]
    const base = abasRef.current?.getBoundingClientRect()
    if (!alvoEl || !base) return
    const r = alvoEl.getBoundingClientRect()
    alvo.current = (r.left + r.right) / 2 - base.left
    acordarRef.current()
  }, [ativo, itens])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div
        ref={wrapRef}
        className="pointer-events-auto relative w-full max-w-md"
        style={{ height: ALTURA_BARRA + FOLGA_TOPO }}
      >
        <div
          ref={rotuloRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 rounded-full bg-roxo-700 px-2.5 py-[3px]
            text-[10px] font-bold tracking-[0.14em] whitespace-nowrap text-white uppercase shadow-media"
        />

        <svg
          ref={svgRef}
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 z-10 w-full overflow-visible"
          style={{
            height: ALTURA_BARRA,
            filter: 'drop-shadow(0 14px 26px rgba(74,26,148,.22))',
          }}
        >
          <defs>
            <linearGradient id="placaDock" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#f8fafc" />
            </linearGradient>
          </defs>
          <path ref={pathRef} fill="url(#placaDock)" stroke="#4a1a9414" strokeWidth="1" />
        </svg>

        {/* botões reais: clique, teclado e leitor de tela. O ícone deles fica
            invisível — quem desenha é a camada fixa abaixo. */}
        <div
          ref={abasRef}
          className="absolute inset-x-0 bottom-0 z-20 flex"
          style={{ height: ALTURA_BARRA }}
        >
          {itens.map((t, i) => (
            <button
              key={t.id}
              data-aba={i}
              type="button"
              role="tab"
              aria-label={t.rotulo}
              aria-selected={t.id === ativo}
              className="flex-1 cursor-pointer rounded-full opacity-0 focus-visible:opacity-100
                focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-roxo-600"
            >
              <span className="sr-only">{t.rotulo}</span>
            </button>
          ))}
        </div>

        {/* camada de ícones: sempre visível, sempre na mesma linha, nunca se move.
            É a bola que se alinha a ELA, e não o contrário. */}
        <div
          ref={camadaIconesRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex"
          style={{ height: ALTURA_BARRA }}
        >
          {itens.map((t) => (
            <div
              key={t.id}
              data-slot
              className="grupo-icone flex flex-1 items-center justify-center"
            >
              <t.Icone className="h-[22px] w-[22px]" />
            </div>
          ))}
        </div>

        <div
          ref={bolaRef}
          className="absolute top-0 left-0 z-20 cursor-grab rounded-full active:cursor-grabbing"
          style={{
            width: RAIO_BOLA * 2,
            height: RAIO_BOLA * 2,
            touchAction: 'none',
            willChange: 'transform',
            background: 'radial-gradient(circle at 32% 26%, #a582fc, #6d28d9 58%, #4a1a94 100%)',
            boxShadow: '0 10px 20px -8px rgba(109,40,217,.6)',
          }}
          role="presentation"
        />
      </div>

      <style>{`
        .grupo-icone { color: var(--color-slate-400); transition: color .35s ease; }
        .grupo-icone.ativo { color: #ffffff; }
      `}</style>
    </div>
  )
}
