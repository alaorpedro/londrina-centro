import { useEffect, useRef, type ReactNode } from 'react'
import { Alerta, Check, Fechar, Info, Seta } from './Icones'

/* ---------- botão ---------- */

type VarianteBotao = 'primario' | 'secundario' | 'fantasma' | 'perigo' | 'claro' | 'sobreCor'

/*
  `sobreCor` existe para os botões que ficam em cima de um fundo colorido (a tela
  verde de cupom validado, a vermelha de erro, a faixa roxa de assinatura).

  Não dá para resolver isso passando `bg-white text-...` no className: as duas
  classes disputam a mesma propriedade com a da variante, e quem ganha é a que
  aparece depois no CSS gerado, não a que aparece depois no atributo. O botão sai
  branco no branco e some. Uma variante fecha a questão.
*/
const VARIANTES: Record<VarianteBotao, string> = {
  primario:
    'bg-navy-700 text-white shadow-media hover:bg-navy-800 hover:shadow-alta active:bg-navy-900',
  secundario: 'bg-white text-slate-800 shadow-suave hover:bg-slate-50 hover:shadow-media',
  fantasma: 'text-navy-700 hover:bg-navy-50',
  perigo: 'bg-white text-red-700 shadow-suave ring-1 ring-red-100 hover:bg-red-50',
  claro: 'bg-navy-100 text-navy-800 hover:bg-navy-200',
  sobreCor: 'bg-white text-slate-900 shadow-media hover:bg-slate-50 hover:shadow-alta',
}

export function Botao({
  children,
  variante = 'primario',
  largo = false,
  grande = false,
  carregando = false,
  className = '',
  ...resto
}: {
  children: ReactNode
  variante?: VarianteBotao
  largo?: boolean
  grande?: boolean
  carregando?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...resto}
      disabled={resto.disabled || carregando}
      className={`pressionavel inline-flex items-center justify-center gap-2 rounded-xl font-bold
        transition-colors disabled:pointer-events-none disabled:opacity-45
        ${grande ? 'px-6 py-4 text-base' : 'px-4 py-2.5 text-sm'}
        ${largo ? 'w-full' : ''} ${VARIANTES[variante]} ${className}`}
    >
      {carregando && <Girando />}
      {children}
    </button>
  )
}

