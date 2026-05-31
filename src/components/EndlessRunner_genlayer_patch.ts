// GenLayer integration: when Mochi collides with an obstacle (no shield active),
// the game pauses in a "judging" state and calls judgeCollision() on the contract.
// If the AI grants a second chance, the player resumes with a brief shield.
// If denied (or on error), the game transitions to "gameover".
// Contract: 0x669fe79C4185609B701E9AF5FfEaAE927d6A871B
// Network: Bradbury Testnet
