import { useEffect, useRef, useState, useCallback } from "react";
import mochiImg from "@/assets/mochi.png";
import mochiEatImg from "@/assets/mochi_eat.png";
import obstacle1Img from "@/assets/obstacle1.png";
import obstacle2Img from "@/assets/obstacle2.png";
import obstacle3Img from "@/assets/obstacle3.png";
import obstacle4Img from "@/assets/obstacle4.png";
import obstacle5Img from "@/assets/obstacle5.png";
import obstacle6Img from "@/assets/obstacle6.png";
import logoImg from "@/assets/logo.png";

// ─── Firebase Config ─────────────────────────────────────────────
const FIREBASE_URL = "https://cybermochi-4e86a-default-rtdb.firebaseio.com";

async function saveScore(username: string, score: number, coins: number, gems: number, realm: string) {
  try {
    await fetch(`${FIREBASE_URL}/scores.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, score, coins, gems, realm, timestamp: Date.now() }),
    });
  } catch (e) {
    console.error("Failed to save score:", e);
  }
}

async function saveProgress(username: string, totalCoins: number, totalGems: number, highScore: number, gamesPlayed: number) {
  try {
    const key = username.replace(/[.#$[\]]/g, "_");
    await fetch(`${FIREBASE_URL}/progress/${key}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, totalCoins, totalGems, highScore, gamesPlayed, updatedAt: Date.now() }),
    });
  } catch (e) {
    console.error("Failed to save progress:", e);
  }
}

interface LeaderboardEntry {
  username: string;
  score: number;
  coins: number;
  gems: number;
  realm: string;
}

async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(`${FIREBASE_URL}/scores.json`);
    const data = await res.json();
    if (!data) return [];
    const entries: LeaderboardEntry[] = Object.values(data);
    // Deduplicate: keep only the highest score per username
    const best = new Map<string, LeaderboardEntry>();
    for (const e of entries) {
      const existing = best.get(e.username);
      if (!existing || e.score > existing.score) best.set(e.username, e);
    }
    const unique = Array.from(best.values());
    unique.sort((a, b) => b.score - a.score);
    return unique.slice(0, 10);
  } catch {
    return [];
  }
}

