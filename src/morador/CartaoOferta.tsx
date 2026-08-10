import type { Oferta } from '../tipos'
import { Etiqueta } from '../componentes/Ui'
import { Raio, Cadeado, Relogio } from '../componentes/Icones'
import { reais } from '../formato'

/*
  O cartão da oferta é a unidade de leitura do app. O morador desce a home
  rolando e precisa entender em menos de um segundo: quanto ganha, onde, e se
  pode usar agora.

  Por isso a hierarquia é: desconto (maior elemento) → loja → título. O nome da
  promoção vem depois do número — ninguém decide ir ao centro por causa de um
  título bonito, decide por causa do desconto.
*/

export function selo(oferta: Oferta): string {
  if (oferta.tipo === 'percentual') return `${formatar(oferta.valor_desconto)}%`
  if (oferta.tipo === 'valor_fixo') return reais(oferta.valor_desconto).replace('R$ ', 'R$')
  if (oferta.tipo === 'leve_pague') return '2 por 1'
  return 'Brinde'
}

function formatar(n: number) {
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',')
}

export function CartaoOferta({ oferta, aoAbrir }: { oferta: Oferta; aoAbrir: () => void }) {
  const bloqueada = !oferta.disponivel

  return (
    <button
      onClick={aoAbrir}
      className={`group relative flex w-full items-stretch gap-0 overflow-hidden rounded-2xl border
        bg-white text-left shadow-sm transition
        ${bloqueada ? 'border-slate-200 opacity-75' : 'border-slate-200 hover:border-roxo-300 hover:shadow-md'}`}
    >
      {/* faixa com a cor da loja: o morador reconhece a loja antes de ler */}
      <div
        className="flex w-[86px] shrink-0 flex-col items-center justify-center px-2 py-4 text-white"
        style={{ backgroundColor: oferta.cor }}
      >
        <span className="tabular text-xl leading-none font-extrabold tracking-tight">
          {selo(oferta)}
        </span>
        <span className="mt-1 text-[10px] leading-tight font-semibold tracking-wide uppercase opacity-90">
          {oferta.tipo === 'brinde' ? 'grátis' : oferta.tipo === 'leve_pague' ? 'leve+' : 'off'}
        </span>
      </div>

      <div className="min-w-0 flex-1 p-3.5">
        {/* o pr-7 abre espaço para o cadeado, que é posicionado por cima do
            cartão: sem ele o selo de relâmpago fica embaixo do ícone */}
        <div className={`flex items-start justify-between gap-2 ${bloqueada ? 'pr-7' : ''}`}>
          <p className="truncate text-xs font-semibold tracking-wide text-slate-500 uppercase">
            {oferta.loja_nome}
          </p>
          {oferta.relampago && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ipe-400 px-2 py-0.5 text-[10px] font-bold text-slate-900 uppercase">
              <Raio className="h-3 w-3" />
              relâmpago
            </span>
          )}
        </div>

        <h3 className="mt-1 line-clamp-2 leading-snug font-bold text-slate-900">{oferta.titulo}</h3>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {bloqueada ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
              <Relogio className="h-3.5 w-3.5" />
              {oferta.motivo}
            </span>
          ) : (
            <>
              <Etiqueta cor="cinza">{oferta.categoria}</Etiqueta>
              {oferta.restantes !== null && oferta.restantes <= 20 && (
                <Etiqueta cor="vermelho">restam {oferta.restantes}</Etiqueta>
              )}
            </>
          )}
        </div>
      </div>

      {bloqueada && (
        <div className="absolute top-2 right-2 rounded-full bg-slate-100 p-1.5 text-slate-400">
          <Cadeado className="h-3.5 w-3.5" />
        </div>
      )}
    </button>
  )
}