export function Girando({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/* ---------- campos ---------- */

export function Campo({
  rotulo,
  dica,
  erro,
  className = '',
  ...resto
}: {
  rotulo: string
  dica?: string
  erro?: string | null
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{rotulo}</span>
      <input
        {...resto}
        className={`w-full rounded-xl bg-white px-3.5 py-3 text-base shadow-suave outline-none transition
          placeholder:text-slate-400 focus:ring-2
          ${erro ? 'ring-1 ring-red-300 focus:ring-red-400' : 'focus:ring-navy-300'}`}
      />
      {erro ? (
        <span className="mt-1.5 block text-sm font-medium text-red-600">{erro}</span>
      ) : dica ? (
        <span className="mt-1.5 block text-sm text-slate-500">{dica}</span>
      ) : null}
    </label>
  )
}

export function Selecao({
  rotulo,
  children,
  className = '',
  ...resto
}: { rotulo: string; children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{rotulo}</span>
      <select
        {...resto}
        className="w-full rounded-xl bg-white px-3.5 py-3 text-base shadow-suave outline-none
          transition focus:ring-2 focus:ring-navy-300"
      >
        {children}
      </select>
    </label>
  )
}

export function AreaTexto({
  rotulo,
  dica,
  className = '',
  ...resto
}: { rotulo: string; dica?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{rotulo}</span>
      <textarea
        {...resto}
        className="w-full rounded-xl bg-white px-3.5 py-3 text-base shadow-suave outline-none
          transition placeholder:text-slate-400 focus:ring-2 focus:ring-navy-300"
      />
      {dica && <span className="mt-1.5 block text-sm text-slate-500">{dica}</span>}
    </label>
  )
}

/* ---------- avisos ----------
   Nenhuma barreira do sistema chega ao usuário como erro técnico. Toda regra que
   bloqueia vira uma frase aqui dentro. */

type TipoAviso = 'erro' | 'sucesso' | 'atencao' | 'info'

const AVISOS: Record<TipoAviso, { caixa: string; icone: ReactNode; bolha: string }> = {
  erro: {
    caixa: 'bg-red-50 text-red-800 ring-red-100',
    bolha: 'bg-red-100 text-red-600',
    icone: <Alerta className="w-5 h-5 shrink-0" />,
  },
  sucesso: {
    caixa: 'bg-emerald-50 text-emerald-900 ring-emerald-100',
    bolha: 'bg-emerald-100 text-emerald-600',
    icone: <Check className="w-5 h-5 shrink-0" />,
  },
  atencao: {
    caixa: 'bg-amber-50 text-amber-900 ring-amber-100',
    bolha: 'bg-amber-100 text-amber-600',
    icone: <Alerta className="w-5 h-5 shrink-0" />,
  },
  info: {
    caixa: 'bg-navy-50 text-navy-900 ring-navy-100',
    bolha: 'bg-navy-100 text-navy-600',
    icone: <Info className="w-5 h-5 shrink-0" />,
  },
}

export function Aviso({
  tipo = 'info',
  children,
  className = '',
}: {
  tipo?: TipoAviso
  children: ReactNode
  className?: string
}) {
  if (!children) return null
  const v = AVISOS[tipo]
  return (
    <div
      role={tipo === 'erro' ? 'alert' : 'status'}
      className={`animate-entrar flex items-start gap-2.5 rounded-2xl px-3.5 py-3 text-sm leading-relaxed ring-1 ${v.caixa} ${className}`}
    >
      <span className="mt-px shrink-0">{v.icone}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/* ---------- popup de barreira ----------
   Quando a regra impede a ação (cupom esgotado, já usado, fora do horário), o
   usuário merece uma tela que explica o motivo e diz o que fazer a seguir — não
   um toast que some antes de ser lido. */

export function Popup({
  titulo,
  children,
  tipo = 'atencao',
  aoFechar,
  acao,
}: {
  titulo: string
  children: ReactNode
  tipo?: TipoAviso
  aoFechar: () => void
  acao?: { texto: string; ao: () => void }
}) {
  const caixaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const escutar = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', escutar)
    caixaRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', escutar)
      document.body.style.overflow = ''
    }
  }, [aoFechar])

  const v = AVISOS[tipo]

  return (
    <div
      className="animate-entrar fixed inset-0 z-50 flex items-end justify-center bg-navy-950/55 p-4 backdrop-blur-sm sm:items-center"
      onClick={aoFechar}
    >
      <div
        ref={caixaRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="animate-escala w-full max-w-sm rounded-3xl bg-white p-6 shadow-flutuante outline-none"
      >
        <div
          className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${v.bolha}`}
        >
          {v.icone}
        </div>
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{titulo}</h2>
        <div className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{children}</div>
        <div className="mt-5 flex gap-2">
          {acao && (
            <Botao largo onClick={acao.ao}>
              {acao.texto}
            </Botao>
          )}
          <Botao largo variante={acao ? 'secundario' : 'primario'} onClick={aoFechar}>
            {acao ? 'Agora não' : 'Entendi'}
          </Botao>
        </div>
      </div>
    </div>
  )
}

/* ---------- estruturas ---------- */

export function Cartao({
  children,
  className = '',
  ...resto
}: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  /* profundidade por sombra, não por borda: cartão é objeto sobre a superfície,
     e borda cinza em tudo deixa a tela com cara de planilha */
  return (
    <div {...resto} className={`rounded-2xl bg-white shadow-suave ${className}`}>
      {children}
    </div>
  )
}

export function Etiqueta({
  children,
  cor = 'cinza',
  className = '',
}: {
  children: ReactNode
  cor?: 'cinza' | 'navy' | 'verde' | 'vermelho' | 'azul'
  className?: string
}) {
  const cores = {
    cinza: 'bg-slate-100 text-slate-700',
    navy: 'bg-navy-100 text-navy-800',
    verde: 'bg-verde-100 text-verde-700',
    vermelho: 'bg-red-100 text-red-700',
    azul: 'bg-sky-100 text-sky-800',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap
        ${cores[cor]} ${className}`}
    >
      {children}
    </span>
  )
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
      <Girando className="w-7 h-7" />
      <p className="animate-pulsar text-sm">{texto}</p>
    </div>
  )
}

