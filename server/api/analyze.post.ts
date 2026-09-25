import QUESTIONS from '../questions.json'
import CONTEXTS from '../contexts.json'

// A janela por IP fica na memória da instância. Fluid reaproveita instâncias, então
// isso segura o abuso óbvio de uma origem só — não é um limite global exato.
// ponytail: contador em memória, trocar por Upstash/Redis se o abuso passar a vir distribuído.
const WINDOW = 60_000
const LIMIT = 20
const HITS = new Map<string, number[]>()

// Modo contexto: o resumo de cada estado (feito a partir da Wikipédia) vai junto no `state`.
const CONTEXT = Object.entries(CONTEXTS as Record<string, string>)
  .map(([uf, text]) => `## ${uf.toUpperCase()}\n${text}`)
  .join('\n\n')

export default defineEventHandler(async (event) => {
  const key = process.env.JEV_KEY
  if (!key) throw createError({ statusCode: 500, message: 'JEV_KEY não está no ambiente' })

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const now = Date.now()
  const hits = (HITS.get(ip) ?? []).filter(t => now - t < WINDOW)
  hits.push(now)
  if (HITS.size > 5000) HITS.clear()
  HITS.set(ip, hits)
  if (hits.length > LIMIT) throw createError({ statusCode: 429, message: `Muitas requisições — ${LIMIT} por minuto por IP. Espera um pouco.` })

  const { tema, modo } = await readBody<{ tema?: string, modo?: string }>(event)
  if (!tema?.trim()) throw createError({ statusCode: 400, message: 'Digite um tema' })
  if (tema.length > 200) throw createError({ statusCode: 400, message: 'Tema longo demais' })

  const state = modo === 'contexto'
    ? `Theme: ${tema.trim()}\n\nFacts about each Brazilian state, to ground the answers:\n\n${CONTEXT}`
    : `Theme: ${tema.trim()}`

  const jev = await $fetch<any>('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: { state, model: 'jev-latest', questions: QUESTIONS },
  })

  return {
    answers: jev.answers,
    model: jev.model,
    usage: jev.usage,
  }
})
