import { useMemo } from 'react'

/*
  ─────────────────────────────────────────────────────────────
  CAPAS ILUSTRADAS
  ─────────────────────────────────────────────────────────────

  Toda loja e toda oferta ganham uma capa. São ilustrações geradas em SVG na
  hora — não são fotos.

  Por que ilustração e não foto de banco de imagens:

  1. É honesto. Foto de banco na ficha de uma loja fictícia sugere um
     estabelecimento real que não existe. Ilustração abstrata não finge nada.
  2. É offline. Nenhuma requisição a terceiro. O PWA abre no 4G do calçadão sem
     esperar CDN, e o custo é zero byte de imagem.
  3. É consistente. A capa nasce da cor da própria loja, então a identidade dela
     aparece na home, no mapa, no cartão e na ficha — sem ninguém subir arquivo.

  A composição é sempre a mesma: gradiente da cor da loja, três manchas suaves
  em deriva lenta, um glifo da categoria em baixo contraste e um facho diagonal.
  A variação vem de um hash do nome, então a mesma loja tem sempre a mesma capa.

  Quando as lojas reais entrarem com foto própria, este componente vira o
  fallback de quem ainda não subiu imagem.
*/

/** Hash estável — a mesma loja precisa ter sempre a mesma capa. */
function semente(texto: string): number {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/* ---------- glifos por categoria ----------
   Traço grosso e forma fechada: a capa aparece a 88px no cartão de lista, e
   desenho detalhado vira mancha nesse tamanho. */

const GLIFOS: Record<string, React.ReactNode> = {
  'Alimentação': (
    <g>
      <path d="M22 44h44v26a16 16 0 0 1-16 16H38a16 16 0 0 1-16-16V44Z" />
      <path d="M66 50h8a11 11 0 0 1 0 22h-8" />
      <path d="M34 30c0-6 6-6 6-12M46 30c0-6 6-6 6-12M58 30c0-6 6-6 6-12" />
    </g>
  ),
  'Moda e calçados': (
    <g>
      <path d="M18 74V44c0-3 2-5 5-5h6c2 8 8 12 15 12s13-4 15-12h6c3 0 5 2 5 5v30" />
      <path d="M18 74h52" />
      <path d="M30 39c0-9 6-16 14-16s14 7 14 16" />
    </g>
  ),
  'Beleza e estética': (
    <g>
      <circle cx="30" cy="66" r="10" />
      <circle cx="62" cy="66" r="10" />
      <path d="M37 59 68 22M55 59 24 22" />
    </g>
  ),
  'Saúde': (
    <g>
      <path d="M46 20v52M20 46h52" />
      <circle cx="46" cy="46" r="34" />
    </g>
  ),
  'Serviços': (
    <g>
      <path d="M60 22a16 16 0 0 0-14 24L22 70l8 8 24-24a16 16 0 0 0 20-22l-11 11-9-9 11-11a16 16 0 0 0-5-1Z" />
    </g>
  ),
  'Casa e decoração': (
    <g>
      <path d="M16 46 46 20l30 26" />
      <path d="M24 42v34h44V42" />
      <path d="M38 76V56h16v20" />
    </g>
  ),
  'Eletrônicos': (
    <g>
      <rect x="20" y="22" width="52" height="38" rx="4" />
      <path d="M32 74h28M46 60v14" />
    </g>
  ),
  'Lazer': (
    <g>
      <path d="M18 26h22a10 10 0 0 1 6 3 10 10 0 0 1 6-3h22v46H52a10 10 0 0 0-6 3 10 10 0 0 0-6-3H18V26Z" />
      <path d="M46 29v46" />
    </g>
  ),
  'Pet': (
    <g>
      <ellipse cx="46" cy="66" rx="17" ry="14" />
      <ellipse cx="24" cy="44" rx="8" ry="11" />
      <ellipse cx="68" cy="44" rx="8" ry="11" />
      <ellipse cx="36" cy="26" rx="8" ry="11" />
      <ellipse cx="58" cy="26" rx="8" ry="11" />
    </g>
  ),
  'Óticas e joalherias': (
    <g>
      <circle cx="26" cy="50" r="15" />
      <circle cx="66" cy="50" r="15" />
      <path d="M41 48c3-3 7-3 10 0M11 42l6-8M81 42l-6-8" />
    </g>
  ),
}

const GLIFO_PADRAO = (
  <g>
    <path d="M18 40V30a5 5 0 0 1 5-5h46a5 5 0 0 1 5 5v10a9 9 0 0 0 0 18v10a5 5 0 0 1-5 5H23a5 5 0 0 1-5-5V58a9 9 0 0 0 0-18Z" />
  </g>
)

/** Clareia ou escurece um hex. Serve para tirar o gradiente da própria cor da loja. */
function ajustar(hex: string, quanto: number): string {
  const limpo = hex.replace('#', '')
  const n = parseInt(limpo.length === 3 ? limpo.replace(/./g, '$&$&') : limpo, 16)
  const canal = (deslocamento: number) => {
    const v = (n >> deslocamento) & 255
    const novo = quanto > 0 ? v + (255 - v) * quanto : v * (1 + quanto)
    return Math.max(0, Math.min(255, Math.round(novo)))
  }
  return `#${[16, 8, 0].map((d) => canal(d).toString(16).padStart(2, '0')).join('')}`
}

export function Capa({
  nome,
  categoria,
  cor,
  className = '',
  glifoOpacidade = 0.22,
  animada = true,
}: {
  nome: string
  categoria: string
  cor: string
  className?: string
  glifoOpacidade?: number
  animada?: boolean
}) {
  const id = useMemo(() => `capa-${semente(nome + categoria)}`, [nome, categoria])
  const s = useMemo(() => semente(nome), [nome])

  /*
    A faixa do gradiente é estreita e puxa para o escuro de propósito. Clarear
    demais lava a cor: um rust #9A3412 vira bege e a loja perde a identidade
    justamente na miniatura, que é onde o morador reconhece a marca de relance.
    O mesmo vale para as manchas — opacidade alta transforma a capa em névoa.
  */
  const claro = ajustar(cor, 0.14)
  const escuro = ajustar(cor, -0.52)

  /* posições das manchas derivadas do hash: variedade sem aleatoriedade */
  const manchas = [
    { cx: 18 + (s % 30), cy: 20 + (s % 17), r: 34 + (s % 12), o: 0.16 },
    { cx: 74 - ((s >> 3) % 26), cy: 74 - ((s >> 5) % 20), r: 28 + ((s >> 7) % 14), o: 0.12 },
    { cx: 50 + ((s >> 11) % 34) - 17, cy: 46 + ((s >> 13) % 24) - 12, r: 20 + ((s >> 17) % 10), o: 0.09 },
  ]

  const glifo = GLIFOS[categoria] ?? GLIFO_PADRAO

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      role="presentation"
    >
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={claro} />
          <stop offset="0.55" stopColor={cor} />
          <stop offset="1" stopColor={escuro} />
        </linearGradient>
        <linearGradient id={`${id}-facho`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.03" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-c`}>
          <rect width="100" height="100" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${id}-c)`}>
        <rect width="100" height="100" fill={`url(#${id}-g)`} />

        {manchas.map((m, i) => (
          <circle
            key={i}
            cx={m.cx}
            cy={m.cy}
            r={m.r}
            fill="#fff"
            opacity={m.o}
            className={animada ? 'animate-flutuar' : undefined}
            style={
              animada
                ? { animationDelay: `${i * 1.4}s`, transformOrigin: `${m.cx}px ${m.cy}px` }
                : undefined
            }
          />
        ))}

        {/* glifo da categoria, deslocado para a direita e cortado pela borda */}
        <g
          transform={`translate(${34 + (s % 9)} ${16 + (s % 7)}) scale(0.62)`}
          fill="none"
          stroke="#fff"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={glifoOpacidade}
        >
          {glifo}
        </g>

        <path d="M-10 78 L52 -12 L78 -12 L16 78 Z" fill={`url(#${id}-facho)`} />
      </g>
    </svg>
  )
}

/** Selo do desconto, para pousar em cima da capa. */
export function SeloDesconto({
  texto,
  legenda,
  className = '',
}: {
  texto: string
  legenda?: string
  className?: string
}) {
  return (
    <span
      className={`inline-flex flex-col items-center justify-center rounded-2xl bg-white/95 px-3 py-2 shadow-media backdrop-blur ${className}`}
    >
      <span className="text-xl leading-none font-extrabold tracking-tight text-slate-900">
        {texto}
      </span>
      {legenda && (
        <span className="mt-0.5 text-[9px] leading-none font-bold tracking-wider text-slate-500 uppercase">
          {legenda}
        </span>
      )}
    </span>
  )
}

/** Monograma da loja — usado onde a capa cheia não cabe. */
export function Monograma({
  nome,
  cor,
  className = 'h-11 w-11 text-xs',
}: {
  nome: string
  cor: string
  className?: string
}) {
  const iniciais = nome
    .split(/\s+/)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-suave ${className}`}
      style={{ background: `linear-gradient(135deg, ${ajustar(cor, 0.2)}, ${ajustar(cor, -0.25)})` }}
    >
      {iniciais || nome.slice(0, 2).toUpperCase()}
    </span>
  )
}
