<script setup lang="ts">
import { VisSingleContainer, VisTooltip, VisTreemap } from '@unovis/vue'
import { Treemap } from '@unovis/ts'
import brazil from '@svg-maps/brazil'
import QUESTIONS from '../server/questions.json'

const tema = ref('')
const modo = ref<'puro' | 'contexto'>('puro')
const pending = ref(false)
const error = ref('')
const result = ref<any>(null)

const NAMES: Record<string, string> = Object.fromEntries(brazil.locations.map((l: any) => [l.id, l.name]))
const UFS = Object.keys(NAMES)
const REGIOES: Record<string, string> = {
  norte: 'Norte', nordeste: 'Nordeste', centro_oeste: 'Centro-Oeste', sudeste: 'Sudeste', sul: 'Sul', nenhuma: 'Nenhuma',
}

let timer: any
let lastQuery = ''

watch(tema, (v) => {
  clearTimeout(timer)
  const q = v.trim()
  if (q.length < 3 || q === lastQuery) return
  timer = setTimeout(analyze, 600) // ponytail: plain debounce, no in-flight cancellation
})
watch(modo, () => { if (tema.value.trim()) analyze(true) })

async function analyze(explicit = false) {
  const q = tema.value.trim()
  if (!q) return
  clearTimeout(timer)
  const key = `${modo.value}:${q}`
  lastQuery = q
  const current = () => `${modo.value}:${lastQuery}` === key
  pending.value = true
  error.value = ''
  try {
    const r = await $fetch('/api/analyze', { method: 'POST', body: { tema: q, modo: modo.value } })
    if (current()) { result.value = r; error.value = '' }
  } catch (e: any) {
    if (!current() || !explicit) return
    error.value = e?.data?.message || e?.message || 'Algo deu errado'
  } finally {
    if (current()) pending.value = false
  }
}

const ranked = (probs: Record<string, number> = {}, n = 5) =>
  Object.entries(probs).filter(([, p]) => p > 0.01).sort((a, b) => b[1] - a[1]).slice(0, n)

const COLORS: Record<string, string> = {
  black: '#111827',
  rich_black: '#0d0d0d',
  charcoal: '#374151',
  gray: '#6b7280',
  silver: '#cbd5e1',
  white: '#f8fafc',
  ivory: '#edeae3',
  cream: '#fef3c7',
  beige: '#e7d6b8',
  brown: '#8b5e3c',
  chestnut: '#6b3f2a',
  sepia: '#a97142',
  rust: '#b7410e',
  orange: '#f97316',
  tangerine: '#f28c28',
  amber: '#f59e0b',
  gold: '#d4af37',
  yellow: '#facc15',
  lime: '#a3e635',
  lime_green: '#8bea3a',
  green: '#22c55e',
  forest_green: '#166534',
  mint: '#6ee7b7',
  teal: '#14b8a6',
  cyan: '#22d3ee',
  sky_blue: '#7dd3fc',
  baby_blue: '#9ec9e2',
  blue: '#3b82f6',
  navy: '#1e3a8a',
  indigo: '#4f46e5',
  violet: '#8b5cf6',
  purple: '#a21caf',
  royal_purple: '#5b2a86',
  lavender: '#c4b5fd',
  magenta: '#ec4899',
  pink: '#f9a8d4',
  baby_pink: '#ffd1dc',
  maroon: '#7f1d1d',
  red: '#ef4444',
  crimson: '#c8102e',
}
// claras demais pra destacar um estado contra o fundo neutro do mapa
const PALE = ['white', 'ivory', 'cream', 'silver', 'beige', 'baby_pink', 'baby_blue', 'lavender', 'mint']

// fallback mono ramp, usada até o Jev devolver a paleta do tema
const STEPS = ['#171717', '#525252', '#737373', '#a3a3a3', '#d4d4d4']
const tiles = (entries: [string, number][], label: (k: string) => string) =>
  entries.map(([name, value], i) => ({ name: label(name), value, color: tileColors.value[i % tileColors.value.length] }))

const openSpec = ref('')
const spec = (keys: string[]) =>
  JSON.stringify(Object.fromEntries(keys.map(k => [k, (QUESTIONS as any)[k]])), null, 2)

// tooltip instantâneo do Unovis, no lugar do <title> nativo
const tileTooltip = {
  [Treemap.selectors.tile]: (n: any) =>
    `<span class="font-medium">${n.data?.key ?? ''}</span> · ${Math.round((n.value ?? 0) * 100)}%`,
}

const palette = computed(() => {
  const top = ranked(result.value?.answers?.palette?.probabilities, 10)
  const sum = top.reduce((a, [, p]) => a + p, 0) || 1
  return top.map(([name, p]) => [name, p, p / sum] as [string, number, number])
})

