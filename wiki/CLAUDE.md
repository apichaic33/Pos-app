# POS-App Wiki — Schema & LLM Instructions

## Overview
This wiki documents the **POS-App** — a Progressive Web App (PWA) for managing a coffee shop (ระบบจัดการร้านกาแฟ). The LLM maintains all files in this `wiki/` directory. Source code lives in the parent directory and is never modified by wiki operations.

## Directory Structure
```
wiki/
├── CLAUDE.md          ← this file — LLM instructions & conventions
├── index.md           ← catalog of all wiki pages (update on every change)
├── log.md             ← append-only chronological log of all operations
└── pages/             ← all wiki content pages
    ├── overview.md    ← project overview & architecture
    ├── features/      ← one page per major feature
    ├── components/    ← UI components & modules
    └── decisions/     ← technical decisions & rationale
```

## Source Files (read-only)
| File | Description |
|------|-------------|
| `../index.html` | Main app — single-file PWA (large, ~475KB) |
| `../manifest.json` | PWA manifest (name, icons, theme) |
| `../sw.js` | Service Worker — caching strategy |
| `../icon-192.png` | App icon 192×192 |
| `../icon-512.png` | App icon 512×512 |

## Conventions

### Page Frontmatter
Every wiki page must start with YAML frontmatter:
```yaml
---
title: Page Title
type: overview | feature | component | decision
tags: [tag1, tag2]
updated: YYYY-MM-DD
source_files: [../index.html]
---
```

### Cross-references
Use standard markdown links: `[[page-name]]` style or `[text](../pages/page.md)`.

### Language
- Page titles and headings: English
- Body content: Thai or English (match the user's preference)
- Code comments: preserve original language from source

## Workflows

### Ingest a new source
1. Read the source file
2. Discuss key takeaways with user
3. Write or update relevant pages in `wiki/pages/`
4. Update `wiki/index.md`
5. Append an entry to `wiki/log.md`

### Answer a query
1. Read `wiki/index.md` to find relevant pages
2. Read those pages
3. Synthesize an answer with citations
4. If the answer is valuable, save it as a new page in `wiki/pages/`
5. Append to `wiki/log.md`

### Lint the wiki
Look for: contradictions, stale claims, orphan pages, missing cross-references, undocumented features. Suggest new pages to create.

## Log Format
Each log entry must start with:
```
## [YYYY-MM-DD] <operation> | <title>
```
Operations: `ingest`, `query`, `update`, `lint`, `create`
