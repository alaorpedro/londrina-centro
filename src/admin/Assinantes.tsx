import { useEffect, useMemo, useState } from 'react'
import { api, ErroApi } from '../api'
import type { AssinanteAdmin } from '../tipos'
import { Aviso, Cartao, Carregando, Etiqueta, Indicador } from '../componentes/Ui'
import { Busca } from '../componentes/Icones'
import { dataBr, numero, reais } from '../formato'

/*
  Base de moradores.

  As três lentes que importam no modelo anual, e que o filtro expõe:
    renovação  → quem vence nos próximos 60 dias (a régua tem que alcançar)
    dormentes  → quem pagou e nunca usou (o risco silencioso de não renovar)
    sem assinar→ quem se cadastrou e não converteu (o funil que falta fechar)
*/

type Lente = 'todos' | 'ativos' | 'renovacao' | 'dormentes' | 'sem_assinar'

const LENTES: { valor: Lente; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'ativos', rotulo: 'Assinantes' },
  { valor: 'renovacao', rotulo: 'Renovação em 60 dias' },
  { valor: 'dormentes', rotulo: 'Pagou e nunca usou' },
  { valor: 'sem_assinar', rotulo: 'Cadastrou e não assinou' },
]

export function AdminAssinantes() {
  const [assinantes, setAssinantes] = useState<AssinanteAdmin[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [lente, setLente] = useState<Lente>('todos')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    api
      .get<{ assinantes: AssinanteAdmin[] }>('/api/admin/assinantes')
      .then((d) => setAssinantes(d.assinantes))
      .catch((e) => setErro(e instanceof ErroApi ? e.message : 'Não consegui carregar a base.'))
      .finally(() => setCarregando(false))
  }, [])

  const resumo = useMemo(() => {
    const ativos = assinantes.filter((a) => a.ativa)
    return {
      pagantes: ativos.length,
      usaram: ativos.filter((a) => a.usos > 0).length,
      economia: assinantes.reduce((s, a) => s + Number(a.economia ?? 0), 0),
      receita: assinantes.reduce((s, a) => s + Number(a.valor ?? 0), 0),
    }
  }, [assinantes])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return assinantes.filter((a) => {
      if (termo && !a.nome.toLowerCase().includes(termo) && !a.whatsapp.includes(termo)) return false
      if (lente === 'ativos') return a.ativa
      if (lente === 'renovacao')
        return a.ativa && a.dias_restantes !== null && a.dias_restantes <= 60
      if (lente === 'dormentes') return a.ativa && a.usos === 0
      if (lente === 'sem_assinar') return !a.status
      return true
    })
  }, [assinantes, lente, busca])

  if (carregando) return <Carregando />
  if (erro) return <Aviso tipo="erro">{erro}</Aviso>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Pagantes" valor={numero(resumo.pagantes)} />
        <Indicador
          rotulo="Já usaram algum cupom"
          valor={numero(resumo.usaram)}
          detalhe={
            resumo.pagantes > 0
              ? `${Math.round((resumo.usaram / resumo.pagantes) * 100)}% dos pagantes`
              : undefined
          }
        />
        <Indicador rotulo="Receita acumulada" valor={reais(resumo.receita)} cor="text-roxo-800" />
        <Indicador
          rotulo="Economia devolvida"
          valor={reais(resumo.economia)}
          detalhe="aos moradores"
          cor="text-emerald-700"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[14rem] flex-1">
          <Busca className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou WhatsApp"
            className="w-full rounded-xl border border-slate-300 py-2.5 pr-3 pl-9 text-sm outline-none focus:border-roxo-500 focus:ring-2 focus:ring-roxo-200"
          />
        </label>
        <div className="rolagem-sem-barra flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
          {LENTES.map((l) => (
            <button
              key={l.valor}
              onClick={() => setLente(l.valor)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
                lente === l.valor ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              {l.rotulo}
            </button>
          ))}
        </div>
      </div>

      <Cartao className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left">
            <tr className="text-xs tracking-wide text-slate-500 uppercase">
              <th className="px-4 py-2.5 font-semibold">Morador</th>
              <th className="px-4 py-2.5 font-semibold">Bairro</th>
              <th className="px-4 py-2.5 font-semibold">Assinatura</th>
              <th className="px-4 py-2.5 font-semibold">Vence</th>
              <th className="px-4 py-2.5 text-right font-semibold">Usos</th>
              <th className="px-4 py-2.5 text-right font-semibold">Economizou</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{a.nome}</p>
                  <p className="tabular text-xs text-slate-500">{a.whatsapp}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{a.bairro ?? '—'}</td>
                <td className="px-4 py-3">
                  {!a.status ? (
                    <Etiqueta cor="cinza">não assinou</Etiqueta>
                  ) : a.ativa ? (
                    <div className="flex items-center gap-1.5">
                      <Etiqueta cor="verde">ativa</Etiqueta>
                      <span className="text-xs text-slate-500">
                        {a.forma === 'pix' ? 'Pix' : `${a.parcelas}x`} · {reais(a.valor ?? 0)}
                      </span>
                    </div>
                  ) : (
                    <Etiqueta cor="vermelho">vencida</Etiqueta>
                  )}
                </td>
                <td className="tabular px-4 py-3 text-slate-600">
                  {a.vence_em ? (
                    <>
                      {dataBr(a.vence_em)}
                      {a.ativa && a.dias_restantes !== null && a.dias_restantes <= 60 && (
                        <span className="ml-1 text-xs font-semibold text-amber-600">
                          {a.dias_restantes}d
                        </span>
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="tabular px-4 py-3 text-right">
                  {a.usos === 0 && a.ativa ? (
                    <span className="font-semibold text-amber-600">0</span>
                  ) : (
                    <span className="text-slate-700">{numero(a.usos)}</span>
                  )}
                </td>
                <td className="tabular px-4 py-3 text-right font-semibold text-slate-900">
                  {reais(a.economia)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtrados.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">
            Ninguém nesta lista com os filtros atuais.
          </p>
        )}
      </Cartao>

      <p className="text-xs text-slate-500">
        Mostrando {filtrados.length} de {assinantes.length} cadastrados.
      </p>
    </div>
  )
}
