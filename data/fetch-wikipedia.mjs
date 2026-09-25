// Baixa o artigo de cada estado da Wikipédia em pt como texto puro. `node data/fetch-wikipedia.mjs`
import { writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const TITLES = {
  ac: 'Acre', al: 'Alagoas', ap: 'Amapá', am: 'Amazonas', ba: 'Bahia', ce: 'Ceará',
  df: 'Distrito Federal (Brasil)', es: 'Espírito Santo (estado)', go: 'Goiás', ma: 'Maranhão',
  mt: 'Mato Grosso', ms: 'Mato Grosso do Sul', mg: 'Minas Gerais', pa: 'Pará', pb: 'Paraíba',
  pr: 'Paraná', pe: 'Pernambuco', pi: 'Piauí', rj: 'Rio de Janeiro (estado)', rn: 'Rio Grande do Norte',
  rs: 'Rio Grande do Sul', ro: 'Rondônia', rr: 'Roraima', sc: 'Santa Catarina', sp: 'São Paulo (estado)',
  se: 'Sergipe', to: 'Tocantins',
}

for (const [uf, title] of Object.entries(TITLES)) {
  if (existsSync(`data/wikipedia/${uf}.md`)) continue
  await new Promise(r => setTimeout(r, 3000)) // a API corta rajadas
  const url = `https://pt.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json&titles=${encodeURIComponent(title)}`
  let j
  for (let wait = 30_000; !j; wait *= 2) {
    const res = await fetch(url, { headers: { 'user-agent': 'jev-estados-brasileiros (github.com/daniel-dia)' } })
    if (res.ok) j = await res.json()
    else { console.log(uf, res.status, `retry in ${wait / 1000}s`); await new Promise(r => setTimeout(r, wait)) }
  }
  const page = Object.values(j.query.pages)[0]
  const text = page.extract.replace(/^(=+) (.+?) =+$/gm, (_, eq, h) => `${'#'.repeat(eq.length)} ${h}`)
  await writeFile(`data/wikipedia/${uf}.md`, `# ${page.title}\n\nFonte: https://pt.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))} (CC BY-SA 4.0)\n\n${text}\n`)
  console.log(uf, page.title, text.length)
}
