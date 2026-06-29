import { emptyState, type PolicyState } from '@matchday/policy-core'

export interface StateStore {
  get(key: string): Promise<PolicyState>
  set(key: string, state: PolicyState): Promise<void>
}

export class InMemoryStateStore implements StateStore {
  private readonly m = new Map<string, PolicyState>()
  async get(key: string): Promise<PolicyState> {
    return this.m.get(key) ?? emptyState()
  }
  async set(key: string, state: PolicyState): Promise<void> {
    this.m.set(key, state)
  }
}
