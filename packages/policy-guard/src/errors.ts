import type { PolicyViolation } from '@matchday/policy-core'

export class PolicyViolationError extends Error {
  constructor(public readonly reason: PolicyViolation) {
    super(`policy violation: ${reason}`)
    this.name = 'PolicyViolationError'
  }
}
