# FeatureSignals Unified Platform

The complete FeatureSignals platform — website, documentation, dashboard, and sandbox experience — in a single Next.js application.

## What's inside

- **Product-first landing** — visitors toggle real feature flags within 10 seconds, no signup required
- **Sandbox API** — ephemeral demo organizations with pre-seeded flags, segments, and environments
- **Full dashboard** — project management, flag CRUD, targeting, segments, analytics, audit logs
- **Documentation** — 9+ MDX pages with AI-readable frontmatter (HTML + Markdown + JSON)
- **Emergent docs** — contextual documentation appears inline on product pages
- **MCP server** — 10 typed tools for AI agents to discover, integrate, and manage FeatureSignals
- **Search** — ⌘K command palette with categorized results and direct fragment navigation

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The sandbox experience works standalone (no backend required). For full API functionality, run the [FeatureSignals Go server](https://github.com/featuresignals/server).

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── (product)/          # Authenticated dashboard pages
│   ├── (docs)/             # Documentation (HTML + .md + .json)
│   ├── (marketing)/        # Marketing pages
│   ├── auth/               # Login, register
│   └── api/                # Go server proxy
├── components/
│   ├── shell/              # Top bar, side rail, search, auth guard
│   ├── ui/                 # 22+ UI primitives (Radix + Tailwind)
│   ├── docs/               # Emergent documentation, doc page
│   ├── product/            # Product-specific components
│   └── landing/            # Sandbox loader, landing components
├── content/
│   ├── docs/               # MDX documentation pages
│   └── glossary/           # 25 glossary entries
├── hooks/                  # use-emergent-docs, use-auth, use-sandbox, use-search
├── lib/                    # API client, types, utils, content protocol
└── stores/                 # Zustand stores (auth, sidebar)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build search index + production build |
| `npm run build:search` | Generate search index only |
| `npm test` | Run Vitest tests |

## Tech stack

- **Next.js 16** (App Router)
- **TypeScript** (strict)
- **Tailwind CSS 4** (GitHub Primer design tokens)
- **Radix UI** (accessible primitives)
- **Zustand** (state management)
- **MDX** (documentation)

## License

Apache 2.0 — see [LICENSE](LICENSE).
