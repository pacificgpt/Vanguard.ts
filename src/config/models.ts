/**
 * Model Registry — Pluggable LLM Configuration
 *
 * This file defines all available model providers and their models.
 * CARM uses this registry to pick models for each complexity tier.
 *
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HOW TO ADD A NEW LLM PROVIDER                                 ║
 * ║                                                                ║
 * ║  1. Install the Vercel AI SDK adapter:                         ║
 * ║       npm install @ai-sdk/<provider>                           ║
 * ║                                                                ║
 * ║  2. Add an entry to the `MODEL_REGISTRY` below with:           ║
 * ║       • id         — unique key (e.g. "mistral-large")         ║
 * ║       • name       — human-readable display name               ║
 * ║       • provider   — SDK package name                          ║
 * ║       • modelId    — the model string the SDK expects          ║
 * ║       • tier       — "LOW" or "HIGH"                           ║
 * ║       • free       — true if no API key / billing required     ║
 * ║       • envKey     — env variable name for the API key         ║
 * ║                                                                ║
 * ║  3. That's it! CARM will automatically pick it up.             ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Currently supported FREE providers:
 *   • Google Gemini  — free tier via Google AI Studio (no billing)
 *
 * Paid providers (included but disabled by default):
 *   • OpenAI         — requires OPENAI_API_KEY
 *   • Anthropic      — requires ANTHROPIC_API_KEY
 */

export type ComplexityTier = 'LOW' | 'HIGH'

export interface ModelEntry {
  /** Unique identifier */
  id: string
  /** Human-readable name */
  name: string
  /** Vercel AI SDK provider package (e.g. "@ai-sdk/google") */
  provider: string
  /** Model identifier string passed to the SDK */
  modelId: string
  /** Which complexity tier this model serves */
  tier: ComplexityTier
  /** True if no API key or billing is required */
  free: boolean
  /** Environment variable name that holds the API key */
  envKey: string
  /** Approximate relative cost (1 = cheapest baseline) */
  costMultiplier: number
}

// ─────────────────────────────────────────────────────────────────
//  MODEL REGISTRY — add new models here
// ─────────────────────────────────────────────────────────────────

export const MODEL_REGISTRY: ModelEntry[] = [
  // ── FREE: Google Gemini (via Google AI Studio) ──────────────
  {
    id: 'gemini-flash',
    name: 'Gemini 2.0 Flash',
    provider: '@ai-sdk/google',
    modelId: 'gemini-2.0-flash',
    tier: 'LOW',
    free: true,
    envKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
    costMultiplier: 0,
  },
  {
    id: 'gemini-pro',
    name: 'Gemini 2.5 Pro',
    provider: '@ai-sdk/google',
    modelId: 'gemini-2.5-pro-preview-05-06',
    tier: 'HIGH',
    free: true,
    envKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
    costMultiplier: 0,
  },

  // ── PAID: OpenAI ────────────────────────────────────────────
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: '@ai-sdk/openai',
    modelId: 'gpt-4o-mini',
    tier: 'LOW',
    free: false,
    envKey: 'OPENAI_API_KEY',
    costMultiplier: 1,
  },

  // ── PAID: Anthropic ─────────────────────────────────────────
  {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: '@ai-sdk/anthropic',
    modelId: 'claude-3-5-sonnet-20241022',
    tier: 'HIGH',
    free: false,
    envKey: 'ANTHROPIC_API_KEY',
    costMultiplier: 10,
  },

  // ────────────────────────────────────────────────────────────
  //  ➕ ADD YOUR OWN MODELS BELOW
  //  Example — Groq (free tier, very fast):
  //
  //  {
  //    id: 'groq-llama',
  //    name: 'Llama 3.3 70B (Groq)',
  //    provider: '@ai-sdk/groq',          // npm install @ai-sdk/groq
  //    modelId: 'llama-3.3-70b-versatile',
  //    tier: 'HIGH',
  //    free: true,
  //    envKey: 'GROQ_API_KEY',
  //    costMultiplier: 0,
  //  },
  //
  //  Example — Mistral:
  //
  //  {
  //    id: 'mistral-small',
  //    name: 'Mistral Small',
  //    provider: '@ai-sdk/mistral',       // npm install @ai-sdk/mistral
  //    modelId: 'mistral-small-latest',
  //    tier: 'LOW',
  //    free: false,
  //    envKey: 'MISTRAL_API_KEY',
  //    costMultiplier: 2,
  //  },
  // ────────────────────────────────────────────────────────────
]

/**
 * Returns the best available model for a given tier.
 *
 * Priority:
 *   1. Free models whose API key is set in env
 *   2. Paid models whose API key is set in env
 *   3. First free model (even if key isn't set — some providers allow keyless local use)
 */
export function resolveModel(tier: ComplexityTier): ModelEntry {
  const candidates = MODEL_REGISTRY.filter((m) => m.tier === tier)

  // Prefer models that have their API key configured
  const configured = candidates.filter((m) => process.env[m.envKey])

  if (configured.length > 0) {
    // Free configured first, then paid configured (cheapest first)
    const freeConfigured = configured.filter((m) => m.free)
    if (freeConfigured.length > 0) return freeConfigured[0]
    return configured.sort((a, b) => a.costMultiplier - b.costMultiplier)[0]
  }

  // Fallback: first free model in registry for this tier
  const free = candidates.filter((m) => m.free)
  if (free.length > 0) return free[0]

  // Last resort: first model in the tier
  return candidates[0]
}

/** List all models that have their API key configured. */
export function listConfiguredModels(): ModelEntry[] {
  return MODEL_REGISTRY.filter((m) => m.free || process.env[m.envKey])
}
