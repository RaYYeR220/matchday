import type { PolicyRules, PolicyResult, PolicyState, SpendRequest } from './types'

export function normalizeAddress(a: string): string {
  return a.trim().toLowerCase()
}

export function evaluate(rules: PolicyRules, state: PolicyState, req: SpendRequest): PolicyResult {
  if (req.amount <= 0n) return { allowed: false, reason: 'INVALID_AMOUNT' }
  if (req.timestamp < rules.window.start || req.timestamp > rules.window.end)
    return { allowed: false, reason: 'OUTSIDE_WINDOW' }
  const allow = new Set(rules.allowlist.map(normalizeAddress))
  if (!allow.has(normalizeAddress(req.to)))
    return { allowed: false, reason: 'DESTINATION_NOT_ALLOWED' }
  if (state.totalSpent + req.amount > rules.totalBudget)
    return { allowed: false, reason: 'TOTAL_BUDGET_EXCEEDED' }
  const cap = rules.perCategoryCaps[req.category]
  if (cap !== undefined) {
    const spent = state.spentByCategory[req.category] ?? 0n
    if (spent + req.amount > cap) return { allowed: false, reason: 'CATEGORY_CAP_EXCEEDED' }
  }
  return { allowed: true }
}