// fundo da página: a 2ª cor do tema, bem lavada
const tint = computed(() => COLORS[palette.value[1]?.[0] as string] ?? null)
// cor primária do tema, usada no título
const primary = computed(() => COLORS[palette.value[0]?.[0] as string] ?? null)
// cor de destaque do mapa: a primeira da paleta que aparece contra o cinza
const accent = computed(() => COLORS[palette.value.find(([n]) => !PALE.includes(n))?.[0] as string] ?? primary.value)

const tileColors = computed(() => {
  const c = palette.value.map(([name]) => COLORS[name]).filter(Boolean)
  return c.length ? c : STEPS
})

const score = (uf: string) => result.value?.answers?.[uf]?.noul as number | undefined
const top = computed(() => UFS.filter(uf => score(uf) !== undefined)
  .sort((a, b) => score(b)! - score(a)!).slice(0, 5))

// o nível absoluto dos nouls muda de tema pra tema ("agropecuária" puxa todo mundo pra cima),
// então o mapa pinta relativo: o menor estado fica cinza, o maior fica na cor cheia.
const range = computed(() => {
  const s = UFS.map(score).filter(p => p !== undefined) as number[]
  return s.length ? [Math.min(...s), Math.max(...s)] : [0, 1]
})
// ponytail: curva fixa (r²) pra separar os fortes dos mornos, ajustar se o mapa ficar lavado demais
const fill = (uf: string) => {
  const p = score(uf)
  if (p === undefined || !accent.value) return undefined
  const [lo, hi] = range.value
  const r = hi > lo ? (p - lo) / (hi - lo) : 0
  return `color-mix(in oklab, ${accent.value} ${Math.round(r * r * 100)}%, var(--map-base))`
}

const hover = ref('')
</script>

<template>
  <UApp>
    <div class="tinted min-h-screen text-neutral-900 dark:text-neutral-100 transition-colors duration-700"
      :style="{ ...(tint ? { '--tint': tint } : {}), ...(primary ? { '--primary': primary } : {}) }">
      <div class="max-w-4xl mx-auto px-6 py-20 space-y-12">
        <header class="space-y-6">
          <h1 class="title-tint text-center text-4xl sm:text-5xl font-bold tracking-tighter transition-colors duration-700">
            JEV Estados Brasileiros
          </h1>
          <div class="flex justify-center gap-1 text-xs uppercase tracking-widest">
            <button v-for="[m, label] in [['puro', 'JEV puro'], ['contexto', 'Com contexto']]" :key="m" type="button"
              class="px-3 py-1.5 rounded-full transition-colors"
              :class="modo === m ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'"
              @click="modo = m as any">{{ label }}</button>
          </div>
          <form @submit.prevent="analyze(true)">
            <UInput
              v-model="tema" variant="none" size="xl" autofocus
              :loading="pending" placeholder="Digite um tema…"
              class="w-full"
              :ui="{ base: 'px-0 py-1 text-3xl sm:text-4xl leading-normal sm:leading-normal font-light placeholder:text-neutral-300 dark:placeholder:text-neutral-700' }"
            />
            <!-- a linha do input vira a barra de cores quando o Jev responde -->
            <div class="flex mt-2 bg-neutral-200 dark:bg-neutral-800 transition-all duration-700"
              :class="palette.length ? 'h-1.5' : 'h-px'">
              <div
                v-for="[name, p, share] in palette" :key="name"
                class="transition-all duration-700 ease-out"
                :title="`${name.replace(/_/g, ' ')} ${Math.round(p * 100)}%`"
                :style="{ flex: `${share} 0 0`, background: COLORS[name] }"
              />
            </div>
          </form>
          <p class="text-xs text-neutral-400 -mt-3">
            {{ modo === 'puro'
              ? 'Só o tema vai pro Jev — o que ele sabe dos estados vem dele mesmo.'
              : 'O tema vai junto com um perfil de cada estado: resumo da Wikipédia + cultura, folclore, história, política, memes e zoeiras escritos pelo Claude.' }}
          </p>
          <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
        </header>

        <section class="grid sm:grid-cols-[1fr_14rem] gap-8 items-start">
          <div class="relative">
            <svg :viewBox="brazil.viewBox" class="map w-full h-auto" :class="{ 'animate-pulse': pending }" role="img"
              aria-label="Mapa do Brasil por estado">
              <path v-for="l in brazil.locations" :key="l.id" :d="l.path"
                class="state" :style="fill(l.id) ? { fill: fill(l.id) } : {}"
                @mouseenter="hover = l.id" @mouseleave="hover = ''">
                <title>{{ l.name }}{{ score(l.id) !== undefined ? ` · ${Math.round(score(l.id)! * 100)}%` : '' }}</title>
              </path>
            </svg>
            <p class="absolute left-0 bottom-0 text-sm font-medium h-5">
              <template v-if="hover">
                {{ NAMES[hover] }}<span v-if="score(hover) !== undefined" class="font-mono text-neutral-400"> · {{ Math.round(score(hover)! * 100) }}%</span>
              </template>
            </p>
          </div>

          <div class="space-y-4">
            <div class="flex items-center gap-2">
              <p class="text-xs uppercase tracking-widest text-neutral-400">Mais combinam</p>
              <button type="button" class="font-mono text-xs text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100"
                title="Ver as perguntas noul" @click="openSpec = openSpec === 'nouls' ? '' : 'nouls'">&lt;/&gt;</button>
            </div>
            <pre v-if="openSpec === 'nouls'" class="text-[10px] leading-relaxed font-mono bg-neutral-50 dark:bg-neutral-900 p-3 rounded-sm overflow-auto max-h-64 text-neutral-500">{{ spec(['sp', 'rs']) }}
