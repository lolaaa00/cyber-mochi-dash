import { createClient, createAccount, generatePrivateKey } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

export const CONTRACT_ADDRESS = '0x669fe79C4185609B701E9AF5FfEaAE927d6A871B';
export const EXPLORER_URL = 'https://studio.genlayer.com';
export const EXPLORER_TX_URL = 'https://genlayer-explorer.vercel.app';

const client = createClient({ chain: studionet });

// ─── Persistent Game Wallet ──────────────────────────────────────
// One key per browser — all judge_collision txs come from this address
// so the player can track them on the GenLayer explorer.
function getOrCreateGameAccount() {
  let pk = localStorage.getItem('cyberMochiGameKey');
  if (!pk || !pk.startsWith('0x')) {
    pk = generatePrivateKey();
    localStorage.setItem('cyberMochiGameKey', pk);
  }
  return createAccount(pk as `0x${string}`);
}

export const gameAccount = getOrCreateGameAccount();
export const GAME_WALLET_ADDRESS: string = gameAccount.address;

// ─── Types ───────────────────────────────────────────────────────
export interface JudgeResult {
  second_chance: boolean;
  reason: string;
  txHash: string;
}

// ─── Write: judge a collision ────────────────────────────────────
export async function judgeCollision(
  score: number,
  speed: number,
  realm: string
): Promise<JudgeResult> {
  const txHash = await client.writeContract({
    account: gameAccount,
    address: CONTRACT_ADDRESS,
    functionName: 'judge_collision',
    args: [score.toString(), speed.toFixed(2), realm],
    value: 0n,
  });

  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    retries: 60,
  });

  const result = JSON.parse(receipt.result ?? '{}');

  return {
    second_chance: Boolean(result.second_chance),
    reason: result.reason ?? '',
    txHash: txHash as string,
  };
}

// ─── Read: contract stats ─────────────────────────────────────────
export async function getStats(): Promise<{ total_judgments: number; second_chances: number }> {
  return await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_stats',
    args: [],
  }) as { total_judgments: number; second_chances: number };
}

// ─── MetaMask: display identity only ─────────────────────────────
type EthProvider = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown>; selectedAddress?: string };
function getEth(): EthProvider | undefined {
  return (window as unknown as { ethereum?: EthProvider }).ethereum;
}

export async function connectWallet(): Promise<string | null> {
  const eth = getEth();
  if (!eth) return null;
  try {
    const accounts = await eth.request({ method: 'eth_requestAccounts' }) as string[];
    return accounts[0] ?? null;
  } catch {
    return null;
  }
}

export function getConnectedWallet(): string | null {
  return getEth()?.selectedAddress ?? null;
}
