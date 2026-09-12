<script setup lang="ts">
import EditorView from './views/EditorView.vue'
import SimulatorView from './views/SimulatorView.vue'
import { canonicalPath, routeFromPath } from './routing'

const base = import.meta.env.BASE_URL
const route = routeFromPath(window.location.pathname, base)
const canonical = canonicalPath(window.location.pathname, base)

if (canonical) window.history.replaceState({}, '', `${canonical}${window.location.search}${window.location.hash}`)
</script>

<template>
  <SimulatorView v-if="route === 'simulador'" />
  <EditorView v-else />
</template>
