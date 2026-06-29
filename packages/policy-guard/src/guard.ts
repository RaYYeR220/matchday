import { applySpend, evaluate, type PolicyRules, type SpendRequest } from '@matchday/policy-core'
import { PolicyViolationError } from './errors'
import type { StateStore } from './store'

/**
 * On-device enforcement: checks a spend against the policy before it executes,
 * and advances the per-key spend state only if execution succeeds.
 */
export class PolicyGuard {
  constructor(private readonly store: StateStore) {}

  async check(key: string, rules: PolicyRules, req: SpendRequest): Promise<void> {
    const state = await this.store.get(key)
    const res = evaluate(rules, state, req)
    if (!res.allowed) throw new PolicyViolationError(res.reason!)
  }

  async run<T>(key: string, rules: PolicyRules, req: SpendRequest, exec: () => Promise<T>): Promise<T> {
    await this.check(key, rules, req)
    const out = await exec()
    await this.store.set(key, applySpend(await this.store.get(key), req))
    return out
  }
}
