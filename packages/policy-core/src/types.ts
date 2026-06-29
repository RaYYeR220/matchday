export type Category = string

export interface PolicyRules {
  totalBudget: bigint
  perCategoryCaps: Record<Category, bigint>
  /** Max amount of a SINGLE spend per category (tilt-cap / over-tip protection). */
  perCategoryStakeCaps?: Record<Category, bigint>
  /** Minimum seconds between spends in a category (cooldown). */
  cooldownSeconds?: Record<Category, number>
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
  /** Unix-seconds timestamp of the last spend per category (for cooldown checks). */
  lastSpentAt?: Record<Category, number>
}

export type PolicyViolation =
  | 'INVALID_AMOUNT'
  | 'OUTSIDE_WINDOW'
  | 'DESTINATION_NOT_ALLOWED'
  | 'STAKE_CAP_EXCEEDED'
  | 'COOLDOWN_ACTIVE'
  | 'TOTAL_BUDGET_EXCEEDED'
  | 'CATEGORY_CAP_EXCEEDED'

export interface PolicyResult {
  allowed: boolean
  reason?: PolicyViolation
}
