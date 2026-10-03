# AI Frontend Cloner Agent

A working MVP for the Founding AI Engineer assignment. It accepts a public URL, analyzes the page with Playwright, sends DOM/layout/style/image information plus a screenshot to an AI model, generates a React frontend, previews it locally, validates the generated code, and supports natural-language modifications.

The assignment asks for: URL → Analysis → Generation → Validation → Modification, reusable code, responsive output, multiple websites, and local preview. Hosting is optional in the brief, but a Render configuration is included for convenience.

## Architecture

```text
Public URL
   ↓
Express API
   ↓
Playwright Analyzer ──→ DOM + computed styles + links + images + screenshot
   ↓
OpenAI Responses API
   ↓
React JSX + CSS generation
   ↓
Static validation / repair attempt
   ↓
Browser preview (React + Babel sandbox)
   ↓
Natural-language modification → AI → updated JSX/CSS
```

## Setup

1. Install Node.js 20+.
2. Copy `.env.example` to `.env`.
3. Add your OpenAI API key.
4. Run:

```bash
npm install
npx playwright install chromium
npm run dev
```

5. Open `http://localhost:5173`.

## Technologies

- React + Vite + TypeScript-ready architecture (the generated frontend is React JSX/CSS).
- Node.js + Express.
- Playwright for browser-level website analysis.
- OpenAI Responses API for multimodal analysis/generation and modification.

## Key decisions

- The original page is analyzed rather than embedded in an iframe.
- A screenshot is combined with structured DOM/style information so the model gets both visual and semantic context.
- The generated frontend is self-contained React and CSS so it can be previewed without writing arbitrary files to the host machine.
- Generated code is checked for common invalid patterns and a repair request is made when necessary.
- The model is instructed to use external asset URLs only as image sources; the original site is never embedded as the generated page.

## Limitations

- Some sites block automated browsers, require login, or render content only after complex interactions.
- Generated previews use React/Babel CDN scripts in the sandbox, so an internet connection is useful for the preview.
- This is an MVP, not a production-grade code execution environment.
- Visual accuracy depends on the model and the quality of the source page's accessible DOM/assets.
