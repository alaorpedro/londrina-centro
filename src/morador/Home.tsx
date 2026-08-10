import { useEffect, useMemo, useRef, useState } from 'react'
import { api, query, ErroApi } from '../api'
import type { Config, Oferta, SessaoMorador } from '../tipos'
import { CartaoVitrine, CartaoGrade, CartaoLista } from './CartaoOferta'
import { Aviso, Botao, Vazio } from '../componentes/Ui'
import { EsqueletoHome, Revelar } from '../componentes/Movimento'
import { PanoramaCentro } from '../componentes/Panorama'
import { Busca, Cupom, Raio, Baixar, Fechar, SetaDireita } from '../componentes/Icones'
import { reais, primeiroNome } from '../formato'
import { irPara } from '../rotas'

/*
  A home tem três ritmos, de propósito:

    carrossel  oportunidades relâmpago — largo, colorido, para o olho parar
    grade      destaques da semana — duas colunas, leitura rápida
    lista      todas as ofertas — compacto, para percorrer com o polegar

  Um paredão de cartões idênticos faz o morador rolar sem ler nada. A quebra de
  formato é o que devolve atenção a cada bloco.
*/

export function Home({ sessao, config }: { sessao: SessaoMorador; config: Config | null }) {
  const [ofertas, setOfertas] = useState<Oferta[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [categoria, setCategoria] = useState('')
  const [busca, setBusca] = useState('')
  const [buscaAtiva, setBuscaAtiva] = useState('')

  /* Debounce: o morador digita no 4G do calçadão e uma requisição por tecla
     derrubaria a lista o tempo todo. */
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

  const { relampagos, destaques, demais } = useMemo(
    () => ({
      relampagos: ofertas.filter((o) => o.relampago),
      destaques: ofertas.filter((o) => !o.relampago && o.destaque),
      demais: ofertas.filter((o) => !o.relampago && !o.destaque),
    }),
    [ofertas],
  )

  const filtrando = Boolean(categoria || buscaAtiva)
  const economiaAoAlcance = useMemo(
    () => ofertas.filter((o) => o.disponivel).reduce((s, o) => s + Number(o.economia_estimada), 0),
    [ofertas],
  )

  return (
    <div className="pb-6">
      <Cabecalho sessao={sessao} config={config} ofertas={ofertas.length} />

      <div className="relative z-10 -mt-6 px-4">
        <label className="relative block">
          <Busca className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar loja ou promoção"
            aria-label="Buscar loja ou promoção"
            className="w-full rounded-2xl bg-white py-3.5 pr-4 pl-12 text-base shadow-alta outline-none
              transition placeholder:text-slate-400 focus:ring-2 focus:ring-roxo-300"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              aria-label="Limpar busca"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            >
              <Fechar className="h-4 w-4" />
            </button>
          )}
        </label>
      </div>

      <Categorias categorias={config?.categorias ?? []} atual={categoria} aoTrocar={setCategoria} />

      {!sessao.assinante && (
        <FaixaAssinatura
          config={config}
          logado={sessao.logado}
          economiaAoAlcance={economiaAoAlcance}
        />
      )}

      <InstalarNaTela />

      {erro && (
        <div className="px-4 pt-4">
          <Aviso tipo="erro">{erro}</Aviso>
        </div>
      )}

      {carregando ? (
        <EsqueletoHome />
      ) : ofertas.length === 0 ? (
        <Vazio icone={<Cupom />} titulo="Nenhuma oferta encontrada">
          {filtrando
            ? 'Tente outra categoria ou limpe a busca.'
            : 'Assim que as lojas publicarem, as ofertas aparecem aqui.'}
        </Vazio>
      ) : (
        <div className="space-y-7 pt-6">
          {relampagos.length > 0 && (
            <section>
              <TituloSecao
                titulo="Oportunidades"
                legenda="acabam rápido"
                icone={<Raio className="h-4 w-4 text-ipe-500" />}
              />
              {/*
                Aqui é cascata (atraso por CSS) e não Revelar: o Revelar espera o
                elemento entrar na tela, e num carrossel horizontal o segundo
                cartão nasce fora da viewport — ficaria invisível e o carrossel
                pareceria ter um cartão só, matando a pista de que há mais coisa
                à direita.
              */}
              <div className="rolagem-sem-barra trilho cascata flex gap-3 overflow-x-auto px-4 pb-1">
                {relampagos.map((o, i) => (
                  <div key={o.id} className="shrink-0" style={{ '--i': i } as React.CSSProperties}>
                    <CartaoVitrine oferta={o} aoAbrir={() => irPara(`/oferta/${o.id}`)} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {destaques.length > 0 && (
            <section>
              <TituloSecao titulo="Destaques da semana" legenda="escolhas do clube" />
              <div className="cascata grid grid-cols-2 gap-3 px-4">
                {destaques.map((o, i) => (
                  <div key={o.id} style={{ '--i': i } as React.CSSProperties}>
                    <CartaoGrade oferta={o} aoAbrir={() => irPara(`/oferta/${o.id}`)} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {demais.length > 0 && (
            <section>
              <TituloSecao
                titulo={filtrando ? 'Resultados' : 'Todas as ofertas'}
                legenda={`${demais.length} no centro`}
              />
              <div className="cascata space-y-2.5 px-4">
                {demais.map((o, i) => (
                  <div key={o.id} style={{ '--i': i } as React.CSSProperties}>
                    <CartaoLista oferta={o} aoAbrir={() => irPara(`/oferta/${o.id}`)} />
                  </div>
                ))}
              </div>
            </section>
          )}

          <Revelar>
            <button
              onClick={() => irPara('/mapa')}
              className="pressionavel mx-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-suave"
            >
              <span className="text-sm">
                <span className="block font-bold text-slate-900">Ver as lojas no mapa</span>
                <span className="block text-slate-500">
                  Todas ficam a poucas quadras uma da outra
                </span>
              </span>
              <SetaDireita className="ml-auto h-5 w-5 shrink-0 text-slate-300" />
            </button>
          </Revelar>
        </div>
      )}
    </div>
  )
}

function TituloSecao({
  titulo,
  legenda,
  icone,
}: {
  titulo: string
  legenda?: string
  icone?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-2 px-4">
      <h2 className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight text-slate-900">
        {icone}
        {titulo}
      </h2>
      {legenda && (
        <span className="text-xs font-medium tracking-wide text-slate-400 uppercase">{legenda}</span>
      )}
    </div>
  )
}

/* ---------- cabeçalho ---------- */

function Cabecalho({
  sessao,
  config,
  ofertas,
}: {
  sessao: SessaoMorador
  config: Config | null
  ofertas: number
}) {
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
    <header className="relative overflow-hidden bg-gradient-to-b from-roxo-700 via-roxo-800 to-roxo-900 px-4 pt-6 pb-24 text-white">
      {/* manchas de luz em deriva — o mesmo recurso das capas, para o topo do app
          pertencer ao mesmo sistema visual */}
      <span
        aria-hidden="true"
        className="animate-flutuar pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-roxo-500 opacity-40 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="animate-flutuar pointer-events-none absolute -bottom-28 -left-20 h-56 w-56 rounded-full bg-ipe-400 opacity-15 blur-3xl"
        style={{ animationDelay: '2.5s' }}
      />

      {/* O centro de Londrina ancorado no rodapé do cabeçalho. O `bottom-7` põe
          a linha da calçada acima da busca, que sobe -mt-6 e cobriria o desenho
          justamente onde ficam os ipês e a base da catedral. */}
      <PanoramaCentro className="pointer-events-none absolute inset-x-0 bottom-7 h-[132px] w-full" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-roxo-200">
              {sessao.logado ? `${saudacao}, ${primeiroNome(sessao.morador?.nome)}` : saudacao}
            </p>
            <h1 className="mt-0.5 text-[1.75rem] leading-tight font-extrabold tracking-tight">
              {config?.nome_app ?? 'Londrina Centro'}
            </h1>
          </div>
          {sessao.assinante && (
            <span className="mt-1 shrink-0 rounded-full bg-ipe-400 px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-slate-900 shadow-media">
              ASSINANTE
            </span>
          )}
        </div>

        <p className="mt-1.5 max-w-[22rem] text-sm leading-relaxed text-roxo-100">
          {config?.chamada ?? 'O centro de Londrina com desconto o ano inteiro.'}
        </p>

        {ofertas > 0 && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {ofertas} ofertas ativas agora
          </p>
        )}
      </div>
    </header>
  )
}

/* ---------- categorias ---------- */

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
      className={`pressionavel shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition ${
        ativo
          ? 'bg-roxo-700 text-white shadow-media'
          : 'bg-white text-slate-600 shadow-suave hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  )
}

/* ---------- conversão ----------
   R1/R2: a oferta fica visível, o código é que trava. Esta faixa mostra o total
   que está em jogo agora — é mais concreto que "assine o clube". */

function FaixaAssinatura({
  config,
  logado,
  economiaAoAlcance,
}: {
  config: Config | null
  logado: boolean
  economiaAoAlcance: number
}) {
  const preco = config?.preco_anual ?? 99.9
  const vezes = economiaAoAlcance > 0 ? Math.floor(economiaAoAlcance / preco) : 0

  return (
    <div className="px-4 pt-5">
      <div className="animate-surgir relative overflow-hidden rounded-3xl bg-gradient-to-br from-roxo-700 via-roxo-800 to-roxo-950 p-5 text-white shadow-alta">
        <span
          aria-hidden="true"
          className="animate-flutuar pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-ipe-400 opacity-20 blur-2xl"
        />
        <div className="relative">
          <p className="text-sm leading-relaxed text-roxo-100">
            Você está vendo as ofertas, mas ainda não consegue usar.
          </p>

          {economiaAoAlcance > 0 && (
            <p className="mt-3 text-[15px] leading-snug">
              Tem{' '}
              <strong className="text-ipe-300">{reais(economiaAoAlcance)}</strong> em desconto
              disponível no centro agora
              {vezes >= 2 && (
                <span className="text-roxo-200"> — {vezes}× o valor da assinatura</span>
              )}
              .
            </p>
          )}

          <p className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight">{reais(preco)}</span>
            <span className="text-sm text-roxo-200">por ano · ou 3x sem juros</span>
          </p>

          <Botao
            variante="sobreCor"
            largo
            grande
            className="mt-4"
            onClick={() => irPara(logado ? '/assinar' : '/entrar')}
          >
            Quero assinar
          </Botao>
        </div>
      </div>
    </div>
  )
}

/* ---------- instalação ----------
   No iPhone o push só funciona depois que o app está na tela inicial, e o gesto
   não é óbvio. Esta faixa é o "onboarding dedicado" do escopo: só aparece no
   navegador e some para sempre quando dispensada. */

function InstalarNaTela() {
  const [visivel, setVisivel] = useState(false)
  const eventoRef = useRef<any>(null)

  useEffect(() => {
    if (localStorage.getItem('lc_instalar_dispensado') === '1') return

    const jaInstalado =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    if (jaInstalado) return

    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
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
      <div className="animate-entrar flex items-start gap-3 rounded-2xl bg-roxo-50 p-3.5 ring-1 ring-roxo-100">
        <span className="mt-0.5 rounded-lg bg-roxo-100 p-1.5 text-roxo-600">
          <Baixar className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-roxo-900">Instale na tela inicial</p>
          <p className="mt-0.5 text-sm leading-relaxed text-roxo-800">
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