export function Vazio({
  icone,
  titulo,
  children,
}: {
  icone?: ReactNode
  titulo: string
  children?: ReactNode
}) {
  return (
    <div className="animate-surgir flex flex-col items-center justify-center px-6 py-16 text-center">
      {icone && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-50 text-navy-300">
          {icone}
        </div>
      )}
      <h3 className="font-bold text-slate-700">{titulo}</h3>
      {children && <p className="mt-1 max-w-xs text-sm leading-relaxed text-slate-500">{children}</p>}
    </div>
  )
}

export function BarraTopo({
  titulo,
  aoVoltar,
  acao,
  transparente = false,
}: {
  titulo: string
  aoVoltar?: () => void
  acao?: ReactNode
  transparente?: boolean
}) {
  return (
    <header
      className={`sticky top-0 z-30 flex items-center gap-2 px-2 py-3 ${
        transparente ? '' : 'vidro shadow-plano'
      }`}
    >
      {aoVoltar && (
        <button
          onClick={aoVoltar}
          aria-label="Voltar"
          className={`pressionavel rounded-xl p-2 ${
            transparente
              ? 'bg-slate-900/25 text-white backdrop-blur hover:bg-slate-900/40'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Seta />
        </button>
      )}
      <h1
        className={`min-w-0 flex-1 truncate font-bold ${aoVoltar ? '' : 'px-2'} ${
          transparente ? 'sr-only' : 'text-slate-900'
        }`}
      >
        {titulo}
      </h1>
      {acao}
    </header>
  )
}

/** Painel deslizante para formulários longos no admin e no lojista. */
export function Folha({
  titulo,
  aberto,
  aoFechar,
  children,
  largura = 'max-w-lg',
}: {
  titulo: string
  aberto: boolean
  aoFechar: () => void
  children: ReactNode
  largura?: string
}) {
  useEffect(() => {
    if (!aberto) return
    const escutar = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', escutar)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', escutar)
      document.body.style.overflow = ''
    }
  }, [aberto, aoFechar])

  if (!aberto) return null

  return (
    <div
      className="animate-entrar fixed inset-0 z-50 flex justify-end bg-navy-950/50 backdrop-blur-sm"
      onClick={aoFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className={`flex h-full w-full ${largura} flex-col bg-slate-50 shadow-flutuante`}
        style={{ animation: 'entrar 0.35s var(--ease-saida) both' }}
      >
        <header className="vidro flex items-center justify-between px-5 py-4 shadow-plano">
          <h2 className="font-extrabold tracking-tight text-slate-900">{titulo}</h2>
          <button
            onClick={aoFechar}
            aria-label="Fechar"
            className="pressionavel rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            <Fechar />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

/** Número grande com rótulo — o tijolo de todos os painéis. */
export function Indicador({
  rotulo,
  valor,
  detalhe,
  cor = 'text-slate-900',
  icone,
}: {
  rotulo: string
  valor: ReactNode
  detalhe?: ReactNode
  cor?: string
  icone?: ReactNode
}) {
  return (
    <Cartao className="elevavel p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">{rotulo}</p>
        {icone && <span className="text-slate-300">{icone}</span>}
      </div>
      {/* figuras proporcionais de propósito: tabular-nums dá a todo dígito a
          largura do zero e faz um número grande parecer frouxo. Tabular fica
          para coluna de tabela e marca de eixo, onde alinhar importa. */}
      <p className={`mt-1.5 text-2xl font-extrabold tracking-tight ${cor}`}>{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-slate-500">{detalhe}</p>}
    </Cartao>
  )
}
