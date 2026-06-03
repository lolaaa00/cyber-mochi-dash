# Cyber Mochi Dash

An endless runner where a GenLayer Intelligent Contract uses AI consensus to judge whether a collision was fair. If unfair, Mochi gets a second chance — AI consensus is the core game mechanic.

## Live App

https://cyber-mochi-dash.vercel.app/

## X Post

https://x.com/Lolyy_001/status/2041160095359262835

## How It Works

1. Mochi collides with an obstacle
2. The game calls `judge_collision(score, speed, realm)` on the Intelligent Contract
3. AI validators reach consensus using `gl.eq_principle_strict_eq()` and `gl.exec_prompt()`
4. The judge evaluates speed, score, and realm difficulty at the moment of crash
5. **UNFAIR crash** (high speed, high score, hard realm) — Mochi gets a second chance with a temporary shield
6. **FAIR crash** (low score, easy realm) — game over
7. Every judgment is an on-chain transaction with a real tx hash

## Intelligent Contract

**Contract:** `MochiDashJudge` ([`mochi_dash_judge.py`](./mochi_dash_judge.py))
**Address:** `0x669fe79C4185609B701E9AF5FfEaAE927d6A871B`
**Network:** GenLayer Studionet
**SDK:** genlayer-js 1.1.7

### Methods

| Method | Type | Description |
|---|---|---|
| `judge_collision(score, speed, realm)` | write | AI judges if a crash was fair or unfair |
| `get_stats()` | view | Returns `total_judgments` and `second_chances` |

### Contract State

```python
total_judgments: u64   # how many collisions the AI has judged
second_chances: u64    # how many times the AI granted a second chance
```

### AI Judge Logic

The AI considers a crash **UNFAIR** when:
- Speed above 1.4 (game is extremely hard)
- Score above 1500 (player was clearly skilled)
- Realm is VOID SPACE or LAVA CORE (extreme difficulty environments)

A crash is **FAIR** when:
- Speed is low or medium
- Score is low
- Realm is NEON CITY or CYBER OCEAN

## Game Features

- 4 realms that unlock as your score increases (Neon City, Cyber Ocean, Void Space, Lava Core)
- Coins, gems, and power-ups (magnet, shield, speed boost)
- Persistent game wallet for tracking all your AI judgments on the GenLayer explorer
- MetaMask wallet connect for player identity
- Firebase leaderboard
- GenVM verdict card showing the AI's reason and a link to the transaction

## Tech Stack

- React + TypeScript + Vite
- GenLayer Intelligent Contract (Python)
- genlayer-js 1.1.7
- Firebase Realtime Database (leaderboard)
- Tailwind CSS
- Canvas-based 3D rendering

## Run Locally

```bash
npm install
npm run dev
```

## Controls

- **Arrow keys / WASD** — move between lanes
- **Space / Up** — jump
- **Swipe** — mobile controls
