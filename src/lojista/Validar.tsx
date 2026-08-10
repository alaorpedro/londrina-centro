import { useEffect, useRef, useState } from 'react'
import { api, ErroApi } from '../api'
import type { ValidacaoOk } from '../tipos'
import { Botao } from '../componentes/Ui'
import { Alerta, CheckCirculo } from '../componentes/Icones'

/*
  A tela do balcão.

  É a tela mais usada do sistema e a que tem menos tolerância a erro: quem opera
  é o balconista, com fila na frente, muitas vezes num celular velho e sem
  nenhum treinamento. Tudo aqui é desenhado para isso:

  - abre com o cursor já no campo, teclado numérico
  - seis casas separadas, para conferir o que o cliente ditou sem contar dígito
  - valida sozinha ao completar o sexto número: sem botão "confirmar"
  - resposta em tela cheia, verde ou vermelha, legível a um braço de distância
  - volta ao estado inicial sozinha depois de alguns segundos, pronta para o
    próximo cliente — ninguém precisa saber que existe um botão de "novo"

  O valor da compra é opcional e vem DEPOIS da validação, nunca antes. Pedir o
  valor primeiro colocaria uma pergunta entre o cliente e o desconto; e o cupom
  já está validado quando o campo aparece, então esquecer de preencher não
  quebra nada — só deixa a economia como estimativa no relatório.
*/

type Estado =
  | { fase: 'digitando' }
  | { fase: 'validando' }
  | { fase: 'ok'; dados: ValidacaoOk }
  | { fase: 'erro'; mensagem: string }

const CASAS = 6

