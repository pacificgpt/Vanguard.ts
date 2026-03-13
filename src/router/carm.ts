/**
 * Compute-Aware Routing Matrix (CARM)
 *
 * Evaluates incoming prompt complexity and routes to the most
 * cost-effective model that can handle the task.
 *
 * Model selection is driven by the pluggable Model Registry
 * in src/config/models.ts — add new providers there.
 *
 * Routing tiers:
 *   LOW  → fast/cheap model  (default: Gemini 2.0 Flash — free)
 *   HIGH → frontier model    (default: Gemini 2.5 Pro   — free)
 */

import { resolveModel, type ComplexityTier, type ModelEntry } from '../config/models.js'

export type { ComplexityTier } from '../config/models.js'

export interface RoutingDecision {
  tier: ComplexityTier
  model: string
  modelId: string
  provider: string
  free: boolean
  estimatedCostMultiplier: number
  reasoning: string
}

/** Signals that push complexity higher */
const HIGH_COMPLEXITY_SIGNALS = [
  /\bmulti[- ]?step\b/i,
  /\banalyze\b/i,
  /\brefactor\b/i,
  /\barchitect(ure)?\b/i,
  /\bdesign pattern\b/i,
  /\bdebug\b/i,
  /\boptimize\b/i,
  /\bcompare\b/i,
  /\btrade[- ]?off/i,
  /\bsecurity\b/i,
  /\bperformance\b/i,
  /\bconcurrency\b/i,
  /\bdistributed\b/i,
]

/** Token-count thresholds (approximation: 1 token ≈ 4 chars) */
const TOKEN_THRESHOLD_HIGH = 200

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Score a prompt from 0 → 1 based on heuristic signals.
 */
export function scoreComplexity(prompt: string): number {
  let score = 0
  const tokens = estimateTokens(prompt)

  // Length component (0 – 0.4)
  score += Math.min(tokens / TOKEN_THRESHOLD_HIGH, 1) * 0.4

  // Signal component (0 – 0.6)
  const matchCount = HIGH_COMPLEXITY_SIGNALS.filter((r) => r.test(prompt)).length
  score += Math.min(matchCount / 4, 1) * 0.6

  return Math.min(score, 1)
}

/**
 * Build a RoutingDecision from a resolved ModelEntry.
 */
function toDecision(entry: ModelEntry, score: number, tier: ComplexityTier): RoutingDecision {
  return {
    tier,
    model: entry.name,
    modelId: entry.modelId,
    provider: entry.provider,
    free: entry.free,
    estimatedCostMultiplier: entry.costMultiplier,
    reasoning: tier === 'HIGH'
      ? `Complexity score ${score.toFixed(2)} ≥ 0.5 → routed to frontier model (${entry.name}).`
      : `Complexity score ${score.toFixed(2)} < 0.5 → routed to fast/cheap model (${entry.name}).`,
  }
}

/**
 * Main routing function — returns a RoutingDecision for the given prompt.
 * Model selection is automatic based on the Model Registry and available API keys.
 */
export function route(prompt: string): RoutingDecision {
  const score = scoreComplexity(prompt)
  const tier: ComplexityTier = score >= 0.5 ? 'HIGH' : 'LOW'
  const entry = resolveModel(tier)
  return toDecision(entry, score, tier)
}
