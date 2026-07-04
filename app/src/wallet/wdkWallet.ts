import WalletManagerEvmErc4337 from '@tetherto/wdk-wallet-evm-erc-4337'
import type { Chain, MatchdayWalletLike, TransferInput, TransferReceipt } from '@matchday/wallet-multichain'
import type { Network } from '../data'

interface NetCfg {
  chainId: number
  rpc: string
  bundler: string
  usdt: string
  sponsored: boolean
  explorerTx: (id: string) => string
}

const PIMLICO_KEY = import.meta.env.VITE_PIMLICO_KEY as string | undefined

const NETS: Record<Network, NetCfg> = {
  mainnet: {
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    bundler: 'https://public.pimlico.io/v2/42161/rpc',
    usdt: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    sponsored: false,
    explorerTx: (id) => `https://arbiscan.io/tx/${id}`,
  },
  testnet: {
    chainId: 421614,
    rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
    bundler: `https://api.pimlico.io/v2/421614/rpc?apikey=${PIMLICO_KEY ?? ''}`,
    usdt: '0xa4cfcd40f2ba49d8601cd2ba6274364f0d1cb4e3', // MockUSDT (symbol USDT) on Arbitrum Sepolia
    sponsored: true, // Pimlico sponsors gas — the wallet needs no native token at all
    explorerTx: (id) => `https://sepolia.arbiscan.io/tx/${id}`,
  },
}

interface WdkAccount {
  getAddress(): Promise<string>
  getTokenBalance(token: string): Promise<bigint | string>
  transfer(o: { token: string; recipient: string; amount: bigint }): Promise<{ hash: string; fee: bigint | number }>
}

/**
 * A self-custodial wallet that runs the Tether WDK entirely in the browser: the seed stays on the
 * device, WDK signs locally, and USDT payments on Arbitrum are gasless (fee in USDT on mainnet,
 * sponsored on the testnet demo).
 */
export class WdkBrowserWallet implements MatchdayWalletLike {
  readonly network: Network
  private readonly cfg: NetCfg
  private readonly account: Promise<WdkAccount>

  constructor(mnemonic: string, network: Network = 'mainnet') {
    this.network = network
    const cfg = NETS[network]
    this.cfg = cfg
    const paymaster = cfg.sponsored
      ? { isSponsored: true as const, paymasterUrl: cfg.bundler }
      : {
          paymasterUrl: cfg.bundler,
          paymasterAddress: '0x777777777777AeC03fd955926DbF81597e66834C',
          paymasterToken: { address: cfg.usdt },
          transferMaxFee: 300000,
        }
    const manager = new WalletManagerEvmErc4337(mnemonic, {
      chainId: cfg.chainId,
      provider: cfg.rpc,
      safeModulesVersion: '0.3.0',
      bundlerUrl: cfg.bundler,
      ...paymaster,
    })
    this.account = manager.getAccount(0) as unknown as Promise<WdkAccount>
  }

  address(): Promise<string> {
    return this.account.then((a) => a.getAddress())
  }

  async getUsdtBalance(chain: Chain): Promise<bigint> {
    if (chain !== 'arbitrum') return 0n
    return BigInt(await (await this.account).getTokenBalance(this.cfg.usdt))
  }

  async transfer(chain: Chain, input: TransferInput): Promise<TransferReceipt> {
    if (chain !== 'arbitrum') throw new Error('This device wallet currently pays on Arbitrum')
    const account = await this.account
    const res = await account.transfer({ token: this.cfg.usdt, recipient: input.recipient, amount: input.amount })
    const settled = await this.settledTxHash(res.hash)
    const id = settled ?? res.hash
    return {
      chain: 'arbitrum',
      submittedHash: res.hash,
      settledHash: settled,
      explorerUrl: this.cfg.explorerTx(id),
      feeUsdt: BigInt(res.fee),
    }
  }

  /** Poll the bundler for the settled on-chain tx hash behind a userOperation. */
  private async settledTxHash(userOpHash: string): Promise<string | null> {
    for (let i = 0; i < 20; i++) {
      const res = await fetch(this.cfg.bundler, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getUserOperationReceipt', params: [userOpHash] }),
      })
      const { result } = (await res.json()) as { result?: { receipt?: { transactionHash?: string } } }
      const tx = result?.receipt?.transactionHash
      if (tx) return tx
      await new Promise((r) => setTimeout(r, 2500))
    }
    return null
  }
}
