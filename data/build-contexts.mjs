// Junta os resumos da Wikipédia e os perfis escritos pelo Claude em server/contexts.json. `node data/build-contexts.mjs`
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

const read = (dir, f) => readFileSync(`data/${dir}/${f}`, 'utf8').trim()
const out = {}
for (const f of readdirSync('data/resumos').sort())
  out[f.slice(0, 2)] = `Wikipédia:\n${read('resumos', f)}\n\nCultura, folclore, história e política:\n${read('claude', f)}`
writeFileSync('server/contexts.json', JSON.stringify(out, null, 2) + '\n')
console.log(Object.keys(out).length, 'estados,', JSON.stringify(out).split(/\s+/).length, 'palavras')
