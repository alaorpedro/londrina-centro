export type TipoOferta = 'percentual' | 'valor_fixo' | 'leve_pague' | 'brinde'
export type PeriodoLimite = 'total' | 'mes' | 'semana' | 'dia'

export type Config = {
  nome_app: string
  chamada: string
  preco_anual: number
  preco_pix: number
  parcelas_max: number
  categorias: string[]
  demo: boolean
}

export type Oferta = {
  id: number
  titulo: string
  descricao: string | null
  tipo: TipoOferta
  valor_desconto: number
  economia_estimada: number
  regras: string | null
  inicio: string
  fim: string
  dias_semana: number[]
  hora_inicio: string | null
  hora_fim: string | null
  limite_total: number | null
  limite_por_morador: number
  periodo_limite: PeriodoLimite
  relampago: boolean
  destaque: boolean
  status: string
  loja_id: number
  loja_nome: string
  categoria: string
  endereco: string
  cor: string
  usados: number
  meus_no_periodo: number
  /* calculados no servidor — o front só exibe */
  aplicar: string
  disponivel: boolean
  motivo: string | null
  restantes: number | null
}

export type Loja = {
  id: number
  nome: string
  categoria: string
  descricao: string | null
  endereco: string
  referencia: string | null
  lat: number | null
  lng: number | null
  whatsapp: string | null
  instagram: string | null
  horario: string | null
  cor: string
  status: string
  demo?: boolean
  ofertas_ativas?: number
}

export type Assinatura = {
  status: string
  vence_em: string
  dias_restantes: number
  valor: number
  forma: string
  parcelas: number
  ativa?: boolean
  inicio?: string
}

export type SessaoMorador = {
  logado: boolean
  morador?: { id: number; nome: string; whatsapp: string; bairro: string | null }
  assinante?: boolean
  assinatura?: Assinatura | null
}

export type Cupom = {
  id: number | string
  codigo: string
  expira_em: string
  loja: string
  titulo: string
  aplicar: string
}

export type EstadoCupom = {
  id: number | string
  codigo: string
  status: 'pendente' | 'validado' | 'expirado' | 'cancelado'
  expira_em: string
  validado_em: string | null
  economia: number
  titulo: string
  loja_nome: string
}

export type ResgateMorador = {
  id: number
  codigo: string
  status: string
  dia: string
  validado_em: string
  economia: number
  titulo: string
  loja_nome: string
  cor: string
}

export type ContaMorador = {
  resgates: ResgateMorador[]
  economia_total: number
  usos: number
  assinatura: Assinatura | null
}

/* ---------- lojista ---------- */

export type SessaoLojista = {
  logado: boolean
  lojista?: {
    id: number
    nome: string
    papel: string
    loja_id: number
    loja_nome: string
    cor: string
    categoria: string
  }
}

export type ValidacaoOk = {
  ok: true
  resgate_id: number
  cliente: string
  oferta: string
  regras: string | null
  aplicar: string
  economia: number
  valor_compra: number | null
}

export type PainelLojista = {
  hoje: string
  de: string
  resumo: {
    hoje: number
    semana: number
    mes: number
    periodo: number
    economia: number
    clientes: number
  }
  por_dia: { dia: string; n: number; economia: number }[]
  por_hora: { hora: number; n: number }[]
  por_oferta: { id: number; titulo: string; n: number; economia: number }[]
  ofertas: (Oferta & { aplicar: string })[]
  contrato: {
    vendedor: string | null
    inicio: string
    fim: string
    status: string
    dias_restantes: number
  } | null
}

export type ResgateLoja = {
  id: number
  codigo: string
  dia: string
  validado_em: string
  valor_compra: number | null
  economia: number
  titulo: string
  morador_nome: string
  validado_por_nome: string | null
}

/* ---------- admin ---------- */

export type PainelAdmin = {
  hoje: string
  assinantes: {
    pagantes: number
    vencidas: number
    novos_no_mes: number
    receita_mes: number
    receita_total: number
  }
  resgates: { total: number; no_mes: number; economia: number; moradores_ativos: number }
  lojas: { total: number; no_ar: number }
  alertas: {
    ofertas_pendentes: number
    contratos_vencendo: number
    assinaturas_vencendo: number
    lojas_sem_oferta: number
    lojas_sem_resgate: number
    assinantes_sem_uso: number
  }
  por_dia: { dia: string; n: number }[]
}

export type LojaAdmin = Loja & {
  contrato_id: number | null
  vendedor: string | null
  contrato_inicio: string | null
  contrato_fim: string | null
  contrato_status: string | null
  contrato_valor: number | null
  ofertas_ativas: number
  ofertas_pendentes: number
  resgates_no_mes: number
  logins: number
  dias_para_vencer: number | null
  no_ar: boolean
}

export type OfertaAdmin = Oferta & { loja_nome: string; resgates: number }

export type AssinanteAdmin = {
  id: number
  nome: string
  whatsapp: string
  bairro: string | null
  criado_em: string
  status: string | null
  valor: number | null
  forma: string | null
  parcelas: number | null
  inicio: string | null
  vence_em: string | null
  usos: number
  economia: number
  ativa: boolean
  dias_restantes: number | null
}

export type RelatorioAcil = {
  de: string
  ate: string
  geral: {
    resgates: number
    moradores: number
    lojas: number
    economia: number
    economia_apurada: number
    movimentado: number
  }
  por_loja: { id: number; nome: string; categoria: string; resgates: number; economia: number }[]
  por_categoria: { categoria: string; resgates: number; economia: number }[]
  por_dia_semana: { dow: number; n: number }[]
  por_hora: { hora: number; n: number }[]
  por_mes: { mes: string; resgates: number; economia: number }[]
  bairros: { bairro: string; moradores: number; resgates: number }[]
}
