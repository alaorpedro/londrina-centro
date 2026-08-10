import { useEffect, useState } from 'react'
import { api, ErroApi } from '../api'
import type { ResgateLoja } from '../tipos'
import { Aviso, Cartao, Carregando, Vazio } from '../componentes/Ui'
import { Cupom } from '../componentes/Icones'
import { dataHora, reais } from '../formato'

/*
  Histórico de atendimentos. Só o primeiro nome do cliente aparece: para conferir
  um atendimento no balcão isso basta, e a loja não precisa — nem deve — ficar
  com a lista nominal completa de quem é assinante do clube.
*/

export function Historico({ recarga }: { recarga: number }) {
  const [resgates, setResgates] = useState<ResgateLoja[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<{ resgates: ResgateLoja[] }>('/api/lojista/resgates')
      .then((d) => setResgates(d.resgates))
      .catch((e) => setErro(e instanceof ErroApi ? e.message : 'Não consegui carregar o histórico.'))
      .finally(() => setCarregando(false))
  }, [recarga])

  if (carregando) return <Carregando />
  if (erro) return <Aviso tipo="erro">{erro}</Aviso>

  if (resgates.length === 0) {
    return (
      <Cartao>
        <Vazio icone={<Cupom />} titulo="Nenhum cupom validado ainda">
          Assim que o primeiro cliente do clube usar um cupom aqui, o atendimento aparece nesta
          lista.
        </Vazio>
      </Cartao>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-bold text-slate-900">Atendimentos</h2>
        <span className="text-sm text-slate-500">últimos 30 dias</span>
      </div>

      <Cartao className="overflow-hidden">
        {/* tabela no desktop */}
        <table className="hidden w-full text-sm sm:table">
          <thead className="border-b border-slate-200 bg-slate-50 text-left">
            <tr className="text-xs tracking-wide text-slate-500 uppercase">
              <th className="px-4 py-2.5 font-semibold">Quando</th>
              <th className="px-4 py-2.5 font-semibold">Cliente</th>
              <th className="px-4 py-2.5 font-semibold">Oferta</th>
              <th className="px-4 py-2.5 text-right font-semibold">Compra</th>
              <th className="px-4 py-2.5 text-right font-semibold">Desconto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {resgates.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="tabular px-4 py-3 whitespace-nowrap text-slate-600">
                  {dataHora(r.validado_em)}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{r.morador_nome}</td>
                <td className="max-w-xs truncate px-4 py-3 text-slate-600">{r.titulo}</td>
                <td className="tabular px-4 py-3 text-right text-slate-600">
                  {r.valor_compra ? reais(r.valor_compra) : '—'}
                </td>
                <td className="tabular px-4 py-3 text-right font-semibold text-slate-900">
                  {reais(r.economia)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* lista no celular */}
        <ul className="divide-y divide-slate-100 sm:hidden">
          {resgates.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{r.morador_nome}</p>
                <p className="truncate text-xs text-slate-500">{r.titulo}</p>
                <p className="tabular text-xs text-slate-400">{dataHora(r.validado_em)}</p>
              </div>
              <span className="tabular shrink-0 text-sm font-semibold text-slate-900">
                {reais(r.economia)}
              </span>
            </li>
          ))}
        </ul>
      </Cartao>
    </div>
  )
}
