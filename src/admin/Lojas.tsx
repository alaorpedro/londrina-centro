import { useEffect, useState } from 'react'
import { api, ErroApi } from '../api'
import type { LojaAdmin } from '../tipos'
import {
  Aviso,
  Botao,
  Campo,
  Cartao,
  Carregando,
  Etiqueta,
  Folha,
  Selecao,
  AreaTexto,
} from '../componentes/Ui'
import { Mais } from '../componentes/Icones'
import { dataBr, numero } from '../formato'

/*
  Cadastro de loja.

  É aqui que o contrato fechado pelo vendedor vira loja no ar. Loja, contrato e
  acesso do lojista são gravados numa transação só no servidor — meia loja
  cadastrada (sem contrato, ou sem login para o balconista) seria pior que
  nenhuma, porque abriria a demonstração com um erro que ninguém entende.
*/

export function AdminLojas() {
  const [lojas, setLojas] = useState<LojaAdmin[]>([])
  const [categorias, setCategorias] = useState<string[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const [renovando, setRenovando] = useState<LojaAdmin | null>(null)

  async function carregar() {
    try {
      const d = await api.get<{ lojas: LojaAdmin[]; categorias: string[] }>('/api/admin/lojas')
      setLojas(d.lojas)
      setCategorias(d.categorias)
      setErro(null)
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não consegui carregar as lojas.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  async function alternar(loja: LojaAdmin) {
    try {
      await api.patch(`/api/admin/lojas/${loja.id}`, {
        acao: loja.status === 'ativa' ? 'pausar' : 'reativar',
      })
      await carregar()
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não consegui mudar essa loja.')
    }
  }

  if (carregando) return <Carregando />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900">Lojas do clube</h2>
          <p className="text-sm text-slate-500">
            {lojas.filter((l) => l.no_ar).length} no ar de {lojas.length} cadastradas
          </p>
        </div>
        <Botao onClick={() => setCriando(true)}>
          <Mais className="h-4 w-4" />
          Cadastrar loja
        </Botao>
      </div>

      {aviso && <Aviso tipo="sucesso">{aviso}</Aviso>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <div className="space-y-2.5">
        {lojas.map((l) => (
          <Cartao key={l.id} className="p-4">
            <div className="flex flex-wrap items-start gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                style={{ backgroundColor: l.cor }}
              >
                {l.nome.slice(0, 2).toUpperCase()}
              </span>

              <div className="min-w-[12rem] flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 className="font-semibold text-slate-900">{l.nome}</h3>
                  {l.no_ar ? (
                    <Etiqueta cor="verde">no ar</Etiqueta>
                  ) : l.status !== 'ativa' ? (
                    <Etiqueta cor="cinza">pausada</Etiqueta>
                  ) : (
                    <Etiqueta cor="vermelho">contrato vencido</Etiqueta>
                  )}
                  {l.demo && <Etiqueta cor="azul">demonstração</Etiqueta>}
                  {l.ofertas_pendentes > 0 && (
                    <Etiqueta cor="verde">{l.ofertas_pendentes} p/ aprovar</Etiqueta>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  {l.categoria} · {l.endereco}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {l.ofertas_ativas} {l.ofertas_ativas === 1 ? 'oferta ativa' : 'ofertas ativas'} ·{' '}
                  {numero(l.resgates_no_mes)} resgates no mês
                  {l.vendedor && ` · vendedor: ${l.vendedor}`}
                </p>
              </div>

              <div className="text-right text-sm">
                {l.contrato_fim ? (
                  <>
                    <p className="text-slate-500">Contrato até</p>
                    <p className="font-semibold text-slate-900">{dataBr(l.contrato_fim)}</p>
                    {l.dias_para_vencer !== null && (
                      <p
                        className={`text-xs ${
                          l.dias_para_vencer < 0
                            ? 'font-semibold text-red-600'
                            : l.dias_para_vencer <= 30
                              ? 'font-semibold text-amber-600'
                              : 'text-slate-400'
                        }`}
                      >
                        {l.dias_para_vencer < 0
                          ? `vencido há ${Math.abs(l.dias_para_vencer)} dias`
                          : `faltam ${l.dias_para_vencer} dias`}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-slate-400">sem contrato</p>
                )}
              </div>

              <div className="flex shrink-0 gap-2">
                <Botao variante="secundario" onClick={() => setRenovando(l)}>
                  Renovar
                </Botao>
                <Botao
                  variante={l.status === 'ativa' ? 'perigo' : 'secundario'}
                  onClick={() => alternar(l)}
                >
                  {l.status === 'ativa' ? 'Pausar' : 'Reativar'}
                </Botao>
              </div>
            </div>
          </Cartao>
        ))}
      </div>

      <FormularioLoja
        aberto={criando}
        categorias={categorias}
        aoFechar={() => setCriando(false)}
        aoCriar={async () => {
          setCriando(false)
          setAviso('Loja cadastrada. O acesso do lojista já está valendo.')
          await carregar()
        }}
      />

      <FormularioRenovacao
        loja={renovando}
        aoFechar={() => setRenovando(null)}
        aoRenovar={async () => {
          setRenovando(null)
          setAviso('Contrato renovado. A loja continua no ar.')
          await carregar()
        }}
      />
    </div>
  )
}

function FormularioLoja({
  aberto,
  categorias,
  aoFechar,
  aoCriar,
}: {
  aberto: boolean
  categorias: string[]
  aoFechar: () => void
  aoCriar: () => Promise<void>
}) {
  const hoje = new Date().toISOString().slice(0, 10)
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const set = (k: string) => (e: { target: { value: string } }) =>
    setCampos((c) => ({ ...c, [k]: e.target.value }))

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await api.post('/api/admin/lojas', {
        ...campos,
        contrato_inicio: campos.contrato_inicio || hoje,
        contrato_valor: campos.contrato_valor
          ? Number(campos.contrato_valor.replace(',', '.'))
          : 0,
      })
      setCampos({})
      await aoCriar()
    } catch (e2) {
      setErro(e2 instanceof ErroApi ? e2.message : 'Não consegui cadastrar a loja.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Folha titulo="Cadastrar loja" aberto={aberto} aoFechar={aoFechar}>
      <form onSubmit={enviar} className="space-y-4">
        <h3 className="text-sm font-bold tracking-wide text-slate-500 uppercase">A loja</h3>

        <Campo rotulo="Nome da loja" value={campos.nome ?? ''} onChange={set('nome')} required />

        <Selecao rotulo="Categoria" value={campos.categoria ?? ''} onChange={set('categoria')} required>
          <option value="">Escolha…</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Selecao>

        <Campo
          rotulo="Endereço"
          value={campos.endereco ?? ''}
          onChange={set('endereco')}
          placeholder="Rua Maranhão, 830 — Calçadão"
          required
        />
        <Campo
          rotulo="Ponto de referência"
          value={campos.referencia ?? ''}
          onChange={set('referencia')}
          placeholder="Em frente à Praça Rocha Pombo"
        />

        <AreaTexto
          rotulo="Descrição"
          rows={2}
          value={campos.descricao ?? ''}
          onChange={set('descricao')}
          dica="Uma frase que apresenta a loja no app."
        />

        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="WhatsApp" value={campos.whatsapp ?? ''} onChange={set('whatsapp')} />
          <Campo
            rotulo="Instagram"
            value={campos.instagram ?? ''}
            onChange={set('instagram')}
            placeholder="@loja"
          />
        </div>

        <Campo
          rotulo="Horário de funcionamento"
          value={campos.horario ?? ''}
          onChange={set('horario')}
          placeholder="Seg a sex 9h–18h · Sáb 9h–13h"
        />

        <div className="grid grid-cols-2 gap-3">
          <Campo
            rotulo="Latitude"
            value={campos.lat ?? ''}
            onChange={set('lat')}
            placeholder="-23.3110"
            dica="Opcional — posiciona no mapa."
          />
          <Campo
            rotulo="Longitude"
            value={campos.lng ?? ''}
            onChange={set('lng')}
            placeholder="-51.1613"
          />
        </div>

        <Campo
          rotulo="Cor da loja"
          type="color"
          value={campos.cor ?? '#052A52'}
          onChange={set('cor')}
          dica="Identifica a loja nos cartões e no mapa."
        />

        <hr className="border-slate-200" />
        <h3 className="text-sm font-bold tracking-wide text-slate-500 uppercase">O contrato</h3>

        <Campo
          rotulo="Vendedor responsável"
          value={campos.vendedor ?? ''}
          onChange={set('vendedor')}
          placeholder="Quem fechou o contrato"
        />

        <div className="grid grid-cols-2 gap-3">
          <Campo
            rotulo="Início"
            type="date"
            value={campos.contrato_inicio ?? hoje}
            onChange={set('contrato_inicio')}
          />
          <Campo
            rotulo="Fim"
            type="date"
            value={campos.contrato_fim ?? ''}
            onChange={set('contrato_fim')}
            required
          />
        </div>

        <Campo
          rotulo="Valor do contrato (R$)"
          value={campos.contrato_valor ?? ''}
          onChange={set('contrato_valor')}
          inputMode="decimal"
          placeholder="249,00"
        />

        <AreaTexto
          rotulo="Observações"
          rows={2}
          value={campos.observacao ?? ''}
          onChange={set('observacao')}
        />

        <hr className="border-slate-200" />
        <h3 className="text-sm font-bold tracking-wide text-slate-500 uppercase">
          Acesso do lojista
        </h3>
        <Aviso tipo="info">
          Este é o login que o dono e o balconista vão usar para validar cupons. Combine a senha com
          a loja e mande junto com o link.
        </Aviso>

        <Campo
          rotulo="Nome do responsável"
          value={campos.nome_lojista ?? ''}
          onChange={set('nome_lojista')}
        />
        <Campo
          rotulo="E-mail de acesso"
          type="email"
          value={campos.email_lojista ?? ''}
          onChange={set('email_lojista')}
          required
        />
        <Campo
          rotulo="Senha inicial"
          value={campos.senha_lojista ?? ''}
          onChange={set('senha_lojista')}
          dica="Pelo menos 6 caracteres."
          required
        />

        {erro && <Aviso tipo="erro">{erro}</Aviso>}

        <div className="flex gap-2 pt-2">
          <Botao type="submit" largo carregando={enviando}>
            Cadastrar e colocar no ar
          </Botao>
          <Botao type="button" variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
        </div>
      </form>
    </Folha>
  )
}

function FormularioRenovacao({
  loja,
  aoFechar,
  aoRenovar,
}: {
  loja: LojaAdmin | null
  aoFechar: () => void
  aoRenovar: () => Promise<void>
}) {
  const hoje = new Date().toISOString().slice(0, 10)
  const [fim, setFim] = useState('')
  const [valor, setValor] = useState('')
  const [vendedor, setVendedor] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (loja) {
      setVendedor(loja.vendedor ?? '')
      setValor(loja.contrato_valor ? String(loja.contrato_valor) : '')
      setFim('')
      setErro(null)
    }
  }, [loja])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!loja) return
    setErro(null)
    setEnviando(true)
    try {
      await api.patch(`/api/admin/lojas/${loja.id}`, {
        acao: 'renovar',
        inicio: hoje,
        fim,
        valor: Number(valor.replace(',', '.')) || 0,
        vendedor,
      })
      await aoRenovar()
    } catch (e2) {
      setErro(e2 instanceof ErroApi ? e2.message : 'Não consegui renovar o contrato.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Folha
      titulo={loja ? `Renovar contrato · ${loja.nome}` : 'Renovar contrato'}
      aberto={Boolean(loja)}
      aoFechar={aoFechar}
      largura="max-w-md"
    >
      {loja && (
        <form onSubmit={enviar} className="space-y-4">
          {loja.contrato_fim && (
            <Aviso tipo={(loja.dias_para_vencer ?? 0) < 0 ? 'atencao' : 'info'}>
              Contrato atual vai até <strong>{dataBr(loja.contrato_fim)}</strong>
              {(loja.dias_para_vencer ?? 0) < 0 && ' — já vencido, a loja está fora do app.'}
            </Aviso>
          )}

          <Campo
            rotulo="Nova data de fim"
            type="date"
            value={fim}
            min={hoje}
            onChange={(e) => setFim(e.target.value)}
            required
          />
          <Campo
            rotulo="Valor do contrato (R$)"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            inputMode="decimal"
          />
          <Campo
            rotulo="Vendedor responsável"
            value={vendedor}
            onChange={(e) => setVendedor(e.target.value)}
          />

          {erro && <Aviso tipo="erro">{erro}</Aviso>}

          <div className="flex gap-2 pt-2">
            <Botao type="submit" largo carregando={enviando}>
              Renovar
            </Botao>
            <Botao type="button" variante="secundario" onClick={aoFechar}>
              Cancelar
            </Botao>
          </div>
        </form>
      )}
    </Folha>
  )
}
