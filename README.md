# 🇧🇷 JEV Estados Brasileiros

**Live: [jev-estados-brasileiros.vercel.app](https://jev-estados-brasileiros.vercel.app)**

Digite um tema — *agropecuária*, *praia*, *carnaval*, *chimarrão*, *energia eólica* — e o mapa do Brasil
acende nos estados que mais combinam com ele, na cor que o tema tem. Tudo classificado pelo
[Jev](https://docs.typesafe.ai), o modelo System One da TypeSafe.

Irmão do [jev-anime-stats](https://github.com/daniel-dia/jev-anime-stats): mesma stack, mesmo tema, mesma ideia —
o Jev não escreve texto, ele recebe um *state* e um conjunto de perguntas tipadas e devolve probabilidades calibradas.

![Nuxt 4](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt&logoColor=white)
![Nuxt UI 3](https://img.shields.io/badge/Nuxt_UI-3-00DC82)

![demo](demo.gif)

🎬 [Vídeo em mp4](jev-estados-brasileiros-demo.mp4)

## Dois modos

| Modo | O que vai no `state` | Tokens de entrada |
| --- | --- | --- |
| **JEV puro** | `Theme: <tema>` — só isso. O que o Jev sabe dos estados vem dele mesmo. | ~2,5k |
| **Com contexto** | O tema + um perfil de cada um dos 27 estados: resumo da Wikipédia + cultura, folclore, história, política e memes escritos pelo Claude. | ~30k |

O puro responde em ~0,6 s, o com contexto em ~0,8 s. O contexto aparece onde o conhecimento geral é raso ou impreciso:

| Tema | JEV puro (top 3) | Com contexto (top 3) |
| --- | --- | --- |
| energia eólica | CE, RN, RS | **RN**, CE, PI |
| cangaço | CE, PE, RN | **PE**, CE, RN |
| boi-bumbá | MA, PA, AP | MA, **AM**, RO |
| imigração alemã | RS, SC, PR | **SC**, RS, PR |
| 7 a 1 | AC, RS, AP | **MG**, AC, RS |
| sofrência | RJ, MG, RS | **GO**, RS, PB |
| calor infernal | RJ, GO, BA | **MT**, **PI**, **AM** |

### De onde vem o contexto

1. [`data/fetch-wikipedia.mjs`](data/fetch-wikipedia.mjs) baixa o artigo de cada estado da Wikipédia em
   português como texto → [`data/wikipedia/`](data/wikipedia) (~273 mil palavras).
2. O Claude leu os 27 artigos e escreveu um resumo de ~150–190 palavras de cada um, num formato fixo
   (região, geografia e clima, economia, cultura, turismo, curiosidades) → [`data/resumos/`](data/resumos).
3. O Claude também escreveu, do próprio conhecimento, um perfil de ~300 palavras de cada estado com o que a
   Wikipédia resumida não cobre: folclore e lendas, festas, música e dança, artes, culinária, religiosidade,
   história, política, esportes, personalidades, identidade, **memes e internet** e uma linha de **zoeiras e curiosidades** curada pelo autor → [`data/claude/`](data/claude).
4. [`data/build-contexts.mjs`](data/build-contexts.mjs) junta as duas fontes em
   [`server/contexts.json`](server/contexts.json), que a rota importa. O Jev recusa entradas acima de ~34k tokens
   (`max_tokens_exceeded`), então o script falha se o contexto passar de 90 mil caracteres.

## As perguntas

Tudo que o Jev responde está em [`server/questions.json`](server/questions.json), numa **única** requisição:

| Pergunta | Tipo | Vira |
| --- | --- | --- |
| `ac` … `to` | 27 × `noul` | A intensidade de cada estado no mapa, e o ranking "Mais combinam" |
| `palette` | `choice` (37 cores: as 40 do anime-stats menos preto e branco, que se confundem com a interface) | A barra de cores sob o input, o fundo, o título e a cor de destaque do mapa |
| `destaque` | `choice` (27 estados) | Treemap do estado que melhor encarna o tema |
| `regiao` | `choice` (5 regiões + nenhuma) | Treemap da região |

Um `noul` por estado:

```json
"rs": {
  "type": "noul",
  "instructions": "Is the Brazilian state of Rio Grande do Sul strongly associated with the theme in `state`?"
}
```

A redação foi escolhida comparando variantes em agropecuária / praia / carnaval / tecnologia. Versões mais
restritivas ("um dos estados *mais* associados…", "a maioria dos brasileiros citaria…") achatavam respostas
óbvias — uma delas tirou o Rio do carnaval.

O nível absoluto dos nouls muda muito de tema pra tema (*agropecuária* deixa quase todo estado acima de 70%),
então o mapa pinta **relativo**: o menor estado da consulta fica cinza, o maior fica na cor cheia, e a lista ao
lado mostra os percentuais crus.

A paleta usa a mesma pergunta em dois passos do anime-stats: primeiro imaginar a imagem mais icônica do tema no
Brasil, depois espalhar a probabilidade pelas cores dela.

## Rodando

```bash
npm install
export JEV_KEY=...                  # https://console.typesafe.ai/keys
npm run dev                         # http://localhost:3000
```

Checagem sem subir o servidor:

```bash
node check.mjs "chimarrão"
# jev-1.13.0 puro (2553 in) → rs pr sc / rs / sul / green
# ok
node check.mjs "energia eólica" contexto
```

## Deploy na Vercel

O Nitro detecta a Vercel sozinho, sem `vercel.json`.

```bash
vercel                    # linka e faz um preview
vercel env add JEV_KEY    # Production, Preview e Development
vercel --prod
```

> **Atenção:** `JEV_KEY` só é lido no servidor, mas `/api/analyze` é público e cada chamada gasta créditos do Jev.
> A rota limita cada IP a 20 requisições por minuto, contadas na memória da instância — segura abuso casual, não
> um distribuído.

## Como se encaixa

```
app/app.vue                  UI: busca com debounce, mapa SVG, ranking, treemaps Unovis, tema pela paleta
app/assets/css/main.css      fundo tingido, cores do mapa, variáveis do treemap
server/api/analyze.post.ts   { tema, modo } → state → POST /v1/systemone
server/questions.json        27 nouls + palette + destaque + regiao
server/contexts.json         os 27 perfis (Wikipédia + Claude) usados no modo contexto
data/                        artigos da Wikipédia, resumos, perfis do Claude e os scripts que geram o contexto
check.mjs                    assert ponta a ponta contra a API
```

## Créditos

Feito por [Daniel Santos](https://github.com/daniel-dia). Classificação pelo [Jev](https://typesafe.ai).
Mapa: [@svg-maps/brazil](https://github.com/VictorCazanave/svg-maps) (CC BY 4.0).
Textos em `data/wikipedia` e resumos em `data/resumos`: [Wikipédia](https://pt.wikipedia.org) (CC BY-SA 4.0).

## Licença

MIT (código). Os dados em `data/` e `server/contexts.json` seguem a CC BY-SA 4.0 da Wikipédia.