export function Validar({ aoValidar }: { aoValidar: () => void }) {
  const [digitos, setDigitos] = useState<string[]>(Array(CASAS).fill(''))
  const [estado, setEstado] = useState<Estado>({ fase: 'digitando' })
  const [valorCompra, setValorCompra] = useState('')
  const [salvandoValor, setSalvandoValor] = useState(false)
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const codigo = digitos.join('')

  useEffect(() => {
    if (estado.fase === 'digitando') refs.current[0]?.focus()
  }, [estado.fase])

  /* Valida sozinha ao fechar as seis casas. Um botão a mais aqui é um toque a
     mais com fila esperando. */
  useEffect(() => {
    if (codigo.length === CASAS && estado.fase === 'digitando') validar(codigo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo])

  /* Depois da resposta a tela se rearma sozinha. O erro some rápido; o acerto
     fica mais tempo, porque é nele que o balconista digita o valor da compra. */
  useEffect(() => {
    if (estado.fase === 'erro') {
      const t = setTimeout(reiniciar, 4000)
      return () => clearTimeout(t)
    }
    if (estado.fase === 'ok') {
      const t = setTimeout(reiniciar, 15000)
      return () => clearTimeout(t)
    }
  }, [estado.fase])

  function reiniciar() {
    setDigitos(Array(CASAS).fill(''))
    setValorCompra('')
    setEstado({ fase: 'digitando' })
  }

  async function validar(cod: string) {
    setEstado({ fase: 'validando' })
    try {
      const dados = await api.post<ValidacaoOk>('/api/lojista/validar', { codigo: cod })
      setEstado({ fase: 'ok', dados })
      aoValidar()
    } catch (e) {
      setEstado({
        fase: 'erro',
        mensagem: e instanceof ErroApi ? e.message : 'Não consegui validar agora.',
      })
      setDigitos(Array(CASAS).fill(''))
    }
  }

  function aoDigitar(i: number, valor: string) {
    const limpo = valor.replace(/\D/g, '')
    if (!limpo) {
      const novos = [...digitos]
      novos[i] = ''
      setDigitos(novos)
      return
    }
    // colar o código inteiro numa casa só preenche todas
    const novos = [...digitos]
    for (let k = 0; k < limpo.length && i + k < CASAS; k++) novos[i + k] = limpo[k]
    setDigitos(novos)
    const proximo = Math.min(i + limpo.length, CASAS - 1)
    refs.current[proximo]?.focus()
  }

  function aoTeclar(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digitos[i] && i > 0) {
      const novos = [...digitos]
      novos[i - 1] = ''
      setDigitos(novos)
      refs.current[i - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < CASAS - 1) refs.current[i + 1]?.focus()
  }

  async function informarValor() {
    /* O resgate já está gravado — esta chamada só troca a economia estimada
       pela real. Rota própria, não /validar: aquele código já foi queimado no
       momento em que o cupom passou. */
    if (estado.fase !== 'ok') return
    setSalvandoValor(true)
    try {
      await api.patch(`/api/lojista/resgates/${estado.dados.resgate_id}`, {
        valor_compra: Number(valorCompra.replace('.', '').replace(',', '.')),
      })
      aoValidar()
    } catch {
      /* silencioso de propósito: falhar aqui não afeta o cliente à frente do
         balconista, e o relatório segue com a estimativa da oferta */
    } finally {
      setSalvandoValor(false)
      reiniciar()
    }
  }

  if (estado.fase === 'ok') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-emerald-600 px-6 py-10 text-center text-white">
        <div className="surgir w-full max-w-sm">
          <CheckCirculo className="mx-auto h-20 w-20" />
          <h1 className="mt-4 text-3xl font-extrabold">Cupom válido</h1>

          <div className="mt-6 rounded-2xl bg-white px-5 py-5 text-slate-900">
            <p className="text-sm text-slate-500">Cliente</p>
            <p className="text-2xl font-bold">{estado.dados.cliente}</p>

            <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">
                Aplicar agora
              </p>
              <p className="mt-0.5 text-xl font-extrabold text-emerald-800">
                {estado.dados.aplicar}
              </p>
            </div>

            <p className="mt-3 text-sm text-slate-600">{estado.dados.oferta}</p>
            {estado.dados.regras && (
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{estado.dados.regras}</p>
            )}
          </div>

          <div className="mt-5 rounded-2xl bg-emerald-700/40 p-4 text-left">
            <label className="block">
              <span className="text-sm font-medium text-emerald-50">
                Valor total da compra <span className="text-emerald-200">(opcional)</span>
              </span>
              <div className="mt-1.5 flex gap-2">
                <input
                  value={valorCompra}
                  onChange={(e) => setValorCompra(e.target.value.replace(/[^\d,.]/g, ''))}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="tabular w-full rounded-xl border-0 px-3.5 py-3 text-lg text-slate-900 outline-none"
                />
                <Botao
                  variante="sobreCor"
                  className="shrink-0"
                  carregando={salvandoValor}
                  disabled={!valorCompra}
                  onClick={informarValor}
                >
                  Salvar
                </Botao>
              </div>
            </label>
            <p className="mt-2 text-xs text-emerald-100">
              Informar o valor deixa o relatório de desconto gerado exato em vez de estimado.
            </p>
          </div>

          <button
            onClick={reiniciar}
            className="mt-5 w-full py-3 font-semibold text-emerald-50 underline underline-offset-2"
          >
            Próximo cliente
          </button>
        </div>
      </div>
    )
  }

  if (estado.fase === 'erro') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-red-600 px-6 text-center text-white">
        <div className="surgir max-w-sm">
          <Alerta className="mx-auto h-16 w-16" />
          <h1 className="mt-4 text-2xl font-extrabold">Não deu certo</h1>
          <p className="mt-2 text-lg leading-relaxed text-red-50">{estado.mensagem}</p>
          <Botao variante="sobreCor" className="mt-8" grande largo onClick={reiniciar}>
            Tentar de novo
          </Botao>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-extrabold text-slate-900">Validar cupom</h1>
        <p className="mt-1.5 text-[15px] text-slate-600">
          Digite os 6 números que aparecem no celular do cliente.
        </p>

        <div className="mt-8 flex justify-center gap-2" role="group" aria-label="Código de 6 dígitos">
          {digitos.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el
              }}
              value={d}
              onChange={(e) => aoDigitar(i, e.target.value)}
              onKeyDown={(e) => aoTeclar(i, e)}
              onFocus={(e) => e.target.select()}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={CASAS}
              aria-label={`Dígito ${i + 1}`}
              disabled={estado.fase === 'validando'}
              className="tabular h-16 w-12 rounded-xl border-2 border-slate-300 text-center text-2xl
                font-bold text-slate-900 outline-none transition
                focus:border-roxo-600 focus:ring-4 focus:ring-roxo-100
                disabled:bg-slate-100 sm:h-20 sm:w-14 sm:text-3xl"
            />
          ))}
        </div>

        {estado.fase === 'validando' ? (
          <p className="pulsar-suave mt-6 font-semibold text-roxo-700">Conferindo…</p>
        ) : (
          <p className="mt-6 text-sm text-slate-400">
            O cupom vale 5 minutos. Se expirar, o cliente gera outro na hora.
          </p>
        )}
      </div>
    </div>
  )
}
