import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ErroApi } from '../api'
import type { EstadoCupom } from '../tipos'
import { Botao, Carregando, Aviso } from '../componentes/Ui'
import { CheckCirculo, Relogio, Seta } from '../componentes/Icones'
import { codigoLegivel, reais, relogio } from '../formato'
import { irPara } from '../rotas'

/*
  A tela do cupom. É o momento em que o app encosta no balcão: o morador segura
  o celular na frente do atendente e não vai ficar procurando botão.

  Três estados, e só três:
    pendente  → o código gigante e o relógio correndo
    validado  → confirmação verde com a economia
    expirado  → explicação e o caminho de volta

  A tela consulta o servidor a cada 2,5s. Assim que o balconista valida, ela
  vira sozinha — o morador não precisa fazer nada, e o atendente vê a
  confirmação acontecendo no celular do cliente. Isso encerra a dúvida de "deu
  certo?" dos dois lados ao mesmo tempo.
*/

const INTERVALO_MS = 2500

export function Cupom({ id }: { id: string }) {
  const [estado, setEstado] = useState<EstadoCupom | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [restante, setRestante] = useState(0)
  const timerRef = useRef<number | null>(null)

  const buscar = useCallback(async () => {
    try {
      const d = await api.get<EstadoCupom>(`/api/morador/resgates/${id}`)
      setEstado(d)
      setErro(null)
      return d
    } catch (e) {
      const err = e as ErroApi
      if (err.precisaEntrar) irPara('/entrar')
      else setErro(err.message)
      return null
    }
  }, [id])

  useEffect(() => {
    buscar()
  }, [buscar])

  /* Consulta enquanto está pendente. Para de consultar assim que resolve —
     nada de bater no servidor para sempre com a tela aberta no bolso. */
  useEffect(() => {
    if (!estado || estado.status !== 'pendente') return
    const t = window.setInterval(buscar, INTERVALO_MS)
    return () => window.clearInterval(t)
  }, [estado, buscar])

  /* Contagem regressiva local, para o relógio ser suave. Quem manda de verdade
     é o servidor: quando o tempo acaba aqui, forçamos uma última consulta. */
  useEffect(() => {
    if (!estado || estado.status !== 'pendente') return

    const calcular = () => {
      const falta = Math.max(0, (new Date(estado.expira_em).getTime() - Date.now()) / 1000)
      setRestante(falta)
      if (falta <= 0) buscar()
    }

    calcular()
    timerRef.current = window.setInterval(calcular, 250)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [estado, buscar])

  if (erro) {
    return (
      <div className="p-5">
        <Aviso tipo="erro">{erro}</Aviso>
        <Botao className="mt-4" variante="secundario" onClick={() => irPara('/')}>
          Voltar para as ofertas
        </Botao>
      </div>
    )
  }

  if (!estado) return <Carregando texto="Preparando seu cupom…" />

  if (estado.status === 'validado') return <Confirmado estado={estado} />
  if (estado.status !== 'pendente') return <Expirado estado={estado} />

  const total = 5 * 60
  const proporcao = Math.max(0, Math.min(1, restante / total))
  const acabando = restante <= 60

  return (
    <div className="flex min-h-screen flex-col bg-roxo-800 text-white">
      <header className="flex items-center gap-2 px-2 py-3">
        <button
          onClick={() => irPara('/')}
          aria-label="Voltar"
          className="rounded-lg p-2 text-roxo-200 hover:bg-roxo-700"
        >
          <Seta />
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-roxo-100">
          {estado.loja_nome}
        </p>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10 text-center">
        <p className="text-sm text-roxo-200">Mostre este código ao atendente</p>

        <p
          className="tabular surgir mt-4 text-[3.5rem] leading-none font-extrabold tracking-[0.08em] sm:text-7xl"
          aria-label={`Código ${estado.codigo.split('').join(' ')}`}
        >
          {codigoLegivel(estado.codigo)}
        </p>

        <h1 className="mt-5 max-w-xs text-lg leading-snug font-bold">{estado.titulo}</h1>

        {/* relógio: barra + número, porque no balcão a leitura é de relance */}
        <div className="mt-8 w-full max-w-xs">
          <div className="h-2 overflow-hidden rounded-full bg-roxo-900/60">
            <div
              className={`h-full rounded-full transition-[width] duration-250 ease-linear ${
                acabando ? 'bg-ipe-400' : 'bg-white'
              }`}
              style={{ width: `${proporcao * 100}%` }}
            />
          </div>
          <p
            className={`tabular mt-2.5 flex items-center justify-center gap-1.5 text-sm font-semibold ${
              acabando ? 'pulsar-suave text-ipe-300' : 'text-roxo-200'
            }`}
          >
            <Relogio className="h-4 w-4" />
            expira em {relogio(restante)}
          </p>
        </div>

        <p className="mt-8 max-w-xs text-xs leading-relaxed text-roxo-300">
          O atendente digita esses números no painel da loja. Não feche esta tela até a confirmação
          aparecer.
        </p>
      </div>
    </div>
  )
}

function Confirmado({ estado }: { estado: EstadoCupom }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-emerald-600 px-6 text-center text-white">
      <div className="surgir">
        <CheckCirculo className="mx-auto h-20 w-20" />
        <h1 className="mt-5 text-2xl font-extrabold">Pronto!</h1>
        <p className="mt-1 text-emerald-50">Cupom usado em {estado.loja_nome}</p>

        {estado.economia > 0 && (
          <div className="mt-8 rounded-2xl bg-emerald-700/50 px-8 py-5">
            <p className="text-sm text-emerald-100">Você economizou</p>
            <p className="tabular mt-0.5 text-4xl font-extrabold">{reais(estado.economia)}</p>
          </div>
        )}

        <p className="mt-6 max-w-xs text-sm text-emerald-50">{estado.titulo}</p>

        <div className="mt-10 flex w-full max-w-xs flex-col gap-2">
          <Botao variante="sobreCor" largo grande onClick={() => irPara('/')}>
            Ver outras ofertas
          </Botao>
          <button
            onClick={() => irPara('/conta')}
            className="py-2 text-sm font-semibold text-emerald-100 underline underline-offset-2"
          >
            Quanto já economizei no total
          </button>
        </div>
      </div>
    </div>
  )
}

function Expirado({ estado }: { estado: EstadoCupom }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-slate-500">
        <Relogio className="h-8 w-8" />
      </div>
      <h1 className="mt-5 text-xl font-bold text-slate-900">O código expirou</h1>
      <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-slate-600">
        Cupons valem 5 minutos por segurança. Você não perdeu nada — é só gerar outro quando estiver
        pronto para usar.
      </p>
      <p className="mt-4 text-sm text-slate-500">{estado.titulo}</p>
      <Botao className="mt-8" grande onClick={() => irPara('/')}>
        Voltar para as ofertas
      </Botao>
    </div>
  )
}
