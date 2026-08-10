import { useEffect, useMemo, useRef, useState } from 'react'
import { api, query, ErroApi } from '../api'
import type { Config, Oferta, SessaoMorador } from '../tipos'
import { CartaoOferta } from './CartaoOferta'
import { Aviso, Botao, Carregando, Vazio } from '../componentes/Ui'
import { Busca, Cupom, Raio, Baixar, Fechar } from '../componentes/Icones'
import { reais, primeiroNome } from '../formato'
import { irPara } from '../rotas'

export function Home({ sessao, config }: { sessao: SessaoMorador; config: Config | null }) {
  const [ofertas, setOfertas] = useState<Oferta[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [categoria, setCategoria] = useState('')
  const [busca, setBusca] = useState('')
  const [buscaAtiva, setBuscaAtiva] = useState('')

  /* Debounce da busca: o morador digita no 4G do calçadão e uma requisição por
     tecla derrubaria a lista o tempo todo. */
  useEffect(() => {
    const t = setTimeout(() => setBuscaAtiva(busca.trim()), 350)
    return () => clearTimeout(t)
  }, [busca])

  useEffect(() => {
    const controle = new AbortController()
    setCarregando(true)
    api
      .get<{ ofertas: Oferta[] }>(
        `/api/morador/ofertas${query({ categoria, busca: buscaAtiva })}`,
        controle.signal,
      )
      .then((d) => {
        setOfertas(d.ofertas)
        setErro(null)
      })
      .catch((e) => {
        if ((e as Error).name === 'AbortError') return
        setErro(e instanceof ErroApi ? e.message : 'Não consegui carregar as ofertas.')
      })
      .finally(() => setCarregando(false))
    return () => controle.abort()
  }, [categoria, buscaAtiva])

  const { relampagos, destaques, demais } = useMemo(() => {
    const relampagos = ofertas.filter((o) => o.relampago)
    const destaques = ofertas.filter((o) => !o.relampago && o.destaque)
    const demais = ofertas.filter((o) => !o.relampago && !o.destaque)
    return { relampagos, destaques, demais }
  }, [ofertas])

  const filtrando = Boolean(categoria || buscaAtiva)

  return (
    <div className="pb-4">
      <Cabecalho sessao={sessao} config={config} />

      <div className="px-4">
        <label className="relative block">
          <Busca className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar loja ou promoção"
            aria-label="Buscar loja ou promoção"
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pr-3.5 pl-11 text-base
              outline-none focus:border-roxo-500 focus:ring-2 focus:ring-roxo-200"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              aria-label="Limpar busca"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            >
              <Fechar className="h-4 w-4" />
            </button>
          )}
        </label>
      </div>

      <Categorias categorias={config?.categorias ?? []} atual={categoria} aoTrocar={setCategoria} />

      {!sessao.assinante && <FaixaAssinatura config={config} logado={sessao.logado} />}

      <InstalarNaTela />

      {erro && (
        <div className="px-4 pt-4">
          <Aviso tipo="erro">{erro}</Aviso>
        </div>
      )}

      {carregando ? (
        <Carregando texto="Buscando as ofertas do centro…" />
      ) : ofertas.length === 0 ? (
        <Vazio icone={<Cupom />} titulo="Nenhuma oferta encontrada">
          {filtrando
            ? 'Tente outra categoria ou limpe a busca.'
            : 'Assim que as lojas publicarem, as ofertas aparecem aqui.'}
        </Vazio>
      ) : (
        <div className="space-y-6 px-4 pt-5">
          {relampagos.length > 0 && (
            <Secao
              titulo="Oportunidades"
              legenda="Acabam rápido"
              icone={<Raio className="h-4 w-4 text-ipe-500" />}
            >
              {relampagos.map((o) => (
                <CartaoOferta key={o.id} oferta={o} aoAbrir={() => irPara(`/oferta/${o.id}`)} />
              ))}
            </Secao>
          )}

          {destaques.length > 0 && (
            <Secao titulo="Destaques da semana">
              {destaques.map((o) => (
                <CartaoOferta key={o.id} oferta={o} aoAbrir={() => irPara(`/oferta/${o.id}`)} />
              ))}
            </Secao>
          )}

          {demais.length > 0 && (
            <Secao
              titulo={filtrando ? 'Resultados' : 'Todas as ofertas'}
              legenda={`${demais.length} no centro`}
            >
              {demais.map((o) => (
                <CartaoOferta key={o.id} oferta={o} aoAbrir={() => irPara(`/oferta/${o.id}`)} />
              ))}
            </Secao>
          )}
        </div>
      )}
    </div>
  )
}

function Secao({
  titulo,
  legenda,
  icone,
  children,
}: {
  titulo: string
  legenda?: string
  icone?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-bold text-slate-900">
          {icone}
          {titulo}
        </h2>
        {legenda && <span className="text-xs text-slate-500">{legenda}</span>}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  )
}

