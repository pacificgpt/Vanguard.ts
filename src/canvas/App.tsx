import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    Node,
    Edge,
    useNodesState,
    useEdgesState,
    MarkerType,
    Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './canvas.css'

/* ── Types from backend ── */
interface AgentNode {
    id: string
    label: string
    status: 'idle' | 'routing' | 'executing' | 'validating' | 'done' | 'error'
    model?: string
    tier?: string
}

interface GraphEdge {
    id: string
    source: string
    target: string
    label?: string
}

interface ServerState {
    nodes: AgentNode[]
    edges: GraphEdge[]
}

/* ── Status → Style map ── */
const STATUS_COLORS: Record<string, { bg: string; border: string; glow: string }> = {
    idle: { bg: '#1e1e2e', border: '#45475a', glow: 'none' },
    routing: { bg: '#1e1e2e', border: '#f9e2af', glow: '0 0 12px #f9e2af66' },
    executing: { bg: '#1e1e2e', border: '#89b4fa', glow: '0 0 12px #89b4fa66' },
    validating: { bg: '#1e1e2e', border: '#a6e3a1', glow: '0 0 12px #a6e3a166' },
    done: { bg: '#1e1e2e', border: '#a6e3a1', glow: '0 0 16px #a6e3a144' },
    error: { bg: '#1e1e2e', border: '#f38ba8', glow: '0 0 16px #f38ba866' },
}

/* ── Layout positions ── */
const LAYOUT: Record<string, { x: number; y: number }> = {
    orchestrator: { x: 300, y: 40 },
    carm: { x: 100, y: 220 },
    mcp: { x: 500, y: 220 },
    corsa: { x: 100, y: 400 },
}

function toFlowNodes(agentNodes: AgentNode[]): Node[] {
    return agentNodes.map((n) => {
        const colors = STATUS_COLORS[n.status] ?? STATUS_COLORS.idle
        const pos = LAYOUT[n.id] ?? { x: 300, y: 300 }
        return {
            id: n.id,
            position: pos,
            data: {
                label: (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{n.label}</div>
                        <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {n.status}{n.model ? ` · ${n.model}` : ''}
                        </div>
                    </div>
                ),
            },
            style: {
                background: colors.bg,
                color: '#cdd6f4',
                border: `2px solid ${colors.border}`,
                borderRadius: 12,
                padding: '14px 20px',
                boxShadow: colors.glow,
                transition: 'all 0.3s ease',
                minWidth: 180,
            },
        }
    })
}

function toFlowEdges(graphEdges: GraphEdge[]): Edge[] {
    return graphEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: true,
        style: { stroke: '#585b70', strokeWidth: 2 },
        labelStyle: { fill: '#a6adc8', fontSize: 11 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#585b70' },
    }))
}

const WS_URL = 'ws://localhost:3000'

export default function App() {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
    const [connected, setConnected] = useState(false)
    const [log, setLog] = useState<string[]>([])
    const wsRef = useRef<WebSocket | null>(null)

    const addLog = useCallback((msg: string) => {
        setLog((prev) => [...prev.slice(-19), `[${new Date().toLocaleTimeString()}] ${msg}`])
    }, [])

    useEffect(() => {
        let ws: WebSocket

        function connect() {
            ws = new WebSocket(WS_URL)
            wsRef.current = ws

            ws.onopen = () => {
                setConnected(true)
                addLog('Connected to Vanguard orchestrator')
            }

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data)
                    if (msg.event === 'state:update') {
                        const state: ServerState = msg.data
                        setNodes(toFlowNodes(state.nodes))
                        setEdges(toFlowEdges(state.edges))
                    }
                    if (msg.event === 'route:result') {
                        addLog(`Routed → ${msg.data.model} (${msg.data.tier})`)
                    }
                    if (msg.event === 'validate:result') {
                        addLog(`Validation: ${msg.data.valid ? '✓ pass' : '✗ fail'} (${msg.data.durationMs}ms)`)
                    }
                } catch { /* ignore */ }
            }

            ws.onclose = () => {
                setConnected(false)
                addLog('Disconnected — retrying in 3s…')
                setTimeout(connect, 3000)
            }

            ws.onerror = () => ws.close()
        }

        connect()

        return () => {
            ws?.close()
        }
    }, [addLog, setNodes, setEdges])

    // Fallback: if WebSocket is offline, show default layout
    useEffect(() => {
        if (nodes.length === 0) {
            const defaults: AgentNode[] = [
                { id: 'orchestrator', label: 'Vanguard.ts Orchestrator', status: 'idle' },
                { id: 'carm', label: 'CARM Router', status: 'idle' },
                { id: 'mcp', label: 'MCP Client', status: 'idle' },
                { id: 'corsa', label: 'Corsa Validator', status: 'idle' },
            ]
            const defaultEdges: GraphEdge[] = [
                { id: 'e-orch-carm', source: 'orchestrator', target: 'carm', label: 'routes' },
                { id: 'e-orch-mcp', source: 'orchestrator', target: 'mcp', label: 'tools' },
                { id: 'e-carm-corsa', source: 'carm', target: 'corsa', label: 'validates' },
            ]
            setNodes(toFlowNodes(defaults))
            setEdges(toFlowEdges(defaultEdges))
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#11111b' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
                colorMode="dark"
                proOptions={{ hideAttribution: true }}
            >
                <Background gap={16} size={1} color="#313244" />
                <Controls
                    style={{ background: '#1e1e2e', border: '1px solid #45475a', borderRadius: 8 }}
                />
                <MiniMap
                    nodeColor="#89b4fa"
                    maskColor="rgba(17,17,27,0.85)"
                    style={{ background: '#1e1e2e', border: '1px solid #45475a', borderRadius: 8 }}
                />

                {/* Header Panel */}
                <Panel position="top-left">
                    <div className="vg-header">
                        <span className="vg-logo">◆</span>
                        <span className="vg-title">Vanguard.ts</span>
                        <span className={`vg-status-badge ${connected ? 'online' : 'offline'}`}>
                            {connected ? '● Connected' : '○ Offline'}
                        </span>
                    </div>
                </Panel>

                {/* Log Panel */}
                <Panel position="bottom-left">
                    <div className="vg-log-panel">
                        <div className="vg-log-header">Activity Log</div>
                        <div className="vg-log-body">
                            {log.length === 0
                                ? <div style={{ opacity: 0.4 }}>Waiting for events…</div>
                                : log.map((l, i) => <div key={i} className="vg-log-line">{l}</div>)}
                        </div>
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    )
}
