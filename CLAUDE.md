# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Sibling of `../anime-stat` (jev-anime-stats): same stack (Nuxt 4 + Nuxt UI 3 + Unovis), same theming, same
single-route shape. Changes to one are often worth porting to the other.

## Commands

```bash
npm install
npm run dev                        # http://localhost:3000, needs JEV_KEY in the env
node check.mjs "chimarrão"         # end-to-end assert against the live Jev API (JEV mode)
node check.mjs "petróleo" contexto # same, with the per-state context
node data/fetch-wikipedia.mjs      # re-download data/wikipedia/*.md (skips files that exist)
vercel --prod                      # deploy; JEV_KEY lives in the Vercel project env
```

There is no test suite or linter; `check.mjs` is the check.

## How it fits together

- `server/questions.json` — every question sent to Jev (`api.typesafe.ai/v1/systemone`) in **one** request:
  27 `noul` (keyed by lowercase UF, one per state), `palette` (choice over the 40 colors shared with
  anime-stat), `destaque` (choice over the 27 UFs), `regiao` (choice over the 5 regions + `nenhuma`).
- `server/api/analyze.post.ts` — `{ tema, modo }` → Jev. `modo: 'puro'` sends only `Theme: <tema>`;
  `modo: 'contexto'` appends every summary from `server/contexts.json` to the `state`. Has an in-memory per-IP rate limit.
- `app/app.vue` — the whole UI. The map is `@svg-maps/brazil` paths (ids = lowercase UF). State fill is the
  palette's first non-pale color, mixed in **relative** to the min/max noul of that query (absolute noul levels
  vary a lot between themes). The `COLORS` map must keep the same keys as `palette.criteria`.
- Context pipeline: `data/wikipedia/<uf>.md` (raw pt.wikipedia plain text) → `data/resumos/<uf>.md`
  (summaries written by Claude, fixed format, ~150–190 words) → `server/contexts.json` (what the server imports).
  After editing a summary, rebuild the JSON:
  `node -e 'const fs=require("fs");const o={};for(const f of fs.readdirSync("data/resumos").sort())o[f.slice(0,2)]=fs.readFileSync("data/resumos/"+f,"utf8").trim();fs.writeFileSync("server/contexts.json",JSON.stringify(o,null,2)+"\n")'`

The noul wording ("Is the Brazilian state of X strongly associated with the theme in `state`?") was picked by
comparing phrasings on agropecuária/praia/carnaval/tecnologia; stricter wordings flattened obvious answers
(e.g. dropped RJ for carnaval).
