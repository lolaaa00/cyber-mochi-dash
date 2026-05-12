import { createClient, createAccount } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';

const client = createClient({ network: testnetBradbury });

export const CONTRACT_ADDRESS = '0x681D6Ff474B6d16e7c0A17b721c03e47462D2F19';

export async function judgeCollision(
  score: number,
  speed: number,
  realm: string
): Promise<{ second_chance: boolean; reason: string; txHash: string }> {
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
    second_chance: result.second_chance ?? false,
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
