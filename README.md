<p align="center">
  <strong>◆ Vanguard.ts</strong>
</p>

<p align="center">
  <em>Decentralized, compute-aware spatial multi-agent orchestrator for TypeScript 7.0</em>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#license">License</a>
</p>

---

## Features

- **Compute-Aware Routing (CARM)** — Automatically evaluates prompt complexity and routes to the most cost-effective model. Ships with **free** Google Gemini models out of the box — no API billing required. Supports pluggable providers (OpenAI, Anthropic, Groq, Mistral, etc.).
- **Native MCP Integration** — First-class [Model Context Protocol](https://modelcontextprotocol.io) client that connects to local servers via stdio, dynamically discovers tools, and caches the tool list.
- **Corsa AST Validation** — Pipes agent-generated code into the `tsgo` binary (TypeScript 7.0 / Project Corsa Go-compiler) with `--incremental` to validate syntax and types in milliseconds before execution.
- **Spatial Delegative Canvas** — React-based visual debugger powered by React Flow. Renders agents as interactive nodes on a graph with real-time status updates via WebSocket.
- **Energy & Cost Minimization** — Every routing decision is optimized to minimize API costs and computational overhead.

## Architecture

```
┌──────────────────────────────────────────────────┐
│                 Spatial Canvas (UI)               │
│          React + React Flow + WebSocket           │
└──────────────────────┬───────────────────────────┘
                       │ bidirectional sync
┌──────────────────────▼───────────────────────────┐
│              Orchestrator Server                  │
│         HTTP + WebSocket (port 3000)              │
├────────────┬─────────────────┬────────────────────┤
│  CARM      │   MCP Client    │  Corsa Validator   │
│  Router    │   (stdio)       │  (tsgo / tsc)      │
├────────────┼─────────────────┼────────────────────┤
│ Gemini     │  Local MCP      │  TypeScript 7.0    │
│ OpenAI     │  Servers        │  Go-compiler       │
│ Anthropic  │                 │                    │
└────────────┴─────────────────┴────────────────────┘
```

## Quick Start

### Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10
- _(Optional)_ `tsgo` binary for Corsa validation (falls back to `tsc`)

### Installation

```bash
git clone https://github.com/pacificgpt/Vanguard.ts.git
cd Vanguard.ts
npm install
```

### Running

```bash
# Start the Spatial Canvas (frontend)
npm run dev

# Start the Orchestrator Server (backend) — in a separate terminal
npm run server
```

| Service       | URL                     |
|---------------|-------------------------|
| Spatial Canvas | http://localhost:5173   |
| Orchestrator   | http://localhost:3000   |

### LLM Setup

Vanguard.ts ships with **Google Gemini** as the default (free) provider. No billing is required — just grab a free API key:

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **"Create API key"** (free, no credit card)
3. Set the environment variable:

```bash
# Linux / macOS
export GOOGLE_GENERATIVE_AI_API_KEY="your-key-here"

# Windows PowerShell
$env:GOOGLE_GENERATIVE_AI_API_KEY="your-key-here"
```

That's it — CARM will automatically route prompts to **Gemini 2.0 Flash** (fast) and **Gemini 2.5 Pro** (frontier).

<details>
<summary><strong>🔌 Adding a New LLM Provider</strong></summary>

The model registry lives in `src/config/models.ts`. To add a provider, do two things:

**Step 1 — Install the Vercel AI SDK adapter:**

```bash
# Examples:
npm install @ai-sdk/openai      # OpenAI
npm install @ai-sdk/anthropic    # Anthropic
npm install @ai-sdk/groq         # Groq (free tier available)
npm install @ai-sdk/mistral      # Mistral
```

**Step 2 — Add an entry to `MODEL_REGISTRY` in `src/config/models.ts`:**

```ts
{
  id: 'groq-llama',
  name: 'Llama 3.3 70B (Groq)',
  provider: '@ai-sdk/groq',
  modelId: 'llama-3.3-70b-versatile',
  tier: 'HIGH',                    // 'LOW' or 'HIGH'
  free: true,
  envKey: 'GROQ_API_KEY',
  costMultiplier: 0,
}
```

**Step 3 — Set the API key and done!** CARM will automatically pick the best available model per tier.

| Provider  | Env Variable                      | Free Tier? |
|-----------|-----------------------------------|------------|
| Google    | `GOOGLE_GENERATIVE_AI_API_KEY`    | ✅ Yes      |
| Groq      | `GROQ_API_KEY`                    | ✅ Yes      |
| OpenAI    | `OPENAI_API_KEY`                  | ❌ Paid     |
| Anthropic | `ANTHROPIC_API_KEY`               | ❌ Paid     |
| Mistral   | `MISTRAL_API_KEY`                 | ❌ Paid     |

</details>

## Project Structure

```
vanguard/
├── src/
│   ├── config/
│   │   └── models.ts        # ⭐ Model Registry — add LLM providers here
│   ├── router/
│   │   └── carm.ts          # Compute-Aware Routing Matrix
│   ├── mcp/
│   │   └── client.ts        # Native MCP Client (stdio transport)
│   ├── validator/
│   │   └── corsa.ts         # Corsa AST Validator (tsgo / tsc)
│   ├── canvas/
│   │   ├── index.html       # Canvas entry point
│   │   ├── main.tsx         # React root
│   │   ├── App.tsx          # Spatial Canvas (React Flow + WebSocket)
│   │   └── canvas.css       # Catppuccin dark theme
│   └── server.ts            # Orchestrator server (HTTP + WebSocket)
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .gitignore
```

## Tech Stack

| Layer           | Technology                                             |
|-----------------|--------------------------------------------------------|
| Runtime         | Node.js, TypeScript 7.0 (`@typescript/native-preview`) |
| AI Routing      | Vercel AI SDK (`ai`, `@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/anthropic`) |
| Tooling/Context | `@modelcontextprotocol/sdk` (MCP)                      |
| Frontend        | React, Vite, `@xyflow/react` (React Flow)              |
| Realtime Sync   | WebSocket (`ws`)                                       |

## WebSocket Protocol

The orchestrator server communicates with the Canvas via JSON messages over WebSocket:

### Client → Server

```json
{ "action": "route", "prompt": "Explain closures in JavaScript" }
{ "action": "validate", "code": "const x: number = 42;" }
```

### Server → Client

```json
{ "event": "state:update", "data": { "nodes": [...], "edges": [...] } }
{ "event": "route:result", "data": { "tier": "LOW", "model": "Gemini 2.0 Flash", ... } }
{ "event": "validate:result", "data": { "valid": true, "durationMs": 12, ... } }
```

## License

MIT © [pacificgpt](https://github.com/pacificgpt)
