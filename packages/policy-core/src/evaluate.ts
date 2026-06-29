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
  const stakeCap = rules.perCategoryStakeCaps?.[req.category]
  if (stakeCap !== undefined && req.amount > stakeCap)
    return { allowed: false, reason: 'STAKE_CAP_EXCEEDED' }
  const cooldown = rules.cooldownSeconds?.[req.category]
  if (cooldown !== undefined && cooldown > 0) {
    const last = state.lastSpentAt?.[req.category]
    if (last !== undefined && req.timestamp - last < cooldown)
      return { allowed: false, reason: 'COOLDOWN_ACTIVE' }
  }
  if (state.totalSpent + req.amount > rules.totalBudget)
    return { allowed: false, reason: 'TOTAL_BUDGET_EXCEEDED' }
  const cap = rules.perCategoryCaps[req.category]
  if (cap !== undefined) {
    const spent = state.spentByCategory[req.category] ?? 0n
    if (spent + req.amount > cap) return { allowed: false, reason: 'CATEGORY_CAP_EXCEEDED' }
  }
  return { allowed: true }
}
