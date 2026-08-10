import { useEffect, useRef, useState, type ReactNode } from 'react'

/*
  Peças de movimento e de espera.

  Regra que vale para as três: nenhuma delas pode ser a razão de a tela demorar.
  A revelação usa IntersectionObserver (não `scroll`), a contagem usa
  requestAnimationFrame com uma curva que assenta, e o esqueleto é CSS puro.
  Todas caem para o estado final imediato quando o sistema pede menos movimento.
*/

const menosMovimento = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Revela o conteúdo quando ele entra na tela. Anima uma vez só. */
export function Revelar({
  children,
  atraso = 0,
  className = '',
}: {
  children: ReactNode
  atraso?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    if (menosMovimento()) {
      setVisivel(true)
      return
    }
    const alvo = ref.current
    if (!alvo) return

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisivel(true)
          observador.disconnect() // anima uma vez; reanimar ao rolar de volta enjoa
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    )
    observador.observe(alvo)

    /*
      Rede de segurança. Se o elemento nascer fora da viewport de um jeito que o
      observer não cobre — dentro de um carrossel horizontal, por exemplo — ele
      ficaria invisível para sempre. Conteúdo escondido por causa de animação é
      pior que animação nenhuma, então depois de 1,2s ele aparece de qualquer
      forma.
    */
    const salvaguarda = window.setTimeout(() => {
      setVisivel(true)
      observador.disconnect()
    }, 1200)

    return () => {
      observador.disconnect()
      window.clearTimeout(salvaguarda)
    }
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visivel ? 1 : 0,
        transform: visivel ? 'none' : 'translate3d(0, 18px, 0)',
        transition: `opacity 0.55s var(--ease-saida) ${atraso}ms, transform 0.55s var(--ease-saida) ${atraso}ms`,
      }}
    >
      {children}
    </div>
  )
}

/**
 * Conta de zero até o valor. Usada nas figuras que abrem tela — a economia
 * acumulada do morador e os números do relatório da ACIL.
 *
 * A curva é expo-out: o número dispara e desacelera na chegada, que é o que faz
 * a contagem parecer um resultado sendo apurado em vez de um contador de posto.
 */
export function useContagem(alvo: number, duracao = 1100): number {
  const [valor, setValor] = useState(() => (menosMovimento() ? alvo : 0))
  const anterior = useRef(0)

  useEffect(() => {
    if (menosMovimento() || !Number.isFinite(alvo)) {
      setValor(alvo)
      return
    }

    const de = anterior.current
    const inicio = performance.now()
    let quadro = 0

    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao)
      const curva = 1 - Math.pow(1 - t, 4)
      setValor(de + (alvo - de) * curva)
      if (t < 1) quadro = requestAnimationFrame(passo)
      else anterior.current = alvo
    }

    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [alvo, duracao])

  return valor
}

/** Anel de contagem regressiva do cupom. */
export function AnelProgresso({
  proporcao,
  tamanho = 168,
  espessura = 6,
  cor = '#ffffff',
  fundo = 'rgba(255,255,255,0.18)',
  children,
}: {
  proporcao: number
  tamanho?: number
  espessura?: number
  cor?: string
  fundo?: string
  children?: ReactNode
}) {
  const p = Math.max(0, Math.min(1, proporcao))
  const raio = (tamanho - espessura) / 2
  const volta = 2 * Math.PI * raio

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={tamanho} height={tamanho} className="-rotate-90" aria-hidden="true">
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke={fundo}
          strokeWidth={espessura}
        />
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke={cor}
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={volta}
          strokeDashoffset={volta * (1 - p)}
          /* linear de propósito: relógio que acelera ou freia mente sobre o tempo */
          style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

/* ---------- espera ----------
   Esqueleto no lugar de rodinha: a tela já mostra a forma do que vem, então a
   chegada do conteúdo não reorganiza nada e a espera parece mais curta. */

export function Esqueleto({ className = '' }: { className?: string }) {
  return <div className={`esqueleto rounded-lg ${className}`} />
}

export function EsqueletoCartaoOferta() {
  return (
    <div className="flex gap-3 overflow-hidden rounded-2xl bg-white p-3 shadow-suave">
      <Esqueleto className="h-[88px] w-[88px] shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2 py-1">
        <Esqueleto className="h-3 w-24" />
        <Esqueleto className="h-4 w-full" />
        <Esqueleto className="h-4 w-2/3" />
        <Esqueleto className="h-5 w-20 rounded-full" />
      </div>
    </div>
  )
}

export function EsqueletoHome() {
  return (
    <div className="space-y-6 px-4 pt-5" aria-busy="true" aria-label="Carregando ofertas">
      <div className="flex gap-3 overflow-hidden">
        <Esqueleto className="h-56 w-64 shrink-0 rounded-3xl" />
        <Esqueleto className="h-56 w-64 shrink-0 rounded-3xl" />
      </div>
      <div className="space-y-2.5">
        {[0, 1, 2, 3].map((i) => (
          <EsqueletoCartaoOferta key={i} />
        ))}
      </div>
    </div>
  )
}

export function EsqueletoPainel({ colunas = 4 }: { colunas?: number }) {
  /* classe escrita por extenso: o Tailwind varre o código como texto e não
     enxerga `lg:grid-cols-${n}` montado em tempo de execução */
  const grade = colunas === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'

  return (
    <div className="space-y-5" aria-busy="true" aria-label="Carregando painel">
      <div className={`grid grid-cols-2 gap-3 ${grade}`}>
        {Array.from({ length: colunas }, (_, i) => (
          <Esqueleto key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Esqueleto className="h-64 rounded-2xl" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Esqueleto className="h-56 rounded-2xl" />
        <Esqueleto className="h-56 rounded-2xl" />
      </div>
    </div>
  )
}