// … e mais 25, uma por estado</pre>
            <template v-if="top.length">
              <div v-for="uf in top" :key="uf" class="space-y-1" @mouseenter="hover = uf" @mouseleave="hover = ''">
                <div class="flex justify-between text-sm">
                  <span>{{ NAMES[uf] }}</span>
                  <span class="font-mono text-neutral-400">{{ Math.round(score(uf)! * 100) }}%</span>
                </div>
                <div class="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800">
                  <div class="h-1.5 rounded-full transition-all duration-700 ease-out"
                    :style="{ width: `${score(uf)! * 100}%`, background: accent ?? '#171717' }" />
                </div>
              </div>
            </template>
            <template v-else>
              <div v-for="i in 5" :key="i" class="space-y-1.5">
                <USkeleton class="h-3 w-2/3" :class="{ 'animate-none': !pending }" />
                <USkeleton class="h-1.5 w-full" :class="{ 'animate-none': !pending }" />
              </div>
            </template>
          </div>
        </section>

        <Transition name="pop">
          <section v-if="result" class="grid sm:grid-cols-2 gap-x-12 gap-y-12">
            <div v-for="[q, label, name] in [
              ['destaque', 'Estado destaque', (k: string) => NAMES[k] ?? k],
              ['regiao', 'Região', (k: string) => REGIOES[k] ?? k],
            ] as const" :key="q" class="space-y-4">
              <div class="flex items-center gap-2">
                <p class="text-xs uppercase tracking-widest text-neutral-400">{{ label }}</p>
                <button type="button" class="font-mono text-xs text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100"
                  :title="`Ver a pergunta ${q}`" @click="openSpec = openSpec === q ? '' : q">&lt;/&gt;</button>
              </div>
              <pre v-if="openSpec === q" class="text-[10px] leading-relaxed font-mono bg-neutral-50 dark:bg-neutral-900 p-3 rounded-sm overflow-auto max-h-64 text-neutral-500">{{ spec([q]) }}</pre>
              <ClientOnly>
                <div class="treemap">
                <VisSingleContainer :data="tiles(ranked(result.answers[q].probabilities), name)" :height="170">
                  <VisTreemap
                    :value="(d: any) => d.value"
                    :layers="[(d: any) => d.name]"
                    :tile-color="(n: any) => n.data?.datum?.color ?? '#171717'"
                    :tile-label="(n: any) => `${n.data?.key ?? ''}`"
                    :label-fit="'wrap'"
                    :label-offset-x="6"
                    :label-offset-y="6"
                    :tile-padding="2"
                    :tile-border-radius="3"
                    :enable-tile-label-font-size-variation="true"
                    :tile-label-small-font-size="11"
                    :tile-label-medium-font-size="11"
                    :tile-label-large-font-size="26"
                  />
                  <VisTooltip :triggers="tileTooltip" />
                </VisSingleContainer>
                </div>
                <template #fallback><div class="h-[170px]" /></template>
              </ClientOnly>
              <p class="text-xs text-neutral-400 font-mono">{{ Math.round(result.answers[q].confidence * 100) }}% confidence</p>
            </div>
          </section>
        </Transition>

        <footer class="pt-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400 dark:text-neutral-600">
          <span>Feito por <a href="https://github.com/daniel-dia" target="_blank" class="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100">Daniel Santos</a></span>
          <a href="https://github.com/daniel-dia/jev-estados-brasileiros" target="_blank"
            class="inline-flex items-center gap-1.5 underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100">
            <UIcon name="i-simple-icons-github" class="size-3.5" />
            Código no GitHub
          </a>
          <span>Classificado pelo <a href="https://typesafe.ai" target="_blank" class="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100">Jev</a></span>
          <span>Mapa: <a href="https://github.com/VictorCazanave/svg-maps" target="_blank" class="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100">svg-maps</a> (CC BY 4.0)</span>
        </footer>
      </div>
    </div>
  </UApp>
</template>
