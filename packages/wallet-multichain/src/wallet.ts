import WalletManagerEvmErc4337 from '@tetherto/wdk-wallet-evm-erc-4337'
import WalletManagerTonGasless from '@tetherto/wdk-wallet-ton-gasless'
import WalletManagerTronGasfree from '@tetherto/wdk-wallet-tron-gasfree'
import { CHAINS, explorerUrl, type Chain } from './chains'
import { fetchEvmUserOpReceipt, fetchTonAccountEvents } from './receipts'
import type { MatchdayWalletLike, TransferInput, TransferReceipt } from './types'

const ARBITRUM_BUNDLER = 'https://public.pimlico.io/v2/42161/rpc'

export interface WalletOpts {
  seed: string
  arbitrumRpc?: string
  ton?: { tonCenterKey?: string; tonApiKey?: string }
  tron?: { apiKey: string; apiSecret: string }
}

/** The subset of a WDK account we use (the three modules share this shape). */
interface WdkAccount {
  getAddress(): Promise<string>
  getTokenBalance(token: string): Promise<bigint>
  quoteTransfer(o: { token: string; recipient: string; amount: bigint }): Promise<{ fee: bigint | number }>
  transfer(o: { token: string; recipient: string; amount: bigint }): Promise<{ hash: string; fee: bigint | number }>
}

/** One seed → USDT across Arbitrum (ERC-4337), TON (gasless) and TRON (GasFree), all gasless. */
export class MatchdayWallet implements MatchdayWalletLike {
  private readonly accounts = new Map<Chain, Promise<WdkAccount>>()
  constructor(private readonly opts: WalletOpts) {}

  private account(chain: Chain): Promise<WdkAccount> {
    let a = this.accounts.get(chain)
    if (!a) {
      a = this.build(chain)
      this.accounts.set(chain, a)
    }
    return a
  }

  private async build(chain: Chain): Promise<WdkAccount> {
    const { seed } = this.opts
    if (chain === 'arbitrum') {
      const w = new WalletManagerEvmErc4337(seed, {
        chainId: 42161,
        provider: this.opts.arbitrumRpc ?? 'https://arb1.arbitrum.io/rpc',
        safeModulesVersion: '0.3.0',
        bundlerUrl: ARBITRUM_BUNDLER,
        paymasterUrl: ARBITRUM_BUNDLER,
        paymasterAddress: '0x777777777777AeC03fd955926DbF81597e66834C',
        paymasterToken: { address: CHAINS.arbitrum.usdt },
        transferMaxFee: 300000,
      })
      return (await w.getAccount(0)) as unknown as WdkAccount
    }
    if (chain === 'ton') {
      const w = new WalletManagerTonGasless(seed, {
        tonClient: { url: 'https://toncenter.com/api/v2/jsonRPC', secretKey: this.opts.ton?.tonCenterKey },
        tonApiClient: { url: 'https://tonapi.io', secretKey: this.opts.ton?.tonApiKey },
        paymasterToken: { address: CHAINS.ton.usdt },
        transferMaxFee: 300000,
      })
      return (await w.getAccount(0)) as unknown as WdkAccount
    }
    if (!this.opts.tron) throw new Error('tron credentials required (gasFree apiKey/apiSecret)')
    const w = new WalletManagerTronGasfree(seed, {
      chainId: 728126428,
      provider: 'https://api.trongrid.io',
      gasFreeProvider: 'https://open.gasfree.io/tron/',
      gasFreeApiKey: this.opts.tron.apiKey,
      gasFreeApiSecret: this.opts.tron.apiSecret,
      serviceProvider: 'TLntW9Z59LYY5KEi9cmwk3PKjQga828ird',
      verifyingContract: 'TFFAMQLZybALaLb4uxHA9RBE7pxhUAjF3U',
      transferMaxFee: 3_000_000,
    })
    return (await w.getAccount(0)) as unknown as WdkAccount
  }

  async getAddress(chain: Chain): Promise<string> {
    return (await this.account(chain)).getAddress()
  }

  async getUsdtBalance(chain: Chain): Promise<bigint> {
    return (await this.account(chain)).getTokenBalance(CHAINS[chain].usdt)
  }

  async quote(chain: Chain, input: TransferInput): Promise<{ feeUsdt: bigint }> {
    const a = await this.account(chain)
    const q = await a.quoteTransfer({ token: CHAINS[chain].usdt, recipient: input.recipient, amount: input.amount })
    return { feeUsdt: BigInt(q.fee) }
  }

  async transfer(chain: Chain, input: TransferInput): Promise<TransferReceipt> {
    const a = await this.account(chain)
    const res = await a.transfer({ token: CHAINS[chain].usdt, recipient: input.recipient, amount: input.amount })
    const submittedHash = res.hash
    const feeUsdt = BigInt(res.fee)
    let settledHash: string | null = submittedHash
    if (chain === 'arbitrum') {
      settledHash = (await fetchEvmUserOpReceipt(ARBITRUM_BUNDLER, submittedHash)).txHash
    } else if (chain === 'ton') {
      settledHash = (await fetchTonAccountEvents(await a.getAddress())).eventId
    }
    return {
      chain,
      submittedHash,
      settledHash,
      explorerUrl: explorerUrl(chain, settledHash ?? submittedHash),
      feeUsdt,
    }
  }
}
