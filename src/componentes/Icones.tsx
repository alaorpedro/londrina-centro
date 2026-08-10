/*
  Ícones em traço, 24×24, herdando `currentColor` e `stroke-width` 1.75.
  Conjunto pequeno de propósito: só o que as telas usam, sem biblioteca externa
  — o PWA carrega no 4G do centro, e cada dependência a menos é meio segundo a
  menos na primeira abertura.
*/

type Props = { className?: string }

const base = 'shrink-0'

function Svg({ children, className = 'w-5 h-5' }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${base} ${className}`}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const Casa = (p: Props) => (
  <Svg {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
  </Svg>
)

export const Mapa = (p: Props) => (
  <Svg {...p}>
    <path d="m9 4-6 2.5v13L9 17l6 3 6-2.5v-13L15 7 9 4Z" />
    <path d="M9 4v13M15 7v13" />
  </Svg>
)

export const Coracao = (p: Props) => (
  <Svg {...p}>
    <path d="M12 20s-7-4.6-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.6C19 15.4 12 20 12 20Z" />
  </Svg>
)

export const CoracaoCheio = ({ className = 'w-5 h-5' }: Props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={`${base} ${className}`} aria-hidden="true">
    <path d="M12 20s-7-4.6-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.6C19 15.4 12 20 12 20Z" />
  </svg>
)

export const Usuario = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </Svg>
)

export const Busca = (p: Props) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-3.6-3.6" />
  </Svg>
)

export const Seta = (p: Props) => (
  <Svg {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
)

export const SetaDireita = (p: Props) => (
  <Svg {...p}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
)

export const Raio = ({ className = 'w-5 h-5' }: Props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={`${base} ${className}`} aria-hidden="true">
    <path d="M13.5 2 4 13.2h5.6L9 22l9.6-11.4H13L13.5 2Z" />
  </svg>
)

export const Relogio = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
)

export const Cadeado = (p: Props) => (
  <Svg {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
  </Svg>
)

export const Check = (p: Props) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
)

export const CheckCirculo = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.5 12.2 2.4 2.4 4.6-4.9" />
  </Svg>
)

export const Alerta = (p: Props) => (
  <Svg {...p}>
    <path d="M12 4.5 2.8 20h18.4L12 4.5Z" />
    <path d="M12 10v4M12 17.2v.1" />
  </Svg>
)

export const Info = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5M12 8v.1" />
  </Svg>
)

export const Fechar = (p: Props) => (
  <Svg {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Svg>
)

export const Loja = (p: Props) => (
  <Svg {...p}>
    <path d="M4 9.5 5.4 4h13.2L20 9.5" />
    <path d="M4 9.5a2.6 2.6 0 0 0 4 2 2.6 2.6 0 0 0 4 0 2.6 2.6 0 0 0 4 0 2.6 2.6 0 0 0 4-2" />
    <path d="M5.5 11.8V20h13v-8.2" />
  </Svg>
)

export const Cupom = (p: Props) => (
  <Svg {...p}>
    <path d="M3 8.5V6.5a1.5 1.5 0 0 1 1.5-1.5h15A1.5 1.5 0 0 1 21 6.5v2a2.5 2.5 0 0 0 0 7v2a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-2a2.5 2.5 0 0 0 0-7Z" />
    <path d="M13 6.5v2M13 11v2M13 15.5v2" strokeDasharray="0.1 3" />
  </Svg>
)

export const Grafico = (p: Props) => (
  <Svg {...p}>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <path d="M8 16.5v-4M12.5 16.5V8M17 16.5v-6.5" />
  </Svg>
)

export const Local = (p: Props) => (
  <Svg {...p}>
    <path d="M12 21s7-5.5 7-11a7 7 0 0 0-14 0c0 5.5 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </Svg>
)

export const Sair = (p: Props) => (
  <Svg {...p}>
    <path d="M14 20H6a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 6 4h8" />
    <path d="M17 15.5 20.5 12 17 8.5M20 12H10" />
  </Svg>
)

export const Mais = (p: Props) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const Calendario = (p: Props) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 9.8h17M8 3.5v3M16 3.5v3" />
  </Svg>
)

export const Presente = (p: Props) => (
  <Svg {...p}>
    <rect x="3.5" y="9" width="17" height="11.5" rx="1.5" />
    <path d="M3.5 13.5h17M12 9v11.5" />
    <path d="M12 9S9.5 4 7.5 5.2 9 9 12 9Zm0 0s2.5-5 4.5-3.8S15 9 12 9Z" />
  </Svg>
)

export const Etiqueta = (p: Props) => (
  <Svg {...p}>
    <path d="M11.5 3.5H20v8.5l-8.7 8.7a1.5 1.5 0 0 1-2.1 0l-6.4-6.4a1.5 1.5 0 0 1 0-2.1l8.7-8.7Z" />
    <circle cx="16.2" cy="7.8" r="1.2" />
  </Svg>
)

export const Whatsapp = ({ className = 'w-5 h-5' }: Props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={`${base} ${className}`} aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1a13 13 0 0 1-6.9-6c-.5-.9-.8-1.8-.8-2.6 0-.9.5-1.4.7-1.6.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2 1.3 2.3 1.4.2.1.4.1.6-.1l.7-.9c.2-.2.3-.2.6-.1l2 1c.2.1.4.2.4.3.1.1.1.5-.1 1.1Z" />
  </svg>
)

export const Instagram = (p: Props) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
    <circle cx="12" cy="12" r="3.8" />
    <path d="M17 7v.1" />
  </Svg>
)

export const Engrenagem = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 14a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
  </Svg>
)

export const Baixar = (p: Props) => (
  <Svg {...p}>
    <path d="M12 4v11" />
    <path d="m8 11.5 4 4 4-4" />
    <path d="M5 19.5h14" />
  </Svg>
)

export const Pix = (p: Props) => (
  <Svg {...p}>
    <path d="m12 3 3.4 3.4a2.5 2.5 0 0 0 1.8.7h.6L21 10.4a2.3 2.3 0 0 1 0 3.2l-3.2 3.3h-.6a2.5 2.5 0 0 0-1.8.7L12 21l-3.4-3.4a2.5 2.5 0 0 0-1.8-.7h-.6L3 13.6a2.3 2.3 0 0 1 0-3.2l3.2-3.3h.6a2.5 2.5 0 0 0 1.8-.7L12 3Z" />
  </Svg>
)

export const Cartao = (p: Props) => (
  <Svg {...p}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
    <path d="M2.5 10h19M6 14.8h3" />
  </Svg>
)
