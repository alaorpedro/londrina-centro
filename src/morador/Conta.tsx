import { useEffect, useState } from 'react'
import { api, ErroApi } from '../api'
import type { ContaMorador, SessaoMorador } from '../tipos'
import { Aviso, BarraTopo, Botao, Cartao, Carregando, Etiqueta, Vazio } from '../componentes/Ui'
import { Cupom, Sair, Calendario } from '../componentes/Icones'
import { dataBr, dataHora, reais, plural } from '../formato'
import { irPara } from '../rotas'

/*
  "Quanto já economizei" é a tela de retenção do modelo anual. Sem cobrança
  recorrente, a renovação depende de o morador ver, preto no branco, que
  economizou mais do que pagou. Por isso a comparação com o valor da assinatura
  vem antes do histórico, e não depois.
*/

export function Conta({ sessao, aoSair }: { sessao: SessaoMorador; aoSair: () => Promise<void> }) {
  const [conta, setConta] = useState<ContaMorador | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!sessao.logado) {
      irPara('/entrar')
      return
    }
    api
      .get<ContaMorador>('/api/morador/conta')
      .then(setConta)
      .catch((e) => setErro(e instanceof ErroApi ? e.message : 'Não consegui carregar sua conta.'))
      .finally(() => setCarregando(false))
  }, [sessao.logado])

  if (carregando) return <Carregando />

  if (erro || !conta) {
    return (
      <div>
        <BarraTopo titulo="Minha conta" />
        <div className="p-4">
          <Aviso tipo="erro">{erro ?? 'Não consegui carregar sua conta.'}</Aviso>
        </div>
      </div>
    )
  }

  const pago = conta.assinatura?.valor ?? 0
  const saldo = conta.economia_total - pago
  const compensou = pago > 0 && saldo > 0

  return (
    <div className="pb-6">
      <BarraTopo titulo="Minha conta" />

      {/* o número que segura a renovação */}
      <section className="bg-roxo-800 px-5 pt-6 pb-7 text-center text-white">
        <p className="text-sm text-roxo-200">Você já economizou</p>
        <p className="mt-1 text-5xl font-extrabold">{reais(conta.economia_total)}</p>
        <p className="mt-2 text-sm text-roxo-100">
          em {conta.usos} {plural(conta.usos, 'cupom usado', 'cupons usados')}
        </p>

        {pago > 0 && (
          <div className="mt-5 rounded-xl bg-roxo-900/50 px-4 py-3 text-sm">
            {compensou ? (
              <>
                Sua assinatura custou {reais(pago)}. Você já está{' '}
                <strong className="text-ipe-300">{reais(saldo)} no lucro</strong>.
              </>
            ) : (
              <>
                Faltam <strong className="text-ipe-300">{reais(Math.abs(saldo))}</strong> de economia
                para a assinatura se pagar.
              </>
            )}
          </div>
        )}
      </section>

      <div className="space-y-6 p-4">
        <Cartao className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{sessao.morador?.nome}</p>
              <p className="text-sm text-slate-500">{sessao.morador?.whatsapp}</p>
              {sessao.morador?.bairro && (
                <p className="text-sm text-slate-500">{sessao.morador.bairro}</p>
              )}
            </div>
            {conta.assinatura?.ativa ? (
              <Etiqueta cor="verde">Assinante</Etiqueta>
            ) : (
              <Etiqueta cor="vermelho">Sem assinatura</Etiqueta>
            )}
          </div>

          {conta.assinatura ? (
            <div className="mt-4 border-t border-slate-100 pt-3.5">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendario className="h-4 w-4 text-slate-400" />
                {conta.assinatura.ativa ? (
                  <>
                    Válida até <strong>{dataBr(conta.assinatura.vence_em)}</strong>
                    <span className="text-slate-400">
                      · {conta.assinatura.dias_restantes} dias
                    </span>
                  </>
                ) : (
                  <>Venceu em {dataBr(conta.assinatura.vence_em)}</>
                )}
              </div>

              {conta.assinatura.ativa && conta.assinatura.dias_restantes <= 60 && (
                <Aviso tipo="atencao" className="mt-3">
                  Sua assinatura vence em {conta.assinatura.dias_restantes} dias. Renove para não
                  perder o acesso aos cupons.
                </Aviso>
              )}

              {!conta.assinatura.ativa && (
                <Botao className="mt-3" largo onClick={() => irPara('/assinar')}>
                  Renovar assinatura
                </Botao>
              )}
            </div>
          ) : (
            <Botao className="mt-4" largo onClick={() => irPara('/assinar')}>
              Assinar o clube
            </Botao>
          )}
        </Cartao>

        <section>
          <h2 className="mb-2.5 font-bold text-slate-900">Cupons que você usou</h2>
          {conta.resgates.length === 0 ? (
            <Cartao>
              <Vazio icone={<Cupom />} titulo="Nenhum cupom usado ainda">
                Quando você usar o primeiro cupom no centro, ele aparece aqui com a economia.
              </Vazio>
            </Cartao>
          ) : (
            <div className="space-y-2">
              {conta.resgates.map((r) => (
                <Cartao key={r.id} className="flex items-center gap-3 p-3.5">
                  <span
                    className="h-10 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: r.cor }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{r.titulo}</p>
                    <p className="truncate text-xs text-slate-500">
                      {r.loja_nome} · {dataHora(r.validado_em)}
                    </p>
                  </div>
                  {r.economia > 0 && (
                    <span className="tabular shrink-0 text-sm font-bold text-emerald-600">
                      −{reais(r.economia)}
                    </span>
                  )}
                </Cartao>
              ))}
            </div>
          )}
        </section>

        <button
          onClick={async () => {
            await aoSair()
            irPara('/')
          }}
          className="flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold text-slate-500 hover:text-slate-700"
        >
          <Sair className="h-4 w-4" />
          Sair da conta
        </button>
      </div>
    </div>
  )
}
