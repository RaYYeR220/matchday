import WalletManagerEvmErc4337 from '@tetherto/wdk-wallet-evm-erc-4337'
import type { Chain, MatchdayWalletLike, TransferInput, TransferReceipt } from '@matchday/wallet-multichain'

const USDT = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
const BUNDLER = 'https://public.pimlico.io/v2/42161/rpc'

interface WdkAccount {
  getAddress(): Promise<string>
  getTokenBalance(token: string): Promise<bigint | string>
  transfer(o: { token: string; recipient: string; amount: bigint }): Promise<{ hash: string; fee: bigint | number }>
}

/** Poll the bundler for the settled on-chain tx hash behind a userOperation. */
async function settledTxHash(userOpHash: string): Promise<string | null> {
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

/**
 * A self-custodial wallet that runs the Tether WDK entirely in the browser: the seed stays on the
 * device, WDK signs locally, and USDT payments on Arbitrum are gasless (the fee is paid in USDT).
 */
export class WdkBrowserWallet implements MatchdayWalletLike {
  private readonly account: Promise<WdkAccount>

  constructor(mnemonic: string, arbitrumRpc = 'https://arb1.arbitrum.io/rpc') {
    const manager = new WalletManagerEvmErc4337(mnemonic, {
      chainId: 42161,
      provider: arbitrumRpc,
      safeModulesVersion: '0.3.0',
      bundlerUrl: BUNDLER,
      paymasterUrl: BUNDLER,
      paymasterAddress: '0x777777777777AeC03fd955926DbF81597e66834C',
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
    const settled = await settledTxHash(res.hash)
    const id = settled ?? res.hash
    return {
      chain: 'arbitrum',
      submittedHash: res.hash,
      settledHash: settled,
      explorerUrl: `https://arbiscan.io/tx/${id}`,
      feeUsdt: BigInt(res.fee),
    }
  }
}
