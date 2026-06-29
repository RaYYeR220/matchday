import type { PolicyState, SpendRequest } from './types'

export function emptyState(): PolicyState {
  return { totalSpent: 0n, spentByCategory: {}, lastSpentAt: {} }
}

export function applySpend(state: PolicyState, req: SpendRequest): PolicyState {
  return {
    totalSpent: state.totalSpent + req.amount,
    spentByCategory: {
      ...state.spentByCategory,
      [req.category]: (state.spentByCategory[req.category] ?? 0n) + req.amount,
    },
    lastSpentAt: {
      ...(state.lastSpentAt ?? {}),
      [req.category]: req.timestamp,
    },
  }
}
