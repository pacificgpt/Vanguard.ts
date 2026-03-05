/**
 * Corsa AST Validator
 *
 * Pipes agent-generated TypeScript code into the `tsgo` binary
 * (TypeScript 7.0 / Project Corsa Go-compiler) with the --incremental
 * flag to validate syntax and types in milliseconds before execution.
 *
 * Falls back to the standard `tsc` binary if `tsgo` is not available.
 */

import { spawn } from 'node:child_process'
import { writeFile, unlink, mkdir } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import os from 'node:os'

export interface ValidationResult {
    valid: boolean
    errors: string[]
    durationMs: number
    compiler: 'tsgo' | 'tsc'
}

const TEMP_DIR = path.join(os.tmpdir(), 'vanguard-corsa')

/**
 * Validate a TypeScript code string using tsgo (or tsc fallback).
 */
export async function validateCode(code: string): Promise<ValidationResult> {
    await mkdir(TEMP_DIR, { recursive: true })

    const filename = `validate_${randomUUID().slice(0, 8)}.ts`
    const filepath = path.join(TEMP_DIR, filename)

    try {
        await writeFile(filepath, code, 'utf-8')
        return await runCompiler(filepath)
    } finally {
        // Cleanup temp file
        await unlink(filepath).catch(() => { })
    }
}

async function runCompiler(filepath: string): Promise<ValidationResult> {
    // Attempt tsgo first, fall back to tsc
    for (const compiler of ['tsgo', 'tsc'] as const) {
        try {
            return await execCompiler(compiler, filepath)
        } catch {
            if (compiler === 'tsgo') continue // try tsc next
            throw new Error('Neither tsgo nor tsc could be found on PATH.')
        }
    }
    throw new Error('Compiler not found.')
}

function execCompiler(
    compiler: 'tsgo' | 'tsc',
    filepath: string
): Promise<ValidationResult> {
    return new Promise((resolve, reject) => {
        const start = performance.now()
        const args =
            compiler === 'tsgo'
                ? ['--incremental', '--noEmit', filepath]
                : ['--noEmit', '--strict', filepath]

        const proc = spawn(compiler, args, { shell: true })

        let stdout = ''
        let stderr = ''

        proc.stdout.on('data', (d) => (stdout += d.toString()))
        proc.stderr.on('data', (d) => (stderr += d.toString()))

        proc.on('error', () => reject(new Error(`${compiler} not found`)))
        proc.on('close', (code) => {
            const durationMs = Math.round(performance.now() - start)
            const output = (stdout + '\n' + stderr).trim()
            const errors = code === 0 ? [] : output.split('\n').filter(Boolean)

            resolve({
                valid: code === 0,
                errors,
                durationMs,
                compiler,
            })
        })
    })
}
