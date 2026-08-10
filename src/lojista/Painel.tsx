import { useEffect, useState } from 'react'
import { api, ErroApi } from '../api'
import type { PainelLojista } from '../tipos'
import { Aviso, Cartao, Etiqueta, Indicador } from '../componentes/Ui'
import { EsqueletoPainel, Revelar } from '../componentes/Movimento'
import { BarrasRanking, Colunas, PorHora, serieDiaria } from '../componentes/Graficos'
import { Calendario, Cupom, Usuario } from '../componentes/Icones'
import { dataBr, numero, reais } from '../formato'

/*
  O painel do lojista tem uma pergunta só, e ela é comercial: "quanta gente esse
  clube trouxe pra minha loja?". É essa resposta que faz o contrato ser
  renovado. Por isso os quatro números do topo vêm antes de qualquer gráfico, e
  a economia gerada aparece ao lado do número de clientes — o lojista precisa
  ver o desconto que deu como investimento com retorno, não como perda.
*/

export function Painel({ recarga }: { recarga: number }) {
  const [dados, setDados] = useState<PainelLojista | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<PainelLojista>('/api/lojista/painel')
      .then((d) => {
        setDados(d)
        setErro(null)
      })
      .catch((e) => setErro(e instanceof ErroApi ? e.message : 'Não consegui carregar o painel.'))
      .finally(() => setCarregando(false))
  }, [recarga])

  if (carregando) return <EsqueletoPainel />
  if (erro || !dados) return <Aviso tipo="erro">{erro ?? 'Não consegui carregar o painel.'}</Aviso>

  const { resumo, contrato } = dados
  const vencendo = contrato && contrato.dias_restantes <= 30

  return (
    <div className="space-y-5">
      {vencendo && (
        <Aviso tipo="atencao">
          Seu contrato com o clube vence em <strong>{contrato.dias_restantes} dias</strong> (
          {dataBr(contrato.fim)}). Fale com {contrato.vendedor ?? 'seu consultor'} para renovar e
          não sair do app.
        </Aviso>
      )}

      <div className="cascata grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Hoje" valor={numero(resumo.hoje)} detalhe="cupons validados" />
        <Indicador rotulo="Esta semana" valor={numero(resumo.semana)} detalhe="cupons validados" />
        <Indicador
          rotulo="Clientes no período"
          valor={numero(resumo.clientes)}
          detalhe="pessoas diferentes"
          icone={<Usuario className="h-4 w-4" />}
        />
        <Indicador
          rotulo="Desconto concedido"
          valor={reais(resumo.economia)}
          detalhe="nos últimos 30 dias"
          cor="text-roxo-800"
        />
      </div>

      <Revelar>
      <Cartao className="p-4">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="font-bold text-slate-900">Cupons por dia</h2>
          <span className="text-xs text-slate-500">últimos 30 dias</span>
        </div>
        <Colunas
          sufixoDica=" cupons"
          dados={serieDiaria(dados.por_dia, dados.de, dados.hoje, dados.hoje)}
        />
        {dados.por_dia.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            Coluna em roxo é hoje. Passe o mouse para ver o número de cada dia.
          </p>
        )}
      </Cartao>
      </Revelar>

      <div className="grid gap-5 lg:grid-cols-2">
        <Cartao className="p-4">
          <h2 className="mb-1 font-bold text-slate-900">Horário de pico</h2>
          <p className="mb-3 text-xs text-slate-500">
            Quando o cliente do clube entra na loja — útil para escalar o balcão.
          </p>
          <PorHora dados={dados.por_hora} />
        </Cartao>

        <Cartao className="p-4">
          <h2 className="mb-1 font-bold text-slate-900">Qual oferta puxa mais</h2>
          <p className="mb-3.5 text-xs text-slate-500">Cupons validados nos últimos 30 dias.</p>
          {dados.por_oferta.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              Nenhuma oferta cadastrada ainda.
            </p>
          ) : (
            <BarrasRanking
              maximo={6}
              dados={dados.por_oferta.map((o) => ({
                chave: o.id,
                rotulo: o.titulo,
                valor: o.n,
                nota: o.economia > 0 ? `${reais(o.economia)} de desconto dado` : undefined,
              }))}
            />
          )}
        </Cartao>
      </div>

      {contrato && (
        <Cartao className="p-4">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-900">
            <Calendario className="h-4 w-4 text-slate-400" />
            Seu contrato
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            <Item rotulo="Situação">
              {contrato.status === 'ativo' ? (
                <Etiqueta cor="verde">Ativo</Etiqueta>
              ) : (
                <Etiqueta cor="vermelho">Vencido</Etiqueta>
              )}
            </Item>
            <Item rotulo="Início">{dataBr(contrato.inicio)}</Item>
            <Item rotulo="Renovação">{dataBr(contrato.fim)}</Item>
            <Item rotulo="Consultor">{contrato.vendedor ?? '—'}</Item>
          </dl>
        </Cartao>
      )}

      <Cartao className="flex items-start gap-3 bg-roxo-50 p-4">
        <Cupom className="mt-0.5 h-5 w-5 shrink-0 text-roxo-600" />
        <p className="text-sm leading-relaxed text-roxo-900">
          <strong>Dica:</strong> lojas que mantêm ao menos duas ofertas ativas recebem mais que o
          dobro de visitas do clube. Crie a próxima na aba <strong>Minhas ofertas</strong>.
        </p>
      </Cartao>
    </div>
  )
}

function Item({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{rotulo}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{children}</dd>
    </div>
  )
}
