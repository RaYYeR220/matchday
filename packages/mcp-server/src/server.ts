import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { MatchdayAgentEngine } from './engine'
import { fmt } from './rules'

const json = (obj: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(obj, null, 2) }] })

/**
 * Expose the policy-bound Matchday wallet to an AI agent over MCP. The agent can read the
 * balance and rules, preview a payment, and pay — but every payment is checked against the
 * fan's matchday policy first, so the agent can never exceed the budget, a cap, or a cooldown.
 */
export function createServer(engine: MatchdayAgentEngine): McpServer {
  const server = new McpServer({ name: 'matchday-wallet', version: '0.1.0' })
  const mode = engine.live ? 'live (real gasless USDT on Arbitrum)' : 'demo (policy-checked, no funds moved)'

  server.registerTool(
    'matchday_get_balance',
    { title: 'Get USDT balance', description: 'The fan wallet USDT balance and whether payments are live or a demo.', inputSchema: {} },
    async () => json({ balanceUsdt: fmt(await engine.getBalance()), mode }),
  )

  server.registerTool(
    'matchday_get_policy',
    {
      title: 'Get the spend policy',
      description: 'The matchday budget, per-category caps, per-tap stake caps, cooldowns, allowlist and current spend — the limits every agent payment is checked against (identical to the on-chain rules hash).',
      inputSchema: {},
    },
    async () => {
      const p = await engine.getPolicy()
      return json({
        mode,
        budgetUsdt: fmt(p.totalBudget),
        spentUsdt: fmt(p.totalSpent),
        remainingUsdt: fmt(p.remaining),
        categories: p.categories.map((c) => ({ category: c.category, label: c.label, capUsdt: fmt(c.cap), spentUsdt: fmt(c.spent), remainingUsdt: fmt(c.remaining) })),
        perTapStakeCapsUsdt: Object.fromEntries(Object.entries(p.stakeCaps).map(([k, v]) => [k, fmt(v)])),
        cooldownSeconds: p.cooldownSeconds,
        allowlist: p.allowlist,
        rulesHash: p.rulesHash,
      })
    },
  )

  server.registerTool(
    'matchday_list_categories',
    { title: 'List spend categories', description: 'The categories an agent may pay into and their pre-approved payee.', inputSchema: {} },
    async () => json(engine.listCategories()),
  )

  server.registerTool(
    'matchday_quote_payment',
    {
      title: 'Preview a payment',
      description: 'Check whether a payment would be allowed by the policy, without spending. Returns allowed=true, or the exact rule that blocks it.',
      inputSchema: { category: z.string().describe('bar | cheers | merch | pool'), amountUsdt: z.number().positive(), recipient: z.string().optional().describe('defaults to the category payee; must be allowlisted') },
    },
    async ({ category, amountUsdt, recipient }) => {
      const q = await engine.quote(category, amountUsdt, recipient)
      return json(q.allowed ? { allowed: true, category, amountUsdt, to: q.to } : { allowed: false, blockedBy: q.reason, category, amountUsdt, to: q.to })
    },
  )

  server.registerTool(
    'matchday_pay',
    {
      title: 'Pay (policy-checked)',
      description: 'Make a gasless USDT payment in a category. The policy is enforced FIRST: over-budget, over-cap, over-stake, cooldown or off-allowlist payments are rejected before anything is signed. In demo mode no funds move; in live mode it is a real gasless transfer on Arbitrum.',
      inputSchema: { category: z.string().describe('bar | cheers | merch | pool'), amountUsdt: z.number().positive(), recipient: z.string().optional().describe('defaults to the category payee; must be allowlisted') },
    },
    async ({ category, amountUsdt, recipient }) => {
      const r = await engine.pay(category, amountUsdt, recipient)
      if (r.ok) return json({ paid: true, mode, category, amountUsdt, to: r.to, feeUsdt: fmt(r.feeUsdt), explorerUrl: r.explorerUrl, simulated: r.simulated })
      if (r.blocked) return json({ paid: false, blockedByPolicy: r.reason, category, amountUsdt, to: r.to, note: 'The fan policy rejected this — the agent cannot exceed the rules.' })
      return json({ paid: false, error: r.error })
    },
  )

  return server
}
