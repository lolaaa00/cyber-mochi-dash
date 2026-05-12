# Cyber Mochi Dash — AI-Judged Endless Runner on GenLayer

An endless runner game where GenLayer's Intelligent Contract uses AI consensus to judge if a collision was fair or unfair. If unfair, Mochi gets a second chance — making AI consensus the core mechanic.

## Live App

https://cyber-mochi-dash.vercel.app/

## How GenLayer powers the core mechanic

1. Mochi collides with an obstacle
2. The frontend calls `judge_collision()` on the deployed Intelligent Contract
3. 5 AI validators reach consensus using `gl.eq_principle_strict_eq()` and `gl.exec_prompt()`
4. The AI judge evaluates speed, score, and realm difficulty
5. If the crash was UNFAIR, Mochi gets a second chance — directly affecting gameplay
6. The verdict and real transaction hash are displayed to the player

AI consensus is not decoration — it decides if the player lives or dies.

## GenLayer Integration

**Contract file:** `mochi_dash_judge.py`
**Contract address:** `0xYOUR_ADDRESS_HERE`
**Network:** Bradbury Testnet
**SDK:** genlayer-js

## Tech Stack

- React + TypeScript + Vite
- GenLayer Intelligent Contract (Python)
- genlayer-js SDK
- Firebase (leaderboard)
- Deployed on Vercel

## Run locally

```bash
npm install
npm run dev
```
