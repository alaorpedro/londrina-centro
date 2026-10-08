import type { Oferta } from '../tipos'
import { Capa, Monograma } from '../componentes/Capa'
import { Raio, Cadeado, Relogio, Local } from '../componentes/Icones'
import { reais } from '../formato'

/*
  ─────────────────────────────────────────────────────────────
  OS TRÊS CARTÕES
  ─────────────────────────────────────────────────────────────

  A home tem ritmo: um carrossel largo em cima, uma grade no meio e uma lista
  compacta embaixo. Cada um pede um cartão diferente, e é essa variação que
  impede a tela de virar um paredão de retângulos iguais.

    CartaoVitrine  carrossel de oportunidades — capa cheia, desconto gigante
    CartaoGrade    destaques em duas colunas — capa em cima, texto embaixo
    CartaoLista    o corpo do catálogo — capa pequena à esquerda

  Hierarquia igual nos três: DESCONTO primeiro, LOJA depois, título por último.
  Ninguém atravessa a cidade por causa de um título bonito; atravessa por causa
  do número.
*/

/*
  O selo entra numa miniatura de 88px. `reais()` devolveria "R$ 60,00" e os
  centavos empurram o texto para fora do quadrado — num desconto redondo eles
  também não informam nada. Aqui os centavos só aparecem quando existem.
*/
export function selo(oferta: Oferta): string {
  if (oferta.tipo === 'percentual') return `${formatar(oferta.valor_desconto)}%`
  if (oferta.tipo === 'valor_fixo') return `R$ ${formatar(oferta.valor_desconto)}`
  if (oferta.tipo === 'leve_pague') return '2×1'
  return 'Brinde'
}

export function legendaSelo(oferta: Oferta): string {
  if (oferta.tipo === 'brinde') return 'grátis'
  if (oferta.tipo === 'leve_pague') return 'leve+'
  return 'off'
}

function formatar(n: number) {
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',')
}

/* ---------- selo de relâmpago ---------- */

