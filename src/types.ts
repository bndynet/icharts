// Backwards-compatible barrel. The real type definitions live one-file-per-
// chart under `src/types/` (see AGENTS.md). This file keeps every existing
// `from '../types.js'` import working without further changes.
export * from './types/index.js';
