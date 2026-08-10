import { useState } from 'react'
import { api, ErroApi } from '../api'
import { Aviso, Botao, Campo } from '../componentes/Ui'
import { Seta } from '../componentes/Icones'
import { irPara } from '../rotas'

/*
  Entrada do morador. WhatsApp é o identificador porque é o número que ele sabe
  de cor e o canal por onde a régua de renovação vai falar com ele depois.

  A verificação do número por código (SMS/WhatsApp) é Fase 1 — no piloto o
  cadastro entra direto para a apresentação não travar em SMS.
*/

export function Entrar({ aoEntrar }: { aoEntrar: () => Promise<void> }) {
  const [modo, setModo] = useState<'entrar' | 'cadastro'>('entrar')
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [bairro, setBairro] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      if (modo === 'entrar') {
        await api.post('/api/morador/entrar', { whatsapp, senha })
      } else {
        await api.post('/api/morador/cadastro', { nome, whatsapp, senha, bairro })
      }
      await aoEntrar()
      irPara('/')
    } catch (e2) {
      setErro(e2 instanceof ErroApi ? e2.message : 'Não consegui completar. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center gap-2 px-2 py-3">
        <button
          onClick={() => irPara('/')}
          aria-label="Voltar"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        >
          <Seta />
        </button>
      </header>

      <div className="mx-auto max-w-sm px-5 pb-12">
        <h1 className="text-2xl font-extrabold text-slate-900">
          {modo === 'entrar' ? 'Entrar no clube' : 'Criar minha conta'}
        </h1>
        <p className="mt-1.5 text-[15px] text-slate-600">
          {modo === 'entrar'
            ? 'Use o WhatsApp que você cadastrou.'
            : 'Leva menos de um minuto. Depois é só assinar para liberar os cupons.'}
        </p>

        <form onSubmit={enviar} className="mt-6 space-y-4">
          {modo === 'cadastro' && (
            <Campo
              rotulo="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="name"
              placeholder="Como você quer ser chamado"
              required
            />
          )}

          <Campo
            rotulo="WhatsApp"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
            placeholder="43 99999-0000"
            dica="Com DDD. É por aqui que avisamos das ofertas novas."
            required
          />

          {modo === 'cadastro' && (
            <Campo
              rotulo="Seu bairro"
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              placeholder="Gleba Palhano, Igapó, Centro…"
              dica="Ajuda a mostrar de onde vem quem visita o centro."
            />
          )}

          <Campo
            rotulo="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
            placeholder="Pelo menos 6 caracteres"
            required
          />

          {erro && <Aviso tipo="erro">{erro}</Aviso>}

          <Botao type="submit" largo grande carregando={enviando}>
            {modo === 'entrar' ? 'Entrar' : 'Criar conta'}
          </Botao>
        </form>

        <button
          onClick={() => {
            setModo(modo === 'entrar' ? 'cadastro' : 'entrar')
            setErro(null)
          }}
          className="mt-5 w-full py-2 text-sm text-slate-600"
        >
          {modo === 'entrar' ? (
            <>
              Ainda não tem conta? <span className="font-bold text-roxo-700">Cadastre-se</span>
            </>
          ) : (
            <>
              Já tem conta? <span className="font-bold text-roxo-700">Entrar</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
