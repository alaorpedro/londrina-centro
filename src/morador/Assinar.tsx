import { useState } from 'react'
import { api, ErroApi } from '../api'
import type { Config } from '../tipos'
import { Aviso, BarraTopo, Botao, Cartao } from '../componentes/Ui'
import { Cartao as IconeCartao, Check, Pix } from '../componentes/Icones'
import { reais } from '../formato'
import { irPara, voltar } from '../rotas'

/*
  Checkout da assinatura anual.

  No piloto roda em modo demonstração: a tela é a definitiva e o fluxo é o real,
  mas nenhuma cobrança acontece — a assinatura é liberada na hora, para a
  apresentação à ACIL não depender de cartão de verdade. O aviso na tela deixa
  isso explícito para quem estiver assistindo.

  Fase 1 troca só o que acontece atrás do botão: Mercado Pago com Pix, cartão à
  vista e em 3x. A tela não muda.
*/

export function Assinar({ config, aoAssinar }: { config: Config | null; aoAssinar: () => Promise<void> }) {
  const [forma, setForma] = useState<'pix' | 'cartao'>('pix')
  const [parcelas, setParcelas] = useState(3)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const precoPix = config?.preco_pix ?? 89.9
  const precoCartao = config?.preco_anual ?? 99.9
  const maxParcelas = config?.parcelas_max ?? 3

  async function confirmar() {
    setErro(null)
    setEnviando(true)
    try {
      await api.post('/api/morador/assinatura', { forma, parcelas: forma === 'pix' ? 1 : parcelas })
      await aoAssinar()
      irPara('/conta')
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não consegui concluir agora. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="pb-10">
      <BarraTopo titulo="Assinar o clube" aoVoltar={voltar} />

      <div className="bg-roxo-800 px-5 pt-6 pb-8 text-white">
        <p className="text-sm text-roxo-200">Acesso completo por 12 meses</p>
        <p className="mt-1 text-4xl font-extrabold">{reais(precoCartao)}</p>
        <p className="mt-1 text-sm text-roxo-100">
          menos de {reais(precoCartao / 12)} por mês · sem renovação automática
        </p>
      </div>

      <div className="space-y-6 p-5">
        <section>
          <h2 className="mb-2.5 font-bold text-slate-900">O que você libera</h2>
          <ul className="space-y-2">
            {[
              'Cupons ilimitados em todas as lojas do centro',
              'Oportunidades relâmpago com aviso no celular',
              'Acompanhamento de quanto você já economizou',
              'Novas lojas entram durante o ano, sem custo extra',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[15px] text-slate-700">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2.5 font-bold text-slate-900">Como você prefere pagar</h2>
          <div className="space-y-2.5">
            <Opcao
              escolhida={forma === 'pix'}
              aoEscolher={() => setForma('pix')}
              icone={<Pix className="h-5 w-5" />}
              titulo="Pix à vista"
              detalhe="Acesso liberado na hora"
              valor={reais(precoPix)}
              destaque={`economize ${reais(precoCartao - precoPix)}`}
            />
            <Opcao
              escolhida={forma === 'cartao'}
              aoEscolher={() => setForma('cartao')}
              icone={<IconeCartao className="h-5 w-5" />}
              titulo="Cartão de crédito"
              detalhe={`em até ${maxParcelas}x sem juros`}
              valor={reais(precoCartao)}
            />
          </div>

          {forma === 'cartao' && (
            <div className="mt-3 flex gap-2">
              {Array.from({ length: maxParcelas }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setParcelas(n)}
                  className={`flex-1 rounded-xl border px-2 py-2.5 text-center transition ${
                    parcelas === n
                      ? 'border-roxo-700 bg-roxo-50 text-roxo-800'
                      : 'border-slate-300 text-slate-600'
                  }`}
                >
                  <span className="block text-sm font-bold">{n}x</span>
                  <span className="tabular block text-xs">{reais(precoCartao / n)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {config?.demo && (
          <Aviso tipo="atencao">
            <strong>Modo demonstração.</strong> Nenhuma cobrança será feita — a assinatura é
            liberada na hora para a apresentação. O pagamento real pelo Mercado Pago entra na
            Fase&nbsp;1.
          </Aviso>
        )}

        {erro && <Aviso tipo="erro">{erro}</Aviso>}

        <Botao largo grande carregando={enviando} onClick={confirmar}>
          {forma === 'pix'
            ? `Pagar ${reais(precoPix)} no Pix`
            : `Pagar ${parcelas}x de ${reais(precoCartao / parcelas)}`}
        </Botao>

        <p className="text-center text-xs leading-relaxed text-slate-500">
          Você pode cancelar quando quiser pelo próprio app. Ao assinar, você concorda com os termos
          de uso e a política de privacidade do clube.
        </p>
      </div>
    </div>
  )
}

function Opcao({
  escolhida,
  aoEscolher,
  icone,
  titulo,
  detalhe,
  valor,
  destaque,
}: {
  escolhida: boolean
  aoEscolher: () => void
  icone: React.ReactNode
  titulo: string
  detalhe: string
  valor: string
  destaque?: string
}) {
  return (
    <Cartao
      onClick={aoEscolher}
      role="radio"
      aria-checked={escolhida}
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && aoEscolher()}
      className={`flex cursor-pointer items-center gap-3 p-3.5 transition ${
        escolhida ? 'border-roxo-600 ring-2 ring-roxo-200' : 'hover:border-slate-300'
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          escolhida ? 'bg-roxo-100 text-roxo-700' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {icone}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-900">{titulo}</span>
        <span className="block text-sm text-slate-500">{detalhe}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="tabular block font-bold text-slate-900">{valor}</span>
        {destaque && (
          <span className="block text-xs font-semibold text-emerald-600">{destaque}</span>
        )}
      </span>
    </Cartao>
  )
}
