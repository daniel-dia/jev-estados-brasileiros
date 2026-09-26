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

The Vercel project is not Git-connected: pushing to GitHub does not deploy, `vercel --prod` does.

There is no test suite or linter; `check.mjs` is the check.

## How it fits together

- `server/questions.json` — every question sent to Jev (`api.typesafe.ai/v1/systemone`) in **one** request:
  27 `noul` (keyed by lowercase UF, one per state), `palette` (choice over 37 colors — anime-stat's 40 minus black, rich_black and white, which blend into the UI — shared with
  anime-stat), `destaque` (choice over the 27 UFs), `regiao` (choice over the 5 regions + `nenhuma`).
- `server/api/analyze.post.ts` — `{ tema, modo }` → Jev. `modo: 'puro'` sends only `Theme: <tema>`;
  `modo: 'contexto'` appends every state's text from `server/contexts.json` to the `state`. Has an in-memory
  per-IP rate limit (20/min).
- `app/app.vue` — the whole UI. The map is `@svg-maps/brazil` paths (ids = lowercase UF). State fill is the
  palette's first color not in `PALE`, mixed in **relative** to the min/max noul of that query (absolute noul levels
  vary a lot between themes). The `COLORS` map must keep the same keys as `palette.criteria`; black and white
  were removed on purpose (they read as "no tint" against the UI), don't add them back.
- Nuxt UI's `:ui` classes go through tailwind-merge: a `leading-*` placed before a `text-*` size is dropped. The
  search input needs its `leading-normal` after the size classes or g/j/p/q descenders get clipped.
- Context pipeline: `data/wikipedia/<uf>.md` (raw pt.wikipedia plain text) → `data/resumos/<uf>.md`
  (Claude's summary of the article, ~150–190 words) + `data/claude/<uf>.md` (Claude-written profile from its own
  knowledge: 13 fixed lines — folklore, festivals, music, arts, food, religion, history, politics, sports, people,
  identity, memes, and "Zoeiras e curiosidades" (from a list the user wrote; keep it); ~250–330 words, must not
  repeat the resumo, no xenophobic jokes) → `node data/build-contexts.mjs` → `server/contexts.json`
  (what the server imports, ~30k Jev input tokens). Re-run the build after editing either folder. Jev rejects input
  over ~34k tokens with `max_tokens_exceeded`; the build script throws above 90k context chars to keep headroom.

The noul wording ("Is the Brazilian state of X strongly associated with the theme in `state`?") was picked by
comparing phrasings on agropecuária/praia/carnaval/tecnologia; stricter wordings flattened obvious answers
(e.g. dropped RJ for carnaval).
