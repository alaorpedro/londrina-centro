import { useEffect, useState } from 'react'
import { api, ErroApi } from '../api'
import type { PainelAdmin } from '../tipos'
import { Aviso, Cartao, Carregando, Indicador } from '../componentes/Ui'
import { Colunas, serieDiaria } from '../componentes/Graficos'
import { Alerta, Loja, Cupom, Usuario, SetaDireita } from '../componentes/Icones'
import { numero, reais, somarDias } from '../formato'
import { irPara } from '../rotas'

/*
  Painel do administrador.

  A separação entre PAGANTE e ATIVO está no topo de propósito. Com assinatura a
  R$ 99,90/ano, uma parte da base paga e nunca usa — isso não machuca o caixa,
  mas se os dois números virarem um só, o relatório apresentado à ACIL fica
  inflado e não sobrevive à primeira pergunta de um associado. Aqui eles nunca
  se misturam.
*/

export function AdminPainel() {
  const [dados, setDados] = useState<PainelAdmin | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<PainelAdmin>('/api/admin/painel')
      .then(setDados)
      .catch((e) => setErro(e instanceof ErroApi ? e.message : 'Não consegui carregar o painel.'))
      .finally(() => setCarregando(false))
  }, [])

  if (carregando) return <Carregando />
  if (erro || !dados) return <Aviso tipo="erro">{erro ?? 'Não consegui carregar o painel.'}</Aviso>

  const { assinantes, resgates, lojas, alertas } = dados
  const taxaAtivos = assinantes.pagantes > 0 ? resgates.moradores_ativos / assinantes.pagantes : 0

  const pendencias = [
    {
      n: alertas.ofertas_pendentes,
      texto: 'ofertas esperando aprovação',
      rota: '/admin/ofertas',
      urgente: true,
    },
    {
      n: alertas.contratos_vencendo,
      texto: 'contratos de loja vencem em 30 dias',
      rota: '/admin/lojas',
      urgente: true,
    },
    {
      n: alertas.assinaturas_vencendo,
      texto: 'assinaturas vencem em 60 dias — fila da régua de renovação',
      rota: '/admin/assinantes',
      urgente: false,
    },
    {
      n: alertas.assinantes_sem_uso,
      texto: 'assinantes pagaram e nunca resgataram nada',
      rota: '/admin/assinantes',
      urgente: false,
    },
    {
      n: alertas.lojas_sem_oferta,
      texto: 'lojas ativas sem nenhuma oferta no ar',
      rota: '/admin/lojas',
      urgente: true,
    },
    {
      n: alertas.lojas_sem_resgate,
      texto: 'lojas sem um único resgate neste mês',
      rota: '/admin/lojas',
      urgente: false,
    },
  ].filter((p) => p.n > 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          rotulo="Assinantes pagantes"
          valor={numero(assinantes.pagantes)}
          detalhe={`${assinantes.novos_no_mes} novos neste mês`}
          icone={<Usuario className="h-4 w-4" />}
        />
        <Indicador
          rotulo="Assinantes ativos"
          valor={numero(resgates.moradores_ativos)}
          detalhe={`${Math.round(taxaAtivos * 100)}% dos pagantes já usaram`}
          cor={taxaAtivos < 0.5 ? 'text-amber-600' : 'text-emerald-700'}
        />
        <Indicador
          rotulo="Lojas no ar"
          valor={`${lojas.no_ar}`}
          detalhe={`de ${lojas.total} cadastradas`}
          icone={<Loja className="h-4 w-4" />}
        />
        <Indicador
          rotulo="Receita do mês"
          valor={reais(assinantes.receita_mes)}
          detalhe={`${reais(assinantes.receita_total)} acumulado`}
          cor="text-roxo-800"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Cartao className="p-4 lg:col-span-2">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="font-bold text-slate-900">Cupons validados por dia</h2>
            <span className="text-xs text-slate-500">últimos 30 dias</span>
          </div>
          <Colunas
            altura={180}
            sufixoDica=" cupons"
            dados={serieDiaria(dados.por_dia, somarDias(dados.hoje, -29), dados.hoje, dados.hoje)}
          />
        </Cartao>

        <Cartao className="p-4">
          <h2 className="mb-3 font-bold text-slate-900">Movimento do clube</h2>
          <dl className="space-y-3.5">
            <Linha rotulo="Cupons validados no total" valor={numero(resgates.total)} />
            <Linha rotulo="Cupons neste mês" valor={numero(resgates.no_mes)} />
            <Linha
              rotulo="Economia gerada para os moradores"
              valor={reais(resgates.economia)}
              destaque
            />
            <Linha
              rotulo="Economia média por assinante ativo"
              valor={
                resgates.moradores_ativos > 0
                  ? reais(resgates.economia / resgates.moradores_ativos)
                  : '—'
              }
            />
          </dl>
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
            A economia média por assinante é o argumento de renovação: enquanto ela for maior que a
            assinatura, o morador renova.
          </p>
        </Cartao>
      </div>

      <Cartao className="p-4">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-900">
          <Alerta className="h-4 w-4 text-amber-500" />
          Precisa da sua atenção
        </h2>

        {pendencias.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Nada pendente. Contratos em dia, ofertas aprovadas e nenhuma loja parada.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pendencias.map((p) => (
              <li key={p.texto}>
                <button
                  onClick={() => irPara(p.rota)}
                  className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-slate-50"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                      p.urgente ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {p.n}
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-slate-700">{p.texto}</span>
                  <SetaDireita className="h-4 w-4 shrink-0 text-slate-300" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <Cartao className="flex items-start gap-3 bg-roxo-50 p-4">
        <Cupom className="mt-0.5 h-5 w-5 shrink-0 text-roxo-600" />
        <p className="text-sm leading-relaxed text-roxo-900">
          O <strong>Relatório ACIL</strong> transforma esses números na peça institucional —
          economia total gerada, lojas participantes e de que bairros vem quem visita o centro.
        </p>
      </Cartao>
    </div>
  )
}

function Linha({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string
  valor: string
  destaque?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-slate-600">{rotulo}</dt>
      <dd
        className={`shrink-0 font-bold ${destaque ? 'text-lg text-roxo-800' : 'text-slate-900'}`}
      >
        {valor}
      </dd>
    </div>
  )
}