async function fetchProgress(username: string) {
  try {
    const key = username.replace(/[.#$[\]]/g, "_");
    const res = await fetch(`${FIREBASE_URL}/progress/${key}.json`);
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Types ───────────────────────────────────────────────────────
interface Obstacle { lane: number; z: number; type: number; glitchOffset: number; floatPhase: number; }
interface Coin { lane: number; z: number; collected: boolean; floatPhase: number; isGem: boolean; }
interface PowerUp { lane: number; z: number; type: "magnet" | "shield" | "speed"; collected: boolean; floatPhase: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; }
interface TrailParticle { x: number; y: number; life: number; maxLife: number; }

type GameState = "menu" | "playing" | "gameover" | "leaderboard";

interface Realm {
  name: string;
  bgGradient: [string, string, string];
  bgImage: string;
  groundColor: string;
  laneColor: string;
  particleColor: string;
  obstacleGlow: string;
  scoreThreshold: number;
}

// ─── Constants ───────────────────────────────────────────────────
const LANE_COUNT = 3;
const LANE_WIDTH = 120;
const ROAD_WIDTH = LANE_COUNT * LANE_WIDTH;
const HORIZON_Y = 0.32;
const PLAYER_Z = 0;
const VIEW_DISTANCE = 120;
const SPAWN_DISTANCE = 100;
const OBSTACLE_MIN_GAP = 25;
const COIN_MIN_GAP = 12;
const OBSTACLE_TYPES = 6;

const REALMS: Realm[] = [
  { name: "NEON CITY", bgGradient: ["#0d0d1f", "#1a0a2e", "#0a1230"], bgImage: "/images/bg1.jpeg", groundColor: "#0d0d2b", laneColor: "#bca2ff", particleColor: "#00ffff", obstacleGlow: "#ff00ff", scoreThreshold: 0 },
  { name: "CYBER OCEAN", bgGradient: ["#001122", "#003355", "#001144"], bgImage: "/images/bg2.jpeg", groundColor: "#001a33", laneColor: "#00ccff", particleColor: "#00ffcc", obstacleGlow: "#00aaff", scoreThreshold: 500 },
  { name: "VOID SPACE", bgGradient: ["#0a0015", "#1a0030", "#050020"], bgImage: "/images/bg3.jpeg", groundColor: "#0a0018", laneColor: "#cc66ff", particleColor: "#ff66cc", obstacleGlow: "#aa00ff", scoreThreshold: 1200 },
  { name: "LAVA CORE", bgGradient: ["#1a0500", "#2d0a00", "#1a0800"], bgImage: "/images/bg1.jpeg", groundColor: "#1a0500", laneColor: "#ff6600", particleColor: "#ff3300", obstacleGlow: "#ff4400", scoreThreshold: 2000 },
];

const POWER_UP_COLORS = { magnet: "#ffcc00", shield: "#00ccff", speed: "#ff3366" };
const POWER_UP_ICONS = { magnet: "M", shield: "S", speed: "⚡" };
const DEFAULT_DIFFICULTY = { speedMult: 1.0, obstacleGap: 25 };

const EndlessRunner = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>("menu");
  const [gameState, setGameState] = useState<GameState>("menu");
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [gems, setGems] = useState(0);
  const [currentRealm, setCurrentRealm] = useState("NEON CITY");
  const [activePowerUp, setActivePowerUp] = useState<string | null>(null);
  const [username, setUsername] = useState(() => localStorage.getItem("cyberMochiUsername") || "");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [totalGamesPlayed, setTotalGamesPlayed] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Game refs
  const playerLaneRef = useRef(1);
  const targetLaneRef = useRef(1);
  const playerXRef = useRef(0);
  const jumpRef = useRef(0);
  const jumpVelRef = useRef(0);
  const isJumpingRef = useRef(false);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const trailRef = useRef<TrailParticle[]>([]);
  const scoreRef = useRef(0);
  const coinsCountRef = useRef(0);
  const gemsCountRef = useRef(0);
  const speedRef = useRef(0.4);
  const distanceRef = useRef(0);
  const frameRef = useRef(0);
  const lastObstacleZRef = useRef(SPAWN_DISTANCE);
  const lastCoinZRef = useRef(30);
  const lastPowerUpZRef = useRef(60);
  const realmIndexRef = useRef(0);
  const realmTransitionRef = useRef(0);
  const hitReactionRef = useRef(0);
  const collectReactionRef = useRef(0);
  const bobPhaseRef = useRef(0);
  const animFrameRef = useRef(0);
  const imagesRef = useRef<{ [key: string]: HTMLImageElement }>({});
  const bgImagesRef = useRef<{ [key: string]: HTMLImageElement }>({});
  const imagesLoadedRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const magnetActiveRef = useRef(0);
  const shieldActiveRef = useRef(0);
  const speedBoostActiveRef = useRef(0);
  const difficultyRef = useRef(DEFAULT_DIFFICULTY);

  // Load saved progress
  useEffect(() => {
    if (username) {
      localStorage.setItem("cyberMochiUsername", username);
      fetchProgress(username).then((p) => {
        if (p) {
          setHighScore(p.highScore || 0);
          setTotalGamesPlayed(p.gamesPlayed || 0);
        }
      });
    }
  }, [username]);


  // Image loading
  useEffect(() => {
    const srcs: Record<string, string> = { mochi: mochiImg, mochiEat: mochiEatImg, obs1: obstacle1Img, obs2: obstacle2Img, obs3: obstacle3Img, obs4: obstacle4Img, obs5: obstacle5Img, obs6: obstacle6Img, logo: logoImg };
    let loaded = 0;
    const total = Object.keys(srcs).length;
    Object.entries(srcs).forEach(([key, src]) => {
      const img = new Image();
      img.onload = () => { loaded++; if (loaded === total) imagesLoadedRef.current = true; };
      img.src = src;
      imagesRef.current[key] = img;
    });
    REALMS.forEach((realm, i) => {
      const img = new Image();
      img.src = realm.bgImage;
      bgImagesRef.current[`bg${i}`] = img;
    });
  }, []);

  // Audio
  useEffect(() => {
    const audio = new Audio("/audio/luz_roja.mp3");
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ""; };
  }, []);

  // 3D Projection
  const project = useCallback((laneX: number, z: number, canvasW: number, canvasH: number) => {
    const perspective = 200;
    const relZ = Math.max(z - PLAYER_Z, 0.1);
    const scale = perspective / (perspective + relZ);
    const horizonPx = canvasH * HORIZON_Y;
    const groundH = canvasH - horizonPx;
    const y = horizonPx + groundH * (1 - scale);
    const cx = canvasW / 2;
    const x = cx + laneX * scale;
    return { x, y, scale };
  }, []);

  // Spawn logic
  const spawnObstacles = useCallback(() => {
    const gap = difficultyRef.current.obstacleGap;
    const z = lastObstacleZRef.current + gap + Math.random() * 20;
    const lane = Math.floor(Math.random() * LANE_COUNT);
    obstaclesRef.current.push({ lane, z, type: Math.floor(Math.random() * OBSTACLE_TYPES), glitchOffset: 0, floatPhase: Math.random() * Math.PI * 2 });
    lastObstacleZRef.current = z;
  }, []);

  const spawnCoins = useCallback(() => {
    const z = lastCoinZRef.current + COIN_MIN_GAP + Math.random() * 8;
    const lane = Math.floor(Math.random() * LANE_COUNT);
    coinsRef.current.push({ lane, z, collected: false, floatPhase: Math.random() * Math.PI * 2, isGem: Math.random() < 0.12 });
    lastCoinZRef.current = z;
  }, []);

  const spawnPowerUps = useCallback(() => {
    const z = lastPowerUpZRef.current + 80 + Math.random() * 60;
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const types: Array<"magnet" | "shield" | "speed"> = ["magnet", "shield", "speed"];
    powerUpsRef.current.push({ lane, z, type: types[Math.floor(Math.random() * types.length)], collected: false, floatPhase: Math.random() * Math.PI * 2 });
    lastPowerUpZRef.current = z;
  }, []);

  const addParticles = useCallback((x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6 - 2, life: 1, maxLife: 0.4 + Math.random() * 0.4, color, size: 2 + Math.random() * 4 });
    }
  }, []);

  // Start game
  const startGame = useCallback(() => {
    if (!username.trim()) return;
    playerLaneRef.current = 1; targetLaneRef.current = 1; playerXRef.current = 0;
    jumpRef.current = 0; jumpVelRef.current = 0; isJumpingRef.current = false;
    obstaclesRef.current = []; coinsRef.current = []; powerUpsRef.current = [];
    particlesRef.current = []; trailRef.current = [];
    scoreRef.current = 0; coinsCountRef.current = 0; gemsCountRef.current = 0;
    speedRef.current = 0.4 * difficultyRef.current.speedMult;
    distanceRef.current = 0;
    lastObstacleZRef.current = SPAWN_DISTANCE; lastCoinZRef.current = 30; lastPowerUpZRef.current = 60;
    realmIndexRef.current = 0; realmTransitionRef.current = 0;
    hitReactionRef.current = 0; collectReactionRef.current = 0; bobPhaseRef.current = 0;
    magnetActiveRef.current = 0; shieldActiveRef.current = 0; speedBoostActiveRef.current = 0;
    setScore(0); setCoins(0); setGems(0); setCurrentRealm("NEON CITY"); setActivePowerUp(null);
    gameStateRef.current = "playing"; setGameState("playing");
    for (let i = 0; i < 5; i++) spawnObstacles();
    for (let i = 0; i < 8; i++) spawnCoins();
    spawnPowerUps();
    audioRef.current?.play().catch(() => {});
  }, [username, spawnObstacles, spawnCoins, spawnPowerUps]);

  // Game over handler
  const handleGameOver = useCallback(() => {
    const finalScore = Math.floor(scoreRef.current);
    const finalCoins = coinsCountRef.current;
    const finalGems = gemsCountRef.current;
    const realm = REALMS[realmIndexRef.current]?.name || "NEON CITY";
    
    setScore(finalScore);
    audioRef.current?.pause();
    
    // Save to Firebase
    if (username.trim()) {
      saveScore(username, finalScore, finalCoins, finalGems, realm);
      const newHigh = Math.max(highScore, finalScore);
      const newGames = totalGamesPlayed + 1;
      setHighScore(newHigh);
      setTotalGamesPlayed(newGames);
      
      fetchProgress(username).then((p) => {
        const totalCoins = (p?.totalCoins || 0) + finalCoins;
        const totalGemsAll = (p?.totalGems || 0) + finalGems;
        saveProgress(username, totalCoins, totalGemsAll, newHigh, newGames);
      });
    }
  }, [username, highScore, totalGamesPlayed]);

  // Show leaderboard
  const showLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    gameStateRef.current = "leaderboard";
    setGameState("leaderboard");
    const lb = await fetchLeaderboard();
    setLeaderboard(lb);
    setLeaderboardLoading(false);
  }, []);

  // Input handling
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameStateRef.current !== "playing") {
        if (e.key === "Enter" && gameStateRef.current === "menu") { e.preventDefault(); startGame(); }
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") targetLaneRef.current = Math.max(0, targetLaneRef.current - 1);
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") targetLaneRef.current = Math.min(2, targetLaneRef.current + 1);
      else if ((e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === " ") && !isJumpingRef.current) {
        e.preventDefault(); isJumpingRef.current = true; jumpVelRef.current = -12;
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (gameStateRef.current !== "playing") return;
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || gameStateRef.current !== "playing") return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) targetLaneRef.current = Math.min(2, targetLaneRef.current + 1);
          else targetLaneRef.current = Math.max(0, targetLaneRef.current - 1);
        } else if (dy < 0 && !isJumpingRef.current) {
          isJumpingRef.current = true; jumpVelRef.current = -12;
        }
      }
      touchStartRef.current = null;
    };

    window.addEventListener("keydown", handleKey);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [startGame]);

  // ─── Game Loop (canvas rendering for gameplay only) ────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const laneToX = (lane: number) => (lane - 1) * LANE_WIDTH;

    const drawBackground = (ctx: CanvasRenderingContext2D, W: number, H: number, realm: Realm, realmIdx: number) => {
      const bgImg = bgImagesRef.current[`bg${realmIdx}`];
      if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
        ctx.globalAlpha = 0.45;
        const skyH = H * HORIZON_Y + 40;
        const imgAspect = bgImg.naturalWidth / bgImg.naturalHeight;
        const drawW = Math.max(W, skyH * imgAspect);
        const drawH = drawW / imgAspect;
        const scrollX = (frameRef.current * 0.2) % drawW;
        ctx.drawImage(bgImg, -scrollX, 0, drawW, drawH);
        ctx.drawImage(bgImg, -scrollX + drawW, 0, drawW, drawH);
        ctx.globalAlpha = 1;
      }
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, realm.bgGradient[0] + "88");
      bgGrad.addColorStop(0.4, realm.bgGradient[1] + "cc");
      bgGrad.addColorStop(1, realm.bgGradient[2]);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);
    };

    const loop = () => {
      animFrameRef.current = requestAnimationFrame(loop);
      const W = canvas.width; const H = canvas.height; const dt = 1 / 60;
      frameRef.current++;
      const realm = REALMS[realmIndexRef.current] || REALMS[0];

      // Background
      ctx.fillStyle = realm.bgGradient[0];
      ctx.fillRect(0, 0, W, H);
      drawBackground(ctx, W, H, realm, realmIndexRef.current);

      // Stars
      ctx.fillStyle = realm.particleColor;
      for (let i = 0; i < 60; i++) {
        const sx = (i * 137.5 + frameRef.current * 0.1) % W;
        const sy = (i * 97.3 + frameRef.current * 0.05 * (i % 3 + 1)) % (H * HORIZON_Y);
        ctx.globalAlpha = 0.3 + 0.3 * Math.sin(frameRef.current * 0.02 + i);
        ctx.fillRect(sx, sy, 1 + (i % 3), 1 + (i % 3));
      }
      ctx.globalAlpha = 1;

      // Ground road
      const horizonPx = H * HORIZON_Y;
      const roadGrad = ctx.createLinearGradient(0, horizonPx, 0, H);
      roadGrad.addColorStop(0, realm.groundColor);
      roadGrad.addColorStop(1, realm.bgGradient[2]);
      const vanishX = W / 2;
      const roadBottomHalf = ROAD_WIDTH * 1.5;
      ctx.fillStyle = roadGrad;
      ctx.beginPath();
      ctx.moveTo(vanishX - 10, horizonPx); ctx.lineTo(vanishX + 10, horizonPx);
      ctx.lineTo(W / 2 + roadBottomHalf, H); ctx.lineTo(W / 2 - roadBottomHalf, H);
      ctx.closePath(); ctx.fill();

      // Lane lines
      for (let l = -1; l <= 1; l++) {
        const lx = l * LANE_WIDTH;
        const topP = project(lx, VIEW_DISTANCE, W, H);
        const botP = project(lx, 1, W, H);
        ctx.strokeStyle = realm.laneColor; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.moveTo(topP.x, topP.y); ctx.lineTo(botP.x, botP.y); ctx.stroke();
      }
      for (const side of [-1.5, 1.5]) {
        const lx = side * LANE_WIDTH;
        const topP = project(lx, VIEW_DISTANCE, W, H);
        const botP = project(lx, 1, W, H);
        ctx.strokeStyle = realm.laneColor; ctx.lineWidth = 2; ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.moveTo(topP.x, topP.y); ctx.lineTo(botP.x, botP.y); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Scrolling ground lines
      for (let i = 0; i < 20; i++) {
        const rawZ = ((i * 8 - (distanceRef.current * 8) % 8 + 200) % 160);
        if (rawZ < 2 || rawZ > VIEW_DISTANCE) continue;
        const leftP = project(-1.5 * LANE_WIDTH, rawZ, W, H);
        const rightP = project(1.5 * LANE_WIDTH, rawZ, W, H);
        ctx.strokeStyle = realm.laneColor; ctx.globalAlpha = 0.15 * (1 - rawZ / VIEW_DISTANCE); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(leftP.x, leftP.y); ctx.lineTo(rightP.x, rightP.y); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      if (gameStateRef.current !== "playing") return;

      // Game logic update
      const spdMult = speedBoostActiveRef.current > 0 ? 1.6 : 1;
      distanceRef.current += speedRef.current * spdMult;
      scoreRef.current += speedRef.current * 2 * spdMult;
      speedRef.current = Math.min(1.8, (0.4 * difficultyRef.current.speedMult) + distanceRef.current * 0.0003);
      bobPhaseRef.current += 0.15;

      if (magnetActiveRef.current > 0) magnetActiveRef.current -= dt;
      if (shieldActiveRef.current > 0) shieldActiveRef.current -= dt;
      if (speedBoostActiveRef.current > 0) speedBoostActiveRef.current -= dt;
      if (magnetActiveRef.current > 0) setActivePowerUp("magnet");
      else if (shieldActiveRef.current > 0) setActivePowerUp("shield");
      else if (speedBoostActiveRef.current > 0) setActivePowerUp("speed");
      else setActivePowerUp(null);

      // Realm progression
      for (let i = REALMS.length - 1; i >= 0; i--) {
        if (scoreRef.current >= REALMS[i].scoreThreshold) {
          if (realmIndexRef.current !== i) { realmIndexRef.current = i; realmTransitionRef.current = 1; setCurrentRealm(REALMS[i].name); }
          break;
        }
      }
      if (realmTransitionRef.current > 0) realmTransitionRef.current -= 0.01;

      // Player movement
      const targetX = laneToX(targetLaneRef.current);
      playerXRef.current += (targetX - playerXRef.current) * 0.18;
      playerLaneRef.current = targetLaneRef.current;

      // Jump
      if (isJumpingRef.current) {
        jumpVelRef.current += 0.6; jumpRef.current += jumpVelRef.current;
        if (jumpRef.current >= 0) { jumpRef.current = 0; jumpVelRef.current = 0; isJumpingRef.current = false; }
      }
      if (hitReactionRef.current > 0) hitReactionRef.current -= dt;
      if (collectReactionRef.current > 0) collectReactionRef.current -= dt;

      // Spawn
      while (lastObstacleZRef.current < distanceRef.current + SPAWN_DISTANCE) spawnObstacles();
      while (lastCoinZRef.current < distanceRef.current + SPAWN_DISTANCE) spawnCoins();
      while (lastPowerUpZRef.current < distanceRef.current + SPAWN_DISTANCE) spawnPowerUps();

      // Draw coins
      coinsRef.current = coinsRef.current.filter(c => c.z - distanceRef.current > -5);
      for (const coin of coinsRef.current) {
        const relZ = coin.z - distanceRef.current;
        if (relZ < 0 || relZ > VIEW_DISTANCE) continue;
        const cx = laneToX(coin.lane);
        const p = project(cx, relZ, W, H);
        const sz = p.scale * (coin.isGem ? 28 : 20);
        const floatY = Math.sin(frameRef.current * 0.05 + coin.floatPhase) * 5 * p.scale;
        if (!coin.collected) {
          const magnetRange = magnetActiveRef.current > 0 ? 2 : 0;
          const laneDiff = Math.abs(coin.lane - targetLaneRef.current);
          const inRange = Math.abs(relZ - 2) < (magnetRange > 0 ? 8 : 3);
          const laneMatch = magnetRange > 0 ? laneDiff <= magnetRange : coin.lane === targetLaneRef.current;
          if (inRange && laneMatch && jumpRef.current > -60) {
            coin.collected = true;
            if (coin.isGem) { gemsCountRef.current++; setGems(gemsCountRef.current); addParticles(p.x, p.y - floatY, "#ff66cc", 15); }
            else { coinsCountRef.current++; setCoins(coinsCountRef.current); addParticles(p.x, p.y - floatY, "#ffcc00", 10); }
            collectReactionRef.current = 0.3; continue;
          }
          if (coin.isGem) {
            ctx.save(); ctx.shadowColor = "#ff66cc"; ctx.shadowBlur = 15 * p.scale; ctx.fillStyle = "#ff66cc";
            ctx.beginPath(); ctx.moveTo(p.x, p.y - floatY - sz); ctx.lineTo(p.x + sz * 0.6, p.y - floatY);
            ctx.lineTo(p.x, p.y - floatY + sz * 0.5); ctx.lineTo(p.x - sz * 0.6, p.y - floatY);
            ctx.closePath(); ctx.fill(); ctx.restore();
          } else {
            ctx.save(); ctx.shadowColor = "#ffcc00"; ctx.shadowBlur = 10 * p.scale; ctx.fillStyle = "#ffcc00";
            ctx.beginPath(); ctx.arc(p.x, p.y - floatY - sz / 2, sz / 2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#ffa500"; ctx.beginPath(); ctx.arc(p.x, p.y - floatY - sz / 2, sz / 3, 0, Math.PI * 2);
            ctx.fill(); ctx.restore();
          }
        }
      }

      // Draw power-ups
      powerUpsRef.current = powerUpsRef.current.filter(pu => pu.z - distanceRef.current > -5);
      for (const pu of powerUpsRef.current) {
        const relZ = pu.z - distanceRef.current;
        if (relZ < 0 || relZ > VIEW_DISTANCE || pu.collected) continue;
        const px = laneToX(pu.lane);
        const p = project(px, relZ, W, H);
        const sz = p.scale * 32;
        const floatY = Math.sin(frameRef.current * 0.06 + pu.floatPhase) * 6 * p.scale;
        const color = POWER_UP_COLORS[pu.type];
        if (Math.abs(relZ - 2) < 3 && pu.lane === targetLaneRef.current && jumpRef.current > -60) {
          pu.collected = true;
          if (pu.type === "magnet") magnetActiveRef.current = 8;
          else if (pu.type === "shield") shieldActiveRef.current = 10;
          else if (pu.type === "speed") speedBoostActiveRef.current = 5;
          addParticles(p.x, p.y - floatY, color, 20); continue;
        }
        ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 20 * p.scale; ctx.fillStyle = color;
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(frameRef.current * 0.1);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const hx = p.x + sz * Math.cos(angle); const hy = p.y - floatY - sz + sz * Math.sin(angle);
          if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
        }
        ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
        ctx.fillStyle = "#000"; ctx.font = `bold ${sz}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(POWER_UP_ICONS[pu.type], p.x, p.y - floatY - sz); ctx.restore();
      }

      // Draw obstacles
      obstaclesRef.current = obstaclesRef.current.filter(o => o.z - distanceRef.current > -5);
      for (const obs of obstaclesRef.current) {
        const relZ = obs.z - distanceRef.current;
        if (relZ < 0 || relZ > VIEW_DISTANCE) continue;
        const ox = laneToX(obs.lane);
        const p = project(ox, relZ, W, H);
        const sz = p.scale * 80;
        obs.glitchOffset = Math.sin(frameRef.current * 0.1 + obs.floatPhase) * 2 * p.scale;
        const floatY = Math.sin(frameRef.current * 0.04 + obs.floatPhase) * 4 * p.scale;
        const imgKey = `obs${obs.type + 1}`;
        const img = imagesRef.current[imgKey];
        if (img && img.complete) {
          ctx.save(); ctx.shadowColor = realm.obstacleGlow; ctx.shadowBlur = 20 * p.scale;
          ctx.drawImage(img, p.x - sz / 2 + obs.glitchOffset, p.y - sz - floatY, sz, sz);
          ctx.strokeStyle = realm.obstacleGlow; ctx.lineWidth = 2 * p.scale;
          ctx.globalAlpha = 0.6 + 0.3 * Math.sin(frameRef.current * 0.08);
          ctx.strokeRect(p.x - sz / 2 + obs.glitchOffset - 2, p.y - sz - floatY - 2, sz + 4, sz + 4);
          ctx.globalAlpha = 1; ctx.restore();
        }
        if (Math.abs(relZ - 2) < 2.5 && obs.lane === targetLaneRef.current && jumpRef.current > -40) {
          if (shieldActiveRef.current > 0) {
            shieldActiveRef.current = 0; addParticles(p.x, p.y - sz / 2, "#00ccff", 30); obs.z = -100;
          } else {
            hitReactionRef.current = 0.5;
            gameStateRef.current = "gameover"; setGameState("gameover");
            handleGameOver();
            addParticles(p.x, p.y - sz / 2, "#ff0044", 25);
          }
        }
      }

      // Draw player
      const playerP = project(playerXRef.current, 2, W, H);
      const playerSize = playerP.scale * 140;
      const bob = Math.sin(bobPhaseRef.current) * 4;
      const squash = isJumpingRef.current && jumpVelRef.current > 0 ? 1.15 : isJumpingRef.current ? 0.9 : 1 + Math.sin(bobPhaseRef.current * 2) * 0.03;
      const stretch = 2 - squash;
      const collectBounce = collectReactionRef.current > 0 ? -8 : 0;

      // Trail
      if (frameRef.current % 2 === 0) trailRef.current.push({ x: playerP.x, y: playerP.y + jumpRef.current + bob, life: 1, maxLife: 0.5 });
      trailRef.current = trailRef.current.filter(t => { t.life -= 0.03; return t.life > 0; });
      for (const t of trailRef.current) {
        ctx.globalAlpha = t.life * 0.3; ctx.fillStyle = realm.laneColor;
        ctx.beginPath(); ctx.arc(t.x, t.y, 5 * t.life, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Shield glow
      if (shieldActiveRef.current > 0) {
        ctx.save(); ctx.strokeStyle = "#00ccff"; ctx.shadowColor = "#00ccff"; ctx.shadowBlur = 25; ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(frameRef.current * 0.1);
        ctx.beginPath(); ctx.arc(playerP.x, playerP.y + jumpRef.current + bob - playerSize / 2, playerSize * 0.55, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      // Magnet aura
      if (magnetActiveRef.current > 0) {
        ctx.save(); ctx.strokeStyle = "#ffcc00"; ctx.shadowColor = "#ffcc00"; ctx.shadowBlur = 15; ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3 + 0.2 * Math.sin(frameRef.current * 0.15);
        ctx.beginPath(); ctx.arc(playerP.x, playerP.y + jumpRef.current + bob - playerSize / 2, playerSize * 0.7, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }

      const mochiImage = collectReactionRef.current > 0 ? imagesRef.current.mochiEat : imagesRef.current.mochi;
      if (mochiImage && mochiImage.complete) {
        ctx.save(); ctx.shadowColor = "#bca2ff"; ctx.shadowBlur = 25;
        ctx.translate(playerP.x, playerP.y + jumpRef.current + bob + collectBounce);
        ctx.scale(squash, stretch);
        ctx.drawImage(mochiImage, -playerSize / 2, -playerSize, playerSize, playerSize); ctx.restore();
      }

      // Speed lines
      if (speedBoostActiveRef.current > 0) {
        ctx.save(); ctx.strokeStyle = "#ff3366"; ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const ly = playerP.y + jumpRef.current - playerSize * 0.2 + i * 12;
          const lx = playerP.x - playerSize * 0.8 - Math.random() * 20;
          ctx.globalAlpha = 0.4 + Math.random() * 0.3;
          ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx - 30 - Math.random() * 20, ly); ctx.stroke();
        }
        ctx.restore();
      }

      // Particles
      particlesRef.current = particlesRef.current.filter(p => { p.life -= 1 / (60 * p.maxLife); p.x += p.vx; p.y += p.vy; p.vy += 0.1; return p.life > 0; });
      for (const p of particlesRef.current) {
        ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Realm transition flash
      if (realmTransitionRef.current > 0) {
        ctx.globalAlpha = realmTransitionRef.current * 0.4; ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      }

      if (frameRef.current % 10 === 0) setScore(Math.floor(scoreRef.current));
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animFrameRef.current); window.removeEventListener("resize", resize); };
  }, [project, spawnObstacles, spawnCoins, spawnPowerUps, addParticles, handleGameOver]);

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* HUD (playing) */}
      {gameState === "playing" && (
        <div className="fixed top-0 left-0 right-0 p-3 md:p-5 flex justify-between items-start pointer-events-none z-10">
          <div className="flex flex-col gap-1">
            <div className="font-display text-xl md:text-3xl text-foreground text-glow-primary">{score}</div>
            <div className="font-body text-xs md:text-sm text-secondary uppercase tracking-widest">{currentRealm}</div>
          </div>
          <div className="flex gap-3 md:gap-5 items-center">
            {activePowerUp && (
              <div className="px-2 py-0.5 rounded-full text-xs font-display uppercase tracking-wider animate-pulse-glow"
                style={{ backgroundColor: POWER_UP_COLORS[activePowerUp as keyof typeof POWER_UP_COLORS] + "33", color: POWER_UP_COLORS[activePowerUp as keyof typeof POWER_UP_COLORS], border: `1px solid ${POWER_UP_COLORS[activePowerUp as keyof typeof POWER_UP_COLORS]}` }}>
                {activePowerUp}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-[hsl(45,100%,50%)] shadow-[0_0_8px_hsl(45,100%,50%)]" />
              <span className="font-display text-sm md:text-base text-foreground">{coins}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 md:w-4 md:h-4 bg-neon-pink rotate-45 shadow-[0_0_8px_hsl(320,100%,60%)]" />
              <span className="font-display text-sm md:text-base text-foreground">{gems}</span>
            </div>
          </div>
        </div>
      )}

      {/* MENU OVERLAY */}
      {gameState === "menu" && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center"
          style={{ background: "linear-gradient(180deg, rgba(13,13,31,0.92) 0%, rgba(10,10,26,0.97) 100%)" }}>
          {/* Scanlines */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 3px)" }} />
          
          {/* Title */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-center leading-tight tracking-wider mb-1"
            style={{ background: "linear-gradient(135deg, #7c5cff 0%, #bca2ff 30%, #00ffff 60%, #ff66cc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 30px rgba(124,92,255,0.5))" }}>
            CYBER<br/>MOCHI<br/>DASH
          </h1>
          <p className="font-body text-xs sm:text-sm text-accent uppercase tracking-[0.3em] mb-6 md:mb-8 opacity-80">
            Powered by GenLayer
          </p>

          {/* Mochi character */}
          <div className="relative mb-6 md:mb-8">
            <div className="absolute inset-0 rounded-2xl opacity-30" style={{ boxShadow: "0 0 40px #bca2ff, 0 0 80px #7c5cff" }} />
            <img src={mochiImg} alt="Mochi" className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 object-contain animate-float drop-shadow-[0_0_20px_rgba(188,162,255,0.6)]" />
          </div>

          {/* Username */}
          <div className="w-72 sm:w-80 md:w-96 mb-4">
            <label className="font-display text-xs sm:text-sm text-neon-pink uppercase tracking-wider mb-2 block">Your Username</label>
            <input
              type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name..."
              className="w-full px-4 py-3 rounded-lg font-body text-sm md:text-base text-foreground placeholder:text-muted-foreground outline-none transition-all focus:shadow-[0_0_20px_rgba(0,255,255,0.3)]"
              style={{ background: "rgba(13,13,31,0.8)", border: "1.5px solid hsl(180,100%,50%)" }}
              onKeyDown={(e) => { if (e.key === "Enter") startGame(); }}
            />
          </div>

          {/* Difficulty */}
          <div className="w-72 sm:w-80 md:w-96 mb-6">
            <label className="font-display text-xs sm:text-sm text-accent uppercase tracking-wider mb-2 block">Difficulty</label>
            <div className="flex gap-2">
              {(["Easy", "Medium", "Hard"] as const).map((d) => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`flex-1 py-2.5 rounded-lg font-display text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 ${difficulty === d ? "text-background" : "text-muted-foreground hover:text-foreground"}`}
                  style={{
                    background: difficulty === d ? "linear-gradient(135deg, #bca2ff, #7c5cff)" : "transparent",
                    border: difficulty === d ? "1.5px solid #bca2ff" : "1.5px solid rgba(188,162,255,0.25)",
                    boxShadow: difficulty === d ? "0 0 15px rgba(188,162,255,0.4)" : "none",
                  }}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* High Score */}
          {highScore > 0 && (
            <p className="font-body text-xs text-muted-foreground mb-3">
              🏆 Best: <span className="text-accent font-display">{highScore}</span> · Games: <span className="text-secondary font-display">{totalGamesPlayed}</span>
            </p>
          )}

          {/* Launch Button */}
          <button onClick={startGame} disabled={!username.trim()}
            className="w-72 sm:w-80 md:w-96 py-4 rounded-xl font-display text-sm sm:text-base md:text-lg uppercase tracking-widest text-foreground transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed mb-3"
            style={{ background: "linear-gradient(135deg, #ff3366 0%, #ff66b2 50%, #cc33ff 100%)", boxShadow: "0 0 30px rgba(255,51,102,0.4), 0 8px 32px rgba(0,0,0,0.4)" }}>
            🚀 Launch Game
          </button>

          {/* Leaderboard Button */}
          <button onClick={showLeaderboard}
            className="w-72 sm:w-80 md:w-96 py-3 rounded-xl font-display text-xs sm:text-sm uppercase tracking-widest text-accent transition-all hover:scale-[1.02] active:scale-[0.97]"
            style={{ background: "transparent", border: "1.5px solid hsl(180,100%,50%)", boxShadow: "0 0 15px rgba(0,255,255,0.15)" }}>
            🏆 Leaderboard
          </button>

          {/* Controls hint */}
          <p className="font-body text-[10px] sm:text-xs text-muted-foreground mt-6 text-center max-w-xs md:max-w-md leading-relaxed">
            Arrow keys / WASD to move · Space / Up to jump · Swipe on mobile
          </p>
        </div>
      )}

      {/* GAME OVER OVERLAY */}
      {gameState === "gameover" && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center"
          style={{ background: "linear-gradient(180deg, rgba(13,13,31,0.94) 0%, rgba(10,10,26,0.98) 100%)" }}>
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 3px)" }} />

          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-wider mb-2"
            style={{ background: "linear-gradient(135deg, #ff3366, #ff66b2, #cc33ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 20px rgba(255,51,102,0.5))" }}>
            Game Over
          </h2>

          <div className="font-display text-5xl sm:text-6xl md:text-7xl text-foreground mb-1" style={{ textShadow: "0 0 30px rgba(188,162,255,0.6)" }}>
            {score}
          </div>
          <p className="font-body text-sm text-muted-foreground uppercase tracking-wider mb-6">Score</p>

          <div className="flex gap-8 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[hsl(45,100%,50%)] shadow-[0_0_10px_hsl(45,100%,50%)]" />
              <span className="font-display text-lg text-foreground">{coins}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-neon-pink rotate-45 shadow-[0_0_10px_hsl(320,100%,60%)]" />
              <span className="font-display text-lg text-foreground">{gems}</span>
            </div>
          </div>

          {highScore > 0 && (
            <p className="font-body text-xs text-muted-foreground mb-6">
              🏆 Best: <span className="text-accent font-display">{highScore}</span>
            </p>
          )}

          <button onClick={startGame}
            className="w-72 sm:w-80 md:w-96 py-4 rounded-xl font-display text-sm sm:text-base md:text-lg uppercase tracking-widest text-foreground transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] mb-3"
            style={{ background: "linear-gradient(135deg, #ff3366 0%, #ff66b2 50%, #cc33ff 100%)", boxShadow: "0 0 30px rgba(255,51,102,0.4), 0 8px 32px rgba(0,0,0,0.4)" }}>
            🔄 Play Again
          </button>

          <button onClick={showLeaderboard}
            className="w-72 sm:w-80 md:w-96 py-3 rounded-xl font-display text-xs sm:text-sm uppercase tracking-widest text-accent transition-all hover:scale-[1.02]"
            style={{ background: "transparent", border: "1.5px solid hsl(180,100%,50%)", boxShadow: "0 0 15px rgba(0,255,255,0.15)" }}>
            🏆 Leaderboard
          </button>

          <button onClick={() => { gameStateRef.current = "menu"; setGameState("menu"); }}
            className="mt-3 font-body text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
            Back to Menu
          </button>
        </div>
      )}

      {/* LEADERBOARD OVERLAY */}
      {gameState === "leaderboard" && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center p-4"
          style={{ background: "linear-gradient(180deg, rgba(13,13,31,0.96) 0%, rgba(10,10,26,0.99) 100%)" }}>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-wider mb-6"
            style={{ background: "linear-gradient(135deg, #00ffff, #bca2ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 20px rgba(0,255,255,0.4))" }}>
            🏆 Leaderboard
          </h2>

          <div className="w-full max-w-md max-h-[50vh] overflow-y-auto rounded-xl p-1" style={{ border: "1px solid rgba(0,255,255,0.2)" }}>
            {leaderboardLoading ? (
              <div className="text-center py-8 font-body text-muted-foreground animate-pulse">Loading...</div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-8 font-body text-muted-foreground">No scores yet. Be the first!</div>
            ) : (
              <div className="space-y-1">
                {leaderboard.map((entry, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
                    style={{ background: i < 3 ? `rgba(${i === 0 ? "255,204,0" : i === 1 ? "192,192,192" : "205,127,50"},0.08)` : "rgba(255,255,255,0.02)", borderLeft: i < 3 ? `3px solid ${i === 0 ? "#ffcc00" : i === 1 ? "#c0c0c0" : "#cd7f32"}` : "3px solid transparent" }}>
                    <span className="font-display text-lg w-8 text-center" style={{ color: i === 0 ? "#ffcc00" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "hsl(var(--muted-foreground))" }}>
                      {i === 0 ? "👑" : i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-sm text-foreground truncate">{entry.username}</div>
                      <div className="font-body text-xs text-muted-foreground">{entry.realm}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-base text-accent">{entry.score}</div>
                      <div className="font-body text-[10px] text-muted-foreground">🪙{entry.coins} 💎{entry.gems}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => { gameStateRef.current = "menu"; setGameState("menu"); }}
            className="mt-6 w-60 py-3 rounded-xl font-display text-sm uppercase tracking-widest transition-all hover:scale-[1.02]"
            style={{ background: "transparent", border: "1.5px solid rgba(188,162,255,0.4)", color: "hsl(var(--foreground))" }}>
            ← Back
          </button>
        </div>
      )}
    </div>
  );
};

export default EndlessRunner;
