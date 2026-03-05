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

- **Compute-Aware Routing (CARM)** — Automatically evaluates prompt complexity and routes to the most cost-effective model. Low-complexity tasks go to fast/cheap models (`gpt-4o-mini`), high-complexity tasks route to frontier models (`claude-3.5-sonnet`).
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
│ gpt-4o-mini│  Local MCP      │  TypeScript 7.0    │
│ claude-3.5 │  Servers        │  Go-compiler       │
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

### Environment Variables

Set your API keys to enable AI model routing:

```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
```

## Project Structure

```
vanguard/
├── src/
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
| AI Routing      | Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`) |
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
{ "event": "route:result", "data": { "tier": "LOW", "model": "gpt-4o-mini", ... } }
{ "event": "validate:result", "data": { "valid": true, "durationMs": 12, ... } }
```

## License

MIT © [pacificgpt](https://github.com/pacificgpt)
