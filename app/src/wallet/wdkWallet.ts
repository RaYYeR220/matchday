import WalletManagerEvmErc4337 from '@tetherto/wdk-wallet-evm-erc-4337'
import type { Chain, MatchdayWalletLike, TransferInput, TransferReceipt } from '@matchday/wallet-multichain'

// Arbitrum One (mainnet). Gas is paid in USDT through the ERC-4337 paymaster, so the
// wallet never needs a native gas token.
const CHAIN_ID = 42161
const RPC = 'https://arb1.arbitrum.io/rpc'
const BUNDLER = 'https://public.pimlico.io/v2/42161/rpc'
const USDT = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
const PAYMASTER = '0x777777777777AeC03fd955926DbF81597e66834C'
const explorerTx = (id: string) => `https://arbiscan.io/tx/${id}`

interface WdkAccount {
  getAddress(): Promise<string>
  getTokenBalance(token: string): Promise<bigint | string>
  transfer(o: { token: string; recipient: string; amount: bigint }): Promise<{ hash: string; fee: bigint | number }>
}

/**
 * A self-custodial wallet that runs the Tether WDK entirely in the browser: the seed stays on the
 * device, WDK signs locally, and USDT payments on Arbitrum are gasless — the fee is taken from the
 * USDT itself via the ERC-4337 paymaster, so there is no native gas token to hold.
 */
export class WdkBrowserWallet implements MatchdayWalletLike {
  private readonly account: Promise<WdkAccount>

  constructor(mnemonic: string) {
    const manager = new WalletManagerEvmErc4337(mnemonic, {
      chainId: CHAIN_ID,
      provider: RPC,
      safeModulesVersion: '0.3.0',
      bundlerUrl: BUNDLER,
      paymasterUrl: BUNDLER,
      paymasterAddress: PAYMASTER,
      paymasterToken: { address: USDT },
      transferMaxFee: 300000,
    })
    this.account = manager.getAccount(0) as unknown as Promise<WdkAccount>
  }

  address(): Promise<string> {
    return this.account.then((a) => a.getAddress())
  }

  async getUsdtBalance(chain: Chain): Promise<bigint> {
    if (chain !== 'arbitrum') return 0n
    return BigInt(await (await this.account).getTokenBalance(USDT))
  }

  async transfer(chain: Chain, input: TransferInput): Promise<TransferReceipt> {
    if (chain !== 'arbitrum') throw new Error('This device wallet currently pays on Arbitrum')
    const account = await this.account
    const res = await account.transfer({ token: USDT, recipient: input.recipient, amount: input.amount })
    const settled = await this.settledTxHash(res.hash)
    const id = settled ?? res.hash
    return {
      chain: 'arbitrum',
      submittedHash: res.hash,
      settledHash: settled,
      explorerUrl: explorerTx(id),
      feeUsdt: BigInt(res.fee),
    }
  }

  /** Poll the bundler for the settled on-chain tx hash behind a userOperation. */
  private async settledTxHash(userOpHash: string): Promise<string | null> {
    for (let i = 0; i < 20; i++) {
      const res = await fetch(BUNDLER, {
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
