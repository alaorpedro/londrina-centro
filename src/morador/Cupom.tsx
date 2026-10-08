import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ErroApi } from '../api'
import type { EstadoCupom } from '../tipos'
import { Botao, Carregando, Aviso } from '../componentes/Ui'
import { AnelProgresso, useContagem } from '../componentes/Movimento'
import { CheckCirculo, Relogio, Seta } from '../componentes/Icones'
import { codigoLegivel, reais, relogio } from '../formato'
import { irPara } from '../rotas'

/*
  A tela do cupom. É o momento em que o app encosta no balcão: o morador segura o
  celular na frente do atendente e não vai ficar procurando botão.

  Três estados, e só três:
    pendente  → o código gigante e o anel correndo
    validado  → confirmação verde com a economia contando
    expirado  → explicação e o caminho de volta

  A tela consulta o servidor a cada 2,5s. Assim que o balconista valida, ela vira
  sozinha — o morador não faz nada, e o atendente vê a confirmação acontecendo no
  celular do cliente. Isso encerra a dúvida de "deu certo?" dos dois lados ao
  mesmo tempo.
*/

const INTERVALO_MS = 2500
const VALIDADE_S = 5 * 60

export function Cupom({ id }: { id: string }) {
  const [estado, setEstado] = useState<EstadoCupom | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [restante, setRestante] = useState(VALIDADE_S)
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

  /* Consulta enquanto está pendente. Para assim que resolve — nada de bater no
     servidor para sempre com a tela aberta no bolso. */
  useEffect(() => {
    if (!estado || estado.status !== 'pendente') return
    const t = window.setInterval(buscar, INTERVALO_MS)
    return () => window.clearInterval(t)
  }, [estado, buscar])

  /* Contagem local, para o anel ser suave. Quem manda de verdade é o servidor:
     quando o tempo acaba aqui, forçamos uma última consulta. */
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

  const proporcao = Math.max(0, Math.min(1, restante / VALIDADE_S))
  const acabando = restante <= 60

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-navy-800 text-white">
      <span
        aria-hidden="true"
        className="animate-flutuar pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-navy-500 opacity-40 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="animate-flutuar pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-navy-600 opacity-35 blur-3xl"
        style={{ animationDelay: '3s' }}
      />

      <header className="relative flex items-center gap-2 px-2 py-3">
        <button
          onClick={() => irPara('/')}
          aria-label="Voltar"
          className="pressionavel rounded-xl p-2 text-navy-200 hover:bg-white/10"
        >
          <Seta />
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-navy-100">
          {estado.loja_nome}
        </p>
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center px-6 pb-10 text-center">
        <p className="animate-entrar text-sm text-navy-200">Mostre este código ao atendente</p>

        <div className="animate-escala mt-6">
          <AnelProgresso
            proporcao={proporcao}
            tamanho={272}
            espessura={7}
            cor={acabando ? 'var(--color-amarelo-400)' : '#ffffff'}
          >
            {/* 2,6rem é o teto: acima disso os seis dígitos encostam no anel
                num iPhone de 375px, e código apertado é código lido errado */}
            <span
              className="tabular text-[2.6rem] leading-none font-extrabold tracking-[0.05em] sm:text-5xl"
              aria-label={`Código ${estado.codigo.split('').join(' ')}`}
            >
              {codigoLegivel(estado.codigo)}
            </span>
            <span
              className={`tabular mt-3 flex items-center gap-1.5 text-sm font-bold ${
                acabando ? 'animate-pulsar text-amarelo-300' : 'text-navy-200'
              }`}
            >
              <Relogio className="h-4 w-4" />
              {relogio(restante)}
            </span>
          </AnelProgresso>
        </div>

        <h1 className="animate-entrar mt-7 max-w-xs text-lg leading-snug font-bold">
          {estado.titulo}
        </h1>

        <p className="mt-8 max-w-xs text-xs leading-relaxed text-navy-300">
          O atendente digita esses números no painel da loja. Não feche esta tela até a confirmação
          aparecer.
        </p>
      </div>
    </div>
  )
}

function Confirmado({ estado }: { estado: EstadoCupom }) {
  const economia = useContagem(Number(estado.economia) || 0, 1200)

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-emerald-600 px-6 text-center text-white">
      <span
        aria-hidden="true"
        className="animate-flutuar pointer-events-none absolute -top-28 -left-20 h-72 w-72 rounded-full bg-emerald-400 opacity-40 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="animate-flutuar pointer-events-none absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-emerald-300 opacity-30 blur-3xl"
        style={{ animationDelay: '2s' }}
      />

      <div className="relative">
        <div className="animate-escala">
          <CheckCirculo className="mx-auto h-24 w-24" />
        </div>
        <h1 className="animate-surgir mt-5 text-3xl font-extrabold tracking-tight">Pronto!</h1>
        <p className="animate-surgir mt-1 text-emerald-50" style={{ animationDelay: '80ms' }}>
          Cupom usado em {estado.loja_nome}
        </p>

        {Number(estado.economia) > 0 && (
          <div
            className="animate-surgir mt-8 rounded-3xl bg-white/15 px-10 py-6 backdrop-blur"
            style={{ animationDelay: '160ms' }}
          >
            <p className="text-sm text-emerald-50">Você economizou</p>
            <p className="mt-1 text-5xl font-extrabold tracking-tight">{reais(economia)}</p>
          </div>
        )}

        <p
          className="animate-surgir mt-6 max-w-xs text-sm text-emerald-50"
          style={{ animationDelay: '240ms' }}
        >
          {estado.titulo}
        </p>

        <div
          className="animate-surgir mt-10 flex w-full max-w-xs flex-col gap-2"
          style={{ animationDelay: '320ms' }}
        >
          <Botao variante="sobreCor" largo grande onClick={() => irPara('/')}>
            Ver outras ofertas
          </Botao>
          <button
            onClick={() => irPara('/conta')}
            className="py-2.5 text-sm font-bold text-emerald-50 underline underline-offset-4"
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
      <div className="animate-escala flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-slate-400 shadow-media">
        <Relogio className="h-9 w-9" />
      </div>
      <h1 className="animate-surgir mt-5 text-xl font-extrabold text-slate-900">O código expirou</h1>
      <p className="animate-surgir mt-2 max-w-xs text-[15px] leading-relaxed text-slate-600">
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
