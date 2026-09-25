// Check: hits Jev with the same payload as the route. `node check.mjs "chimarrão" [contexto]`
import assert from 'node:assert'
import QUESTIONS from './server/questions.json' with { type: 'json' }
import CONTEXTS from './server/contexts.json' with { type: 'json' }

const tema = process.argv[2] || 'chimarrão'
const contexto = process.argv[3] === 'contexto'
assert.equal(Object.keys(CONTEXTS).length, 27, 'server/contexts.json should have 27 states')

const state = contexto
  ? `Theme: ${tema}\n\nFacts about each Brazilian state, to ground the answers:\n\n${Object.entries(CONTEXTS).map(([uf, t]) => `## ${uf.toUpperCase()}\n${t}`).join('\n\n')}`
  : `Theme: ${tema}`

const res = await fetch('https://api.typesafe.ai/v1/systemone', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.JEV_KEY}`, 'content-type': 'application/json' },
  body: JSON.stringify({ state, model: 'jev-latest', questions: QUESTIONS }),
})
const raw = await res.text()
assert.equal(res.status, 200, `jev returned ${res.status}: ${raw}`)
const { answers, model, usage } = JSON.parse(raw)
const ufs = Object.keys(CONTEXTS)
assert.ok(ufs.every(uf => typeof answers[uf]?.noul === 'number'), 'every state should get a noul')
assert.ok(answers.palette.choice && answers.destaque.choice && answers.regiao.choice)
const top = ufs.sort((a, b) => answers[b].noul - answers[a].noul).slice(0, 3)
console.log(model, contexto ? 'contexto' : 'puro', `(${usage.input_tokens} in)`, '→', top.join(' '), '/', answers.destaque.choice, '/', answers.regiao.choice, '/', answers.palette.choice)
if (tema === 'chimarrão') assert.equal(top[0], 'rs', 'chimarrão should land on RS')
console.log('ok')
