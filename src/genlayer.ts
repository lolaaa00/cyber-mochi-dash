import { createClient, createAccount, generatePrivateKey } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';

export const CONTRACT_ADDRESS = '0x669fe79C4185609B701E9AF5FfEaAE927d6A871B';
export const EXPLORER_URL = 'https://studio.genlayer.com/';

const client = createClient({ chain: testnetBradbury });

// Persistent game wallet — generated once, stored in localStorage.
// All judge_collision calls come from this address so the player can
// track their own transactions on the GenLayer explorer.
function getOrCreateGameAccount() {
  let pk = localStorage.getItem('cyberMochiGameKey');
  if (!pk) {
    pk = generatePrivateKey();
    localStorage.setItem('cyberMochiGameKey', pk);
  }
  return createAccount(pk as `0x${string}`);
}

export const gameAccount = getOrCreateGameAccount();
export const GAME_WALLET_ADDRESS: string = gameAccount.address;

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
  const txHash = await client.writeContract({
    account: gameAccount,
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

// MetaMask wallet — display identity only.
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
