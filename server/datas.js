/*
  Tudo neste app acontece no fuso de Londrina (America/Sao_Paulo). O container do
  Coolify roda em UTC, então nada aqui pode usar `new Date()` cru para decidir
  "que dia é hoje" ou "que horas são" — às 21h de Londrina o UTC já virou o dia
  seguinte, e uma oferta válida "até domingo" morreria no sábado à noite.

  Regra da casa: dia é string 'AAAA-MM-DD', hora é string 'HH:MM'. Só vira Date
  quando o Postgres precisa de um instante (TIMESTAMPTZ).
*/

const FUSO = 'America/Sao_Paulo'

const fmtDia = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const fmtHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const fmtDiaSemana = new Intl.DateTimeFormat('en-US', { timeZone: FUSO, weekday: 'short' })

const SEMANA = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/** Dia de hoje em Londrina, 'AAAA-MM-DD'. */
export function hojeBrt(quando = new Date()) {
  return fmtDia.format(quando)
}

/** Hora de agora em Londrina, 'HH:MM'. */
export function horaBrt(quando = new Date()) {
  return fmtHora.format(quando)
}

/** Dia da semana em Londrina: 0 = domingo … 6 = sábado. */
export function diaSemanaBrt(quando = new Date()) {
  return SEMANA[fmtDiaSemana.format(quando)] ?? 0
}

/** Soma dias a uma data 'AAAA-MM-DD' sem passar por fuso nenhum. */
export function somarDias(iso, n) {
  const [a, m, d] = iso.split('-').map(Number)
  const base = new Date(Date.UTC(a, m - 1, d))
  base.setUTCDate(base.getUTCDate() + n)
  return base.toISOString().slice(0, 10)
}

/** Diferença em dias entre duas datas 'AAAA-MM-DD' (b - a). */
export function diferencaEmDias(a, b) {
  const emMs = (iso) => {
    const [ano, mes, dia] = iso.split('-').map(Number)
    return Date.UTC(ano, mes - 1, dia)
  }
  return Math.round((emMs(b) - emMs(a)) / 86400000)
}

/** Aceita só 'AAAA-MM-DD' que exista de verdade. Devolve null no resto. */
export function dataValida(v) {
  const s = String(v ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const [a, m, d] = s.split('-').map(Number)
  const teste = new Date(Date.UTC(a, m - 1, d))
  const confere =
    teste.getUTCFullYear() === a && teste.getUTCMonth() === m - 1 && teste.getUTCDate() === d
  return confere ? s : null
}

/** Aceita só 'HH:MM' válido. */
export function horaValida(v) {
  const s = String(v ?? '')
  if (!/^\d{2}:\d{2}$/.test(s)) return null
  const [h, m] = s.split(':').map(Number)
  return h >= 0 && h <= 23 && m >= 0 && m <= 59 ? s : null
}

/** '2026-08-10' → '10/08/2026' */
export function dataBr(iso) {
  if (!iso) return ''
  const [a, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

/** Primeiro dia do mês de uma data 'AAAA-MM-DD'. */
export function inicioDoMes(iso) {
  return `${iso.slice(0, 7)}-01`
}

/** Segunda-feira da semana de uma data 'AAAA-MM-DD'. */
export function inicioDaSemana(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  const data = new Date(Date.UTC(a, m - 1, d))
  const dia = data.getUTCDay() // 0 = domingo
  const recuo = dia === 0 ? 6 : dia - 1
  return somarDias(iso, -recuo)
}
