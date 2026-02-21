import { ref, watch } from 'vue'
import { switchTheme } from '@bndynet/icharts'

const STORAGE_KEY = 'icharts-theme'
const darkThemes = new Set(['dark', 'ocean'])

const saved = localStorage.getItem(STORAGE_KEY) ?? 'light'

/** Module-level singleton — shared by App.vue and all views. */
export const appTheme = ref(saved)

// Apply the restored theme immediately (before any component mounts).
document.documentElement.classList.toggle('dark', darkThemes.has(saved))
switchTheme(saved)

watch(appTheme, (val) => {
  localStorage.setItem(STORAGE_KEY, val)
  document.documentElement.classList.toggle('dark', darkThemes.has(val))
  switchTheme(val)
})
