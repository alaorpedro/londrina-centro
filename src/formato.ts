/* Formatação de tela. Tudo em pt-BR e no fuso de Londrina. */

const MOEDA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
})

const MOEDA_CURTA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

export function reais(valor: number | string | null | undefined): string {
  const n = Number(valor ?? 0)
  return MOEDA.format(Number.isFinite(n) ? n : 0)
}

export function reaisCurto(valor: number | string | null | undefined): string {
  const n = Number(valor ?? 0)
  if (!Number.isFinite(n)) return MOEDA_CURTA.format(0)
  if (Math.abs(n) >= 1000) return `R$ ${(n / 1000).toFixed(1).replace('.', ',')} mil`
  return MOEDA_CURTA.format(n)
}

export function numero(n: number | string | null | undefined): string {
  return new Intl.NumberFormat('pt-BR').format(Number(n ?? 0))
}

/** Soma dias a 'AAAA-MM-DD' sem passar por fuso nenhum. */
export function somarDias(iso: string, n: number): string {
  const [ano, mes, dia] = iso.split('-').map(Number)
  const base = new Date(Date.UTC(ano, mes - 1, dia))
  base.setUTCDate(base.getUTCDate() + n)
  return base.toISOString().slice(0, 10)
}

/** '2026-08-10' → '10/08' */
export function diaMes(iso: string | null | undefined): string {
  if (!iso) return ''
  const [, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}/${m}`
}

/** '2026-08-10' → '10/08/2026' */
export function dataBr(iso: string | null | undefined): string {
  if (!iso) return ''
  const [a, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

/** '2026-08-10' → '10 de agosto' */
export function dataPorExtenso(iso: string | null | undefined): string {
  if (!iso) return ''
  const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ]
  return `${d} de ${meses[m - 1]} de ${a}`
}

const FUSO = 'America/Sao_Paulo'

/** Timestamp do banco → '10/08 às 14:32' */
export function dataHora(quando: string | null | undefined): string {
  if (!quando) return ''
  const d = new Date(quando)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(d)
    .replace(', ', ' às ')
}

/** Só a hora: '14:32' */
export function hora(quando: string | null | undefined): string {
  if (!quando) return ''
  const d = new Date(quando)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

/** Segundos → 'M:SS', para o contador do cupom. */
export function relogio(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** '870622' → '870 622' — dois blocos são mais fáceis de ditar no balcão. */
export function codigoLegivel(codigo: string): string {
  const limpo = String(codigo ?? '').replace(/\D/g, '')
  return `${limpo.slice(0, 3)} ${limpo.slice(3)}`.trim()
}

export function plural(n: number, singular: string, pluralForma: string): string {
  return n === 1 ? singular : pluralForma
}

export const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** [1,2,3,4,5] → 'seg a sex' · [2,4] → 'ter e qui' · [] → 'todos os dias' */
export function descreverDias(dias: number[] | null | undefined): string {
  if (!dias || dias.length === 0) return 'todos os dias'
  if (dias.length === 7) return 'todos os dias'
  const ordenados = [...dias].sort((a, b) => a - b)
  const sequencial = ordenados.every((d, i) => i === 0 || d === ordenados[i - 1] + 1)
  if (sequencial && ordenados.length > 2) {
    return `${DIAS_CURTOS[ordenados[0]]} a ${DIAS_CURTOS[ordenados[ordenados.length - 1]]}`
  }
  const nomes = ordenados.map((d) => DIAS_CURTOS[d])
  if (nomes.length === 1) return nomes[0]
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}

export function primeiroNome(nome: string | null | undefined): string {
  return String(nome ?? '').trim().split(/\s+/)[0] ?? ''
}

export function iniciais(nome: string | null | undefined): string {
  const partes = String(nome ?? '').trim().split(/\s+/).filter(Boolean)
  if (!partes.length) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}
