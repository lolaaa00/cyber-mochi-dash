# Cyber Mochi Dash — AI-Judged Endless Runner on GenLayer

An endless runner where GenLayer's Intelligent Contract uses AI consensus to judge if a collision was fair or unfair. If unfair, Mochi gets a second chance — making AI consensus the core game mechanic.

## Demo Video

https://youtu.be/yJqzWqcj_UM

## Live App

https://cyber-mochi-dash.vercel.app/

## How GenLayer powers the core mechanic

1. Mochi collides with an obstacle
2. The frontend calls `judge_collision()` on the deployed Intelligent Contract
3. 5 AI validators reach consensus using `gl.eq_principle_strict_eq()` and `gl.exec_prompt()`
4. The AI judge evaluates speed, score, and realm difficulty at the moment of crash
5. If the crash was UNFAIR — Mochi gets a second chance and keeps playing
6. If the crash was FAIR — game over
7. The real transaction hash is returned and logged for every judgment

AI consensus decides if the player lives or dies. That is the core mechanic.

## GenLayer Integration

**Contract file:** `mochi_dash_judge.py`
**Contract address:** `0x681D6Ff474B6d16e7c0A17b721c03e47462D2F19`
**Network:** Bradbury Testnet
**SDK:** genlayer-js

## Tech Stack

- React + TypeScript + Vite
- GenLayer Intelligent Contract (Python)
- genlayer-js SDK
- Firebase (leaderboard)
- Tailwind CSS
- Deployed on Vercel

## Run locally

```bash
npm install
npm run dev
```

## Contract deployment

The Intelligent Contract is deployed on GenLayer Studio (Bradbury Testnet).
Source: `mochi_dash_judge.py`