function Cabecalho({ sessao, config }: { sessao: SessaoMorador; config: Config | null }) {
  const saudacao = useMemo(() => {
    const h = Number(
      new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        hour12: false,
      }).format(new Date()),
    )
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }, [])

  return (
    <header className="bg-roxo-800 px-4 pt-5 pb-6 text-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-roxo-200">
            {sessao.logado ? `${saudacao}, ${primeiroNome(sessao.morador?.nome)}` : saudacao}
          </p>
          <h1 className="mt-0.5 text-2xl leading-tight font-extrabold">
            {config?.nome_app ?? 'Londrina Centro'}
          </h1>
          <p className="mt-1 text-sm text-roxo-100">
            {config?.chamada ?? 'O centro de Londrina com desconto o ano inteiro.'}
          </p>
        </div>
        {sessao.assinante && (
          <span className="mt-1 shrink-0 rounded-full bg-ipe-400 px-2.5 py-1 text-[11px] font-bold text-slate-900">
            ASSINANTE
          </span>
        )}
      </div>
    </header>
  )
}

function Categorias({
  categorias,
  atual,
  aoTrocar,
}: {
  categorias: string[]
  atual: string
  aoTrocar: (c: string) => void
}) {
  if (!categorias.length) return null
  return (
    <div className="rolagem-sem-barra mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
      <Chip ativo={!atual} aoClicar={() => aoTrocar('')}>
        Tudo
      </Chip>
      {categorias.map((c) => (
        <Chip key={c} ativo={atual === c} aoClicar={() => aoTrocar(atual === c ? '' : c)}>
          {c}
        </Chip>
      ))}
    </div>
  )
}

function Chip({
  ativo,
  aoClicar,
  children,
}: {
  ativo: boolean
  aoClicar: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={aoClicar}
      className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium whitespace-nowrap transition
        ${
          ativo
            ? 'border-roxo-700 bg-roxo-700 text-white'
            : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
        }`}
    >
      {children}
    </button>
  )
}

/* R1/R2: a oferta fica visível, o código é que trava. Esta faixa é a conversão
   — ela precisa dizer o preço e o que ele destrava, sem rodeio. */
function FaixaAssinatura({ config, logado }: { config: Config | null; logado: boolean }) {
  return (
    <div className="px-4 pt-4">
      <div className="rounded-2xl bg-gradient-to-br from-roxo-700 to-roxo-900 p-4 text-white shadow-sm">
        <p className="text-sm leading-relaxed">
          Você está vendo as ofertas, mas ainda não consegue usá-las.
        </p>
        <p className="mt-1 text-lg font-bold">
          {config ? `${reais(config.preco_anual)} por ano` : 'Assine o clube'}
          <span className="ml-1 text-sm font-normal text-roxo-200">
            {config ? `ou ${config.parcelas_max}x sem juros` : ''}
          </span>
        </p>
        <Botao
          variante="sobreCor"
          largo
          className="mt-3"
          onClick={() => irPara(logado ? '/assinar' : '/entrar')}
        >
          Quero assinar
        </Botao>
      </div>
    </div>
  )
}

/*
  No iPhone o push só funciona depois que o app está na tela inicial, e o gesto
  não é óbvio. Esta faixa é o que o escopo chama de "onboarding dedicado": ela
  só aparece para quem está no navegador, e some para sempre quando dispensada.
*/
function InstalarNaTela() {
  const [visivel, setVisivel] = useState(false)
  const eventoRef = useRef<any>(null)

  useEffect(() => {
    if (localStorage.getItem('lc_instalar_dispensado') === '1') return

    const jaInstalado =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    if (jaInstalado) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (ios) {
      setVisivel(true)
      return
    }

    const capturar = (e: Event) => {
      e.preventDefault()
      eventoRef.current = e
      setVisivel(true)
    }
    window.addEventListener('beforeinstallprompt', capturar)
    return () => window.removeEventListener('beforeinstallprompt', capturar)
  }, [])

  if (!visivel) return null

  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)

  const dispensar = () => {
    localStorage.setItem('lc_instalar_dispensado', '1')
    setVisivel(false)
  }

  const instalar = async () => {
    if (eventoRef.current) {
      eventoRef.current.prompt()
      await eventoRef.current.userChoice
      dispensar()
    }
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex items-start gap-3 rounded-2xl border border-roxo-200 bg-roxo-50 p-3.5">
        <Baixar className="mt-0.5 h-5 w-5 shrink-0 text-roxo-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-roxo-900">Instale na tela inicial</p>
          <p className="mt-0.5 text-sm text-roxo-800">
            {ios
              ? 'Toque em Compartilhar e depois em “Adicionar à Tela de Início” para receber os avisos de oferta.'
              : 'Fica igual a um aplicativo e você passa a receber os avisos de oferta.'}
          </p>
          {!ios && (
            <button
              onClick={instalar}
              className="mt-2 text-sm font-bold text-roxo-700 underline underline-offset-2"
            >
              Instalar agora
            </button>
          )}
        </div>
        <button
          onClick={dispensar}
          aria-label="Dispensar"
          className="rounded-lg p-1.5 text-roxo-400 hover:bg-roxo-100"
        >
          <Fechar className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
