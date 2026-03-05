/**
 * Native MCP Client
 *
 * Connects to a local Model Context Protocol server via stdio transport,
 * dynamically discovers available tools, and caches the tool list.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

export interface MCPTool {
    name: string
    description?: string
    inputSchema?: Record<string, unknown>
}

export class MCPClient {
    private client: Client
    private transport: StdioClientTransport | null = null
    private toolCache: MCPTool[] | null = null

    constructor() {
        this.client = new Client(
            { name: 'vanguard-mcp-client', version: '1.0.0' },
            { capabilities: {} }
        )
    }

    /**
     * Connect to a local MCP server by spawning a process.
     * @param command  The command to execute (e.g. "node")
     * @param args     Arguments for the command (e.g. ["./my-mcp-server.js"])
     */
    async connect(command: string, args: string[] = []): Promise<void> {
        this.transport = new StdioClientTransport({ command, args })
        await this.client.connect(this.transport)
        // Pre-warm the tool cache on connect
        await this.discoverTools()
    }

    /**
     * Discover tools from the connected MCP server.
     * Results are cached — call `invalidateCache()` to refresh.
     */
    async discoverTools(): Promise<MCPTool[]> {
        if (this.toolCache) return this.toolCache

        const result = await this.client.listTools()
        this.toolCache = result.tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema as Record<string, unknown>,
        }))

        return this.toolCache
    }

    /**
     * Call a tool on the MCP server.
     */
    async callTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
        const result = await this.client.callTool({ name, arguments: args })
        return result.content
    }

    /** Clear the cached tool list so the next `discoverTools` call fetches fresh data. */
    invalidateCache(): void {
        this.toolCache = null
    }

    /** Gracefully disconnect from the MCP server. */
    async disconnect(): Promise<void> {
        await this.transport?.close()
        this.toolCache = null
    }
}
