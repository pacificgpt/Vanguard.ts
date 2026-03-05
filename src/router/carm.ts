/**
 * Compute-Aware Routing Matrix (CARM)
 *
 * Evaluates incoming prompt complexity and routes to the most
 * cost-effective model that can handle the task.
 *
 * Routing tiers:
 *   LOW  → gpt-4o-mini   (fast, cheap)
 *   HIGH → claude-3-5-sonnet (frontier, powerful)
 */

export type ComplexityTier = 'LOW' | 'HIGH'

export interface RoutingDecision {
    tier: ComplexityTier
    model: string
    provider: 'openai' | 'anthropic'
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
 * Main routing function — returns a RoutingDecision for the given prompt.
 */
export function route(prompt: string): RoutingDecision {
    const score = scoreComplexity(prompt)
    const isHigh = score >= 0.5

    if (isHigh) {
        return {
            tier: 'HIGH',
            model: 'claude-3-5-sonnet-20241022',
            provider: 'anthropic',
            estimatedCostMultiplier: 10,
            reasoning: `Complexity score ${score.toFixed(2)} ≥ 0.5 → routed to frontier model.`,
        }
    }

    return {
        tier: 'LOW',
        model: 'gpt-4o-mini',
        provider: 'openai',
        estimatedCostMultiplier: 1,
        reasoning: `Complexity score ${score.toFixed(2)} < 0.5 → routed to fast/cheap model.`,
    }
}
