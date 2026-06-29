export type Category = string

export interface PolicyRules {
  totalBudget: bigint
  perCategoryCaps: Record<Category, bigint>
  allowlist: string[]
  window: { start: number; end: number } // unix seconds, inclusive
}

export interface SpendRequest {
  amount: bigint
  category: Category
  to: string
  timestamp: number // unix seconds
}

export interface PolicyState {
  totalSpent: bigint
  spentByCategory: Record<Category, bigint>
}

export type PolicyViolation =
  | 'INVALID_AMOUNT'
  | 'OUTSIDE_WINDOW'
  | 'DESTINATION_NOT_ALLOWED'
  | 'TOTAL_BUDGET_EXCEEDED'
  | 'CATEGORY_CAP_EXCEEDED'

export interface PolicyResult {
  allowed: boolean
  reason?: PolicyViolation
}
