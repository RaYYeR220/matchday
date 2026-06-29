import { expect, test } from 'vitest'
import { parseEvmUserOpReceipt, parseTonEvents } from './receipts'

// Real recorded fixtures from the Plan-1 spikes (spec §12).
const evmRpc = {
  jsonrpc: '2.0',
  id: 1,
  result: {
    success: true,
    receipt: {
      transactionHash: '0xbc9fa681adc083bd79017d09038c0e5d210bd079efd735a3f68de2813e7162e9',
      blockNumber: '0x1c8e8f47',
    },
  },
}

const tonEvents = {
  events: [
    {
      event_id: '114a9ab68d7b51434628b34b35f1161e66e56894131ddb9b29591b83087ef982',
      in_progress: false,
      actions: [{ type: 'GasRelay' }, { type: 'JettonTransfer' }, { type: 'JettonTransfer' }, { type: 'ContractDeploy' }],
    },
    { event_id: '34ff0de1b11b327e71d0f80c3cf70c07c65e49d7c71d68c409c523fb96e05607', in_progress: false, actions: [{ type: 'JettonTransfer' }] },
  ],
}

test('parseEvmUserOpReceipt extracts the settled tx hash + success', () => {
  expect(parseEvmUserOpReceipt(evmRpc)).toEqual({
    txHash: '0xbc9fa681adc083bd79017d09038c0e5d210bd079efd735a3f68de2813e7162e9',
    success: true,
  })
})

test('parseEvmUserOpReceipt handles a not-yet-included userOp', () => {
  expect(parseEvmUserOpReceipt({ jsonrpc: '2.0', id: 1, result: null })).toEqual({ txHash: null, success: false })
})

test('parseTonEvents finds the gasless (GasRelay + JettonTransfer) event', () => {
  expect(parseTonEvents(tonEvents)).toEqual({
    eventId: '114a9ab68d7b51434628b34b35f1161e66e56894131ddb9b29591b83087ef982',
    gasless: true,
    settled: true,
  })
})

test('parseTonEvents returns empty when no gasless jetton event present', () => {
  expect(parseTonEvents({ events: [{ event_id: 'x', in_progress: false, actions: [{ type: 'TonTransfer' }] }] }))
    .toEqual({ eventId: null, gasless: false, settled: false })
})
