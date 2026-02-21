<template>
  <article class="readme" v-html="html" />
</template>

<script setup lang="ts">
import { marked, Renderer } from 'marked'
import hljs from 'highlight.js'
import readmeContent from '../../README.md?raw'

// ── Custom renderer: syntax-highlight fenced code blocks ──────────────────
const renderer = new Renderer()

renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
  const highlighted = hljs.highlight(text, { language }).value
  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`
}

marked.use({ renderer })

const html = marked(readmeContent) as string
</script>

<style scoped>
.readme {
  max-width: 860px;
  margin: 0 auto;
  padding-bottom: 40px;
}

/* ── Headings ──────────────────────────────────────────────────────────────── */
.readme :deep(h1) {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color);
  color: var(--el-text-color-primary);
}

.readme :deep(h2) {
  font-size: 20px;
  font-weight: 600;
  margin: 36px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-light);
  color: var(--el-text-color-primary);
}

.readme :deep(h3) {
  font-size: 16px;
  font-weight: 600;
  margin: 24px 0 8px;
  color: var(--el-text-color-primary);
}

.readme :deep(h4) {
  font-size: 14px;
  font-weight: 600;
  margin: 16px 0 6px;
  color: var(--el-text-color-primary);
}

/* ── Body text ─────────────────────────────────────────────────────────────── */
.readme :deep(p) {
  margin: 0 0 12px;
  color: var(--el-text-color-regular);
  line-height: 1.7;
}

.readme :deep(a) {
  color: var(--el-color-primary);
  text-decoration: none;
}

.readme :deep(a:hover) {
  text-decoration: underline;
}

.readme :deep(hr) {
  border: none;
  border-top: 1px solid var(--el-border-color-light);
  margin: 28px 0;
}

/* ── Lists ─────────────────────────────────────────────────────────────────── */
.readme :deep(ul),
.readme :deep(ol) {
  margin: 0 0 12px;
  padding-left: 24px;
  color: var(--el-text-color-regular);
  line-height: 1.7;
}

.readme :deep(li) {
  margin-bottom: 4px;
}

/* ── Inline code ───────────────────────────────────────────────────────────── */
.readme :deep(:not(pre) > code) {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace,
    SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  background: var(--el-fill-color);
  color: var(--el-color-danger);
  border: 1px solid var(--el-border-color-lighter);
}

/* ── Code blocks ───────────────────────────────────────────────────────────── */
.readme :deep(pre) {
  margin: 0 0 16px;
  border-radius: var(--el-border-radius-base);
  overflow-x: auto;
  border: 1px solid var(--el-border-color-lighter);
}

.readme :deep(pre code) {
  display: block;
  padding: 14px 18px;
  font-size: 13px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace,
    SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  line-height: 1.6;
  background: transparent;
  color: inherit;
  border: none;
}

/* ── Tables ────────────────────────────────────────────────────────────────── */
.readme :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 16px;
  font-size: 13px;
}

.readme :deep(th) {
  padding: 8px 14px;
  text-align: left;
  font-weight: 600;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-light);
  color: var(--el-text-color-primary);
}

.readme :deep(td) {
  padding: 8px 14px;
  border: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-regular);
  vertical-align: top;
}

.readme :deep(tr:nth-child(even) td) {
  background: var(--el-fill-color-extra-light);
}

/* ── Blockquote ────────────────────────────────────────────────────────────── */
.readme :deep(blockquote) {
  margin: 0 0 16px;
  padding: 10px 16px;
  border-left: 3px solid var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 0 var(--el-border-radius-small) var(--el-border-radius-small) 0;
  color: var(--el-text-color-secondary);
}
</style>
