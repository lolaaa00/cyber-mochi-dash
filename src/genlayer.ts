import { createClient, createAccount } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';

export const CONTRACT_ADDRESS = '0x669fe79C4185609B701E9AF5FfEaAE927d6A871B';
export const EXPLORER_TX_URL = 'https://explorer-bradbury.genlayer.com/';

const client = createClient({ chain: testnetBradbury });

export interface JudgeResult {
  second_chance: boolean;
  reason: string;
  txHash: string;
}

export async function judgeCollision(
  score: number,
  speed: number,
  realm: string
): Promise<JudgeResult> {
  const account = createAccount();

  const txHash = await client.writeContract({
    account,
    address: CONTRACT_ADDRESS,
    functionName: 'judge_collision',
    args: [score.toString(), speed.toFixed(2), realm],
    value: 0,
  });

  const receipt = await client.waitForTransactionReceipt({ hash: txHash });
  const result = JSON.parse(receipt.result ?? '{}');

  return {
    second_chance: Boolean(result.second_chance),
    reason: result.reason ?? '',
    txHash,
  };
}

export async function getStats() {
  return await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_stats',
    args: [],
  });
}

// MetaMask wallet connection — player identity display only.
export async function connectWallet(): Promise<string | null> {
  const eth = (window as Window & { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
  if (!eth) return null;
  try {
    const accounts = await eth.request({ method: 'eth_requestAccounts' }) as string[];
    return accounts[0] ?? null;
  } catch {
    return null;
  }
}

export function getConnectedWallet(): string | null {
  const eth = (window as Window & { ethereum?: { selectedAddress?: string } }).ethereum;
  return eth?.selectedAddress ?? null;
}
