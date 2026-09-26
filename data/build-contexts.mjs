// Junta os resumos da Wikipédia e os perfis escritos pelo Claude em server/contexts.json. `node data/build-contexts.mjs`
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

const read = (dir, f) => readFileSync(`data/${dir}/${f}`, 'utf8').trim()
const out = {}
for (const f of readdirSync('data/resumos').sort())
  out[f.slice(0, 2)] = `Wikipédia:\n${read('resumos', f)}\n\nCultura, folclore, história e política:\n${read('claude', f)}`
// O Jev recusa (max_tokens_exceeded) acima de ~34k tokens de entrada, o que dá ~98k caracteres de contexto
// junto com as perguntas. 90k deixa folga pro tema e pra variação de tokenização.
const chars = Object.entries(out).map(([uf, t]) => `## ${uf.toUpperCase()}\n${t}`).join('\n\n').length
if (chars > 90_000) throw new Error(`contexto com ${chars} caracteres, o limite é 90000: enxugue data/claude`)
writeFileSync('server/contexts.json', JSON.stringify(out, null, 2) + '\n')
console.log(Object.keys(out).length, 'estados,', chars, 'caracteres')
