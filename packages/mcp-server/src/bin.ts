#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { MatchdayAgentEngine, type AgentWallet } from './engine'
import { createServer } from './server'

async function main() {
  const seed = process.env.MATCHDAY_SEED
  const wantLive = process.env.MATCHDAY_LIVE === '1'
  let wallet: AgentWallet | undefined
  if (wantLive && seed) {
    const { createLiveWallet } = await import('./wallet')
    wallet = await createLiveWallet(seed)
  }
  const demoBalanceUsdt = Number(process.env.MATCHDAY_DEMO_BALANCE ?? '5')
  const engine = new MatchdayAgentEngine({ wallet, demoBalanceUsdt })
  await createServer(engine).connect(new StdioServerTransport())
  // Logs go to stderr — stdout is the MCP JSON-RPC transport.
  console.error(`matchday-mcp ready · ${engine.live ? 'LIVE (Arbitrum gasless)' : 'DEMO (policy-checked, no funds moved)'}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
