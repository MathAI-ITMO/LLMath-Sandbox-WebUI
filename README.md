## LLMath Sandbox Web UI

A Vue 3 + Vite web UI for interacting with LLMath backends and a problems service. Includes admin/test views for problems, chat, statistics, and user details.

## Requirements

- Node.js 18+ (recommended 20+)
- npm 9+

## Quick Start

```sh
npm install
cp .env .env.local # if you want a local override file
npm run dev
```

Open the dev server URL printed in the console (usually `http://localhost:5173`).

## Environment Variables

Create a `.env` (or `.env.local`) file in the project root with the following variables:

```
# Base URL for LLMath-Problems service (no trailing /api)
VITE_LLMATH_PROBLEMS_API_URL_BASE=https://math-llm-problems.dev.mgsds.com

# Base URL for the main backend (used by chat/auth/tasks/GeoLin proxy)
VITE_MATHLLM_BACKEND_ADDRESS="https://math-llm-back.dev.mgsds.com"

# Optional: Allowed hosts list (not used by the app unless you wire it up)
# VITE_ALLOWED_HOSTS="math-llm.dev.mgsds.com"
```

Notes:
- Values above are examples. Set per environment (dev/staging/prod).
- `VITE_LLMATH_PROBLEMS_API_URL_BASE` must be the base URL without `/api` suffix; the app appends `/api` where needed.
- The code expects `VITE_MATHLLM_BACKEND_ADDRESS` (not `VITE_MATHLLM_BACKEND_API_URL`).

Environment file variants supported by Vite:
- `.env` (default for all)
- `.env.local` (git-ignored; overrides local dev)
- `.env.development`, `.env.production` (per mode)
- `.env.development.local`, `.env.production.local` (per mode, local overrides)

Restart the dev server after changing env vars.

## Scripts

- `npm run dev`: Start Vite dev server with HMR
- `npm run build`: Type-check, compile, and minify for production
- `npm run preview`: Preview the production build locally
- `npm run test:unit`: Run unit tests with Vitest
- `npm run lint`: Lint with ESLint

## Docker

Build and run using the provided `Dockerfile`:

```sh
docker build -t llmath-sandbox-webui .
docker run --rm -p 8080:80 \
  --env VITE_LLMATH_PROBLEMS_API_URL_BASE \
  --env VITE_MATHLLM_BACKEND_ADDRESS \
  llmath-sandbox-webui
```

Note: Vite env vars are injected at build time. If you need to vary them per container, build separate images per environment or implement runtime config.

## Project Structure

- `src/views/`: main pages (`ChatView.vue`, `TestLLMathProblemsView.vue`, etc.)
- `src/composables/`: composables for auth/chat/tasks
- `src/utils/`: helpers such as rendering
- `src/types/` and `src/models/`: shared types and models

## Troubleshooting

- API 404/Network errors: verify `VITE_LLMATH_PROBLEMS_API_URL_BASE` and `VITE_MATHLLM_BACKEND_ADDRESS` values and CORS settings on the backend.
- Auth issues: make sure your backend cookies/CORS are configured for the dev server origin.
- Env var not applied: restart `npm run dev` after changing `.env`.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar).

## Type Support for `.vue` in TS

We use `vue-tsc` for type checking. Editors should use Volar for `.vue` types.

## Customize configuration

See the Vite configuration reference: https://vite.dev/config/
