/**
 * Vanguard.ts Orchestrator Server
 *
 * Binds the CARM router, MCP client, and Corsa validator together.
 * Exposes a WebSocket server for bidirectional state sync with the
 * Spatial Delegative Canvas frontend.
 */

import http from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { route, scoreComplexity, type RoutingDecision } from './router/carm.js'
import { MCPClient } from './mcp/client.js'
import { validateCode, type ValidationResult } from './validator/corsa.js'

// ── Types ────────────────────────────────────────────────────────────────

export interface AgentNode {
    id: string
    label: string
    status: 'idle' | 'routing' | 'executing' | 'validating' | 'done' | 'error'
    model?: string
    tier?: string
}

export interface GraphEdge {
    id: string
    source: string
    target: string
    label?: string
}

interface OrchestratorState {
    nodes: AgentNode[]
    edges: GraphEdge[]
}

// ── State ────────────────────────────────────────────────────────────────

const state: OrchestratorState = {
    nodes: [
        { id: 'orchestrator', label: 'Vanguard.ts Orchestrator', status: 'idle' },
        { id: 'carm', label: 'CARM Router', status: 'idle' },
        { id: 'mcp', label: 'MCP Client', status: 'idle' },
        { id: 'corsa', label: 'Corsa Validator', status: 'idle' },
    ],
    edges: [
        { id: 'e-orch-carm', source: 'orchestrator', target: 'carm', label: 'routes' },
        { id: 'e-orch-mcp', source: 'orchestrator', target: 'mcp', label: 'tools' },
        { id: 'e-carm-corsa', source: 'carm', target: 'corsa', label: 'validates' },
    ],
}

const clients = new Set<WebSocket>()

function broadcast(event: string, data: unknown) {
    const message = JSON.stringify({ event, data })
    for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN) ws.send(message)
    }
}

function updateNodeStatus(id: string, status: AgentNode['status'], extra?: Partial<AgentNode>) {
    const node = state.nodes.find((n) => n.id === id)
    if (node) {
        node.status = status
        if (extra) Object.assign(node, extra)
    }
    broadcast('state:update', state)
}

// ── HTTP + WebSocket Server ──────────────────────────────────────────────

const server = http.createServer((_req, res) => {
    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    })
    res.end(JSON.stringify({ status: 'ok', state }))
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
    clients.add(ws)
    // Send current state on connect
    ws.send(JSON.stringify({ event: 'state:update', data: state }))

    ws.on('message', async (raw) => {
        try {
            const msg = JSON.parse(raw.toString())

            if (msg.action === 'route') {
                // Route a prompt through CARM
                updateNodeStatus('carm', 'routing')
                const decision: RoutingDecision = route(msg.prompt ?? '')
                updateNodeStatus('carm', 'done', { model: decision.model, tier: decision.tier })
                ws.send(JSON.stringify({ event: 'route:result', data: decision }))
            }

            if (msg.action === 'validate') {
                // Validate code through Corsa
                updateNodeStatus('corsa', 'validating')
                const result: ValidationResult = await validateCode(msg.code ?? '')
                updateNodeStatus('corsa', result.valid ? 'done' : 'error')
                ws.send(JSON.stringify({ event: 'validate:result', data: result }))
            }
        } catch (err) {
            ws.send(JSON.stringify({ event: 'error', data: String(err) }))
        }
    })

    ws.on('close', () => clients.delete(ws))
})

const PORT = Number(process.env.PORT) || 3000

server.listen(PORT, () => {
    console.log(`⚡ Vanguard.ts orchestrator listening on http://localhost:${PORT}`)
    console.log(`   WebSocket ready for Spatial Canvas connections`)
})