function Relampago({ compacto = false }: { compacto?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-verde-400 font-bold text-slate-900 uppercase shadow-suave ${
        compacto ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'
      }`}
    >
      <Raio className={compacto ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      relâmpago
    </span>
  )
}

/* ---------- 1. vitrine ---------- */

export function CartaoVitrine({ oferta, aoAbrir }: { oferta: Oferta; aoAbrir: () => void }) {
  const bloqueada = !oferta.disponivel

  return (
    <button
      onClick={aoAbrir}
      className="pressionavel elevavel group relative h-60 w-[17rem] shrink-0 overflow-hidden rounded-3xl text-left shadow-media"
    >
      <Capa
        nome={oferta.loja_nome}
        categoria={oferta.categoria}
        cor={oferta.cor}
        className="absolute inset-0 h-full w-full"
      />
      {/* véu de baixo para cima. O piso de 15% no topo existe porque o cartão da
          vitrine é grande: sem ele, uma loja de cor clara (âmbar, teal) deixa o
          selo de relâmpago e o cadeado sem contraste na metade de cima. */}
      <span className="absolute inset-0 bg-gradient-to-t from-slate-950/88 via-slate-950/40 to-slate-950/15" />

      <span className="absolute top-3 right-3 left-3 flex items-start justify-between gap-2">
        {oferta.relampago ? <Relampago /> : <span />}
        {bloqueada && (
          <span className="rounded-full bg-slate-900/55 p-1.5 text-white backdrop-blur">
            <Cadeado className="h-3.5 w-3.5" />
          </span>
        )}
      </span>

      <span className="absolute inset-x-0 bottom-0 p-4 text-white">
        <span className="texto-sobre-capa block text-[2.75rem] leading-none font-extrabold tracking-tight">
          {selo(oferta)}
          <span className="ml-1.5 align-super text-sm font-bold tracking-wide uppercase opacity-80">
            {legendaSelo(oferta)}
          </span>
        </span>
        <span className="texto-sobre-capa mt-2 block truncate text-xs font-bold tracking-wider uppercase opacity-90">
          {oferta.loja_nome}
        </span>
        <span className="texto-sobre-capa mt-0.5 line-clamp-2 block text-[15px] leading-snug font-semibold">
          {oferta.titulo}
        </span>
        {bloqueada && (
          <span className="mt-1.5 flex items-center gap-1 text-xs font-medium opacity-85">
            <Relogio className="h-3.5 w-3.5" />
            {oferta.motivo}
          </span>
        )}
      </span>
    </button>
  )
}

/* ---------- 2. grade ---------- */

export function CartaoGrade({ oferta, aoAbrir }: { oferta: Oferta; aoAbrir: () => void }) {
  const bloqueada = !oferta.disponivel

  return (
    <button
      onClick={aoAbrir}
      className={`pressionavel elevavel group flex flex-col overflow-hidden rounded-2xl bg-white text-left shadow-suave ${
        bloqueada ? 'opacity-80' : ''
      }`}
    >
      <span className="relative block h-28 w-full overflow-hidden">
        <Capa
          nome={oferta.loja_nome}
          categoria={oferta.categoria}
          cor={oferta.cor}
          className="absolute inset-0 h-full w-full"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" />
        <span className="texto-sobre-capa absolute bottom-2 left-3 text-2xl leading-none font-extrabold text-white">
          {selo(oferta)}
        </span>
        {oferta.relampago && (
          <span className="absolute top-2 right-2">
            <Relampago compacto />
          </span>
        )}
        {bloqueada && (
          <span className="absolute top-2 left-2 rounded-full bg-slate-900/55 p-1 text-white backdrop-blur">
            <Cadeado className="h-3 w-3" />
          </span>
        )}
      </span>

      <span className="flex min-w-0 flex-1 flex-col p-3">
        <span className="truncate text-[10px] font-bold tracking-wider text-slate-500 uppercase">
          {oferta.loja_nome}
        </span>
        <span className="mt-0.5 line-clamp-2 text-sm leading-snug font-bold text-slate-900">
          {oferta.titulo}
        </span>
        <span className="mt-auto pt-2 text-xs text-slate-500">
          {bloqueada ? oferta.motivo : `economia de ${reais(oferta.economia_estimada)}`}
        </span>
      </span>
    </button>
  )
}

/* ---------- 3. lista ---------- */

export function CartaoLista({ oferta, aoAbrir }: { oferta: Oferta; aoAbrir: () => void }) {
  const bloqueada = !oferta.disponivel

  return (
    <button
      onClick={aoAbrir}
      className={`pressionavel elevavel flex w-full items-stretch gap-3 overflow-hidden rounded-2xl bg-white p-3 text-left shadow-suave ${
        bloqueada ? 'opacity-80' : ''
      }`}
    >
      <span className="relative block h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl">
        <Capa
          nome={oferta.loja_nome}
          categoria={oferta.categoria}
          cor={oferta.cor}
          className="absolute inset-0 h-full w-full"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-slate-950/55 to-transparent" />
        <span className="texto-sobre-capa absolute inset-x-0 bottom-1.5 px-1 text-center text-base leading-none font-extrabold text-white">
          {selo(oferta)}
        </span>
      </span>

      <span className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="flex items-center gap-1.5">
          <span className="min-w-0 truncate text-[10px] font-bold tracking-wider text-slate-500 uppercase">
            {oferta.loja_nome}
          </span>
          {oferta.relampago && <Relampago compacto />}
        </span>

        <span className="mt-0.5 line-clamp-2 leading-snug font-bold text-slate-900">
          {oferta.titulo}
        </span>

        <span className="mt-1 flex items-center gap-1.5 text-xs">
          {bloqueada ? (
            <>
              <Relogio className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate text-slate-500">{oferta.motivo}</span>
            </>
          ) : (
            <>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                −{reais(oferta.economia_estimada)}
              </span>
              {oferta.restantes !== null && oferta.restantes <= 20 && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-600">
                  restam {oferta.restantes}
                </span>
              )}
            </>
          )}
        </span>
      </span>

      {bloqueada && (
        <span className="flex items-center pr-1 text-slate-300">
          <Cadeado className="h-4 w-4" />
        </span>
      )}
    </button>
  )
}

/* ---------- cartão de loja, usado no mapa e nos favoritos ---------- */

export function CartaoLoja({
  nome,
  categoria,
  cor,
  endereco,
  detalhe,
  aoAbrir,
}: {
  nome: string
  categoria: string
  cor: string
  endereco: string
  detalhe?: React.ReactNode
  aoAbrir: () => void
}) {
  return (
    <button
      onClick={aoAbrir}
      className="pressionavel elevavel flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-suave"
    >
      <Monograma nome={nome} cor={cor} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-slate-900">{nome}</span>
        <span className="flex items-center gap-1 text-sm text-slate-500">
          <Local className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{endereco}</span>
        </span>
        <span className="mt-0.5 block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
          {categoria}
        </span>
      </span>
      {detalhe}
    </button>
  )
}
