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

// ─── Types ───────────────────────────────────────────────────────
interface Obstacle {
  lane: number;
  z: number;
  type: number;
  glitchOffset: number;
  floatPhase: number;
}

interface Coin {
  lane: number;
  z: number;
  collected: boolean;
  floatPhase: number;
  isGem: boolean;
}

interface PowerUp {
  lane: number;
  z: number;
  type: "magnet" | "shield" | "speed";
  collected: boolean;
  floatPhase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface TrailParticle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

type GameState = "menu" | "playing" | "gameover";

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
  {
    name: "NEON CITY",
    bgGradient: ["#0a0a1a", "#1a0a2e", "#0a1a3e"],
    bgImage: "/images/bg1.jpeg",
    groundColor: "#0d0d2b",
    laneColor: "#bca2ff",
    particleColor: "#00ffff",
    obstacleGlow: "#ff00ff",
    scoreThreshold: 0,
  },
  {
    name: "CYBER OCEAN",
    bgGradient: ["#001122", "#003355", "#001144"],
    bgImage: "/images/bg2.jpeg",
    groundColor: "#001a33",
    laneColor: "#00ccff",
    particleColor: "#00ffcc",
    obstacleGlow: "#00aaff",
    scoreThreshold: 500,
  },
  {
    name: "VOID SPACE",
    bgGradient: ["#0a0015", "#1a0030", "#050020"],
    bgImage: "/images/bg3.jpeg",
    groundColor: "#0a0018",
    laneColor: "#cc66ff",
    particleColor: "#ff66cc",
    obstacleGlow: "#aa00ff",
    scoreThreshold: 1200,
  },
  {
    name: "LAVA CORE",
    bgGradient: ["#1a0500", "#2d0a00", "#1a0800"],
    bgImage: "/images/bg1.jpeg",
    groundColor: "#1a0500",
    laneColor: "#ff6600",
    particleColor: "#ff3300",
    obstacleGlow: "#ff4400",
    scoreThreshold: 2000,
  },
];

const POWER_UP_COLORS = {
  magnet: "#ffcc00",
  shield: "#00ccff",
  speed: "#ff3366",
};

const POWER_UP_ICONS = {
  magnet: "M",
  shield: "S",
  speed: "⚡",
};

const EndlessRunner = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>("menu");
  const [gameState, setGameState] = useState<GameState>("menu");
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [gems, setGems] = useState(0);
  const [currentRealm, setCurrentRealm] = useState("NEON CITY");
  const [activePowerUp, setActivePowerUp] = useState<string | null>(null);
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

  // Power-up state refs
  const magnetActiveRef = useRef(0);
  const shieldActiveRef = useRef(0);
  const speedBoostActiveRef = useRef(0);

  // ─── Image Loading ─────────────────────────────────────────────
  useEffect(() => {
    const srcs: Record<string, string> = {
      mochi: mochiImg,
      mochiEat: mochiEatImg,
      obs1: obstacle1Img,
      obs2: obstacle2Img,
      obs3: obstacle3Img,
      obs4: obstacle4Img,
      obs5: obstacle5Img,
      obs6: obstacle6Img,
      logo: logoImg,
    };
    let loaded = 0;
    const total = Object.keys(srcs).length;
    Object.entries(srcs).forEach(([key, src]) => {
      const img = new Image();
      img.onload = () => {
        loaded++;
        if (loaded === total) imagesLoadedRef.current = true;
      };
      img.src = src;
      imagesRef.current[key] = img;
    });

    // Load background images
    REALMS.forEach((realm, i) => {
      const img = new Image();
      img.src = realm.bgImage;
      bgImagesRef.current[`bg${i}`] = img;
    });
  }, []);

  // ─── Audio ─────────────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio("/audio/luz_roja.mp3");
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // ─── 3D Projection ────────────────────────────────────────────
  const project = useCallback(
    (laneX: number, z: number, canvasW: number, canvasH: number): { x: number; y: number; scale: number } => {
      const perspective = 200;
      const relZ = Math.max(z - PLAYER_Z, 0.1);
      const scale = perspective / (perspective + relZ);
      const horizonPx = canvasH * HORIZON_Y;
      const groundH = canvasH - horizonPx;
      const y = horizonPx + groundH * (1 - scale);
      const cx = canvasW / 2;
      const x = cx + laneX * scale;
      return { x, y, scale };
    },
    []
  );

  // ─── Spawn Logic ──────────────────────────────────────────────
  const spawnObstacles = useCallback(() => {
    const z = lastObstacleZRef.current + OBSTACLE_MIN_GAP + Math.random() * 20;
    const lane = Math.floor(Math.random() * LANE_COUNT);
    obstaclesRef.current.push({
      lane,
      z,
      type: Math.floor(Math.random() * OBSTACLE_TYPES),
      glitchOffset: 0,
      floatPhase: Math.random() * Math.PI * 2,
    });
    lastObstacleZRef.current = z;
  }, []);

  const spawnCoins = useCallback(() => {
    const z = lastCoinZRef.current + COIN_MIN_GAP + Math.random() * 8;
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const isGem = Math.random() < 0.12;
    coinsRef.current.push({
      lane,
      z,
      collected: false,
      floatPhase: Math.random() * Math.PI * 2,
      isGem,
    });
    lastCoinZRef.current = z;
  }, []);

  const spawnPowerUps = useCallback(() => {
    const z = lastPowerUpZRef.current + 80 + Math.random() * 60;
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const types: Array<"magnet" | "shield" | "speed"> = ["magnet", "shield", "speed"];
    powerUpsRef.current.push({
      lane,
      z,
      type: types[Math.floor(Math.random() * types.length)],
      collected: false,
      floatPhase: Math.random() * Math.PI * 2,
    });
    lastPowerUpZRef.current = z;
  }, []);

  const addParticles = useCallback(
    (x: number, y: number, color: string, count: number) => {
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6 - 2,
          life: 1,
          maxLife: 0.4 + Math.random() * 0.4,
          color,
          size: 2 + Math.random() * 4,
        });
      }
    },
    []
  );

  // ─── Start / Restart ──────────────────────────────────────────
  const startGame = useCallback(() => {
    playerLaneRef.current = 1;
    targetLaneRef.current = 1;
    playerXRef.current = 0;
    jumpRef.current = 0;
    jumpVelRef.current = 0;
    isJumpingRef.current = false;
    obstaclesRef.current = [];
    coinsRef.current = [];
    powerUpsRef.current = [];
    particlesRef.current = [];
    trailRef.current = [];
    scoreRef.current = 0;
    coinsCountRef.current = 0;
    gemsCountRef.current = 0;
    speedRef.current = 0.4;
    distanceRef.current = 0;
    lastObstacleZRef.current = SPAWN_DISTANCE;
    lastCoinZRef.current = 30;
    lastPowerUpZRef.current = 60;
    realmIndexRef.current = 0;
    realmTransitionRef.current = 0;
    hitReactionRef.current = 0;
    collectReactionRef.current = 0;
    bobPhaseRef.current = 0;
    magnetActiveRef.current = 0;
    shieldActiveRef.current = 0;
    speedBoostActiveRef.current = 0;
    setScore(0);
    setCoins(0);
    setGems(0);
    setCurrentRealm("NEON CITY");
    setActivePowerUp(null);
    gameStateRef.current = "playing";
    setGameState("playing");

    for (let i = 0; i < 5; i++) spawnObstacles();
    for (let i = 0; i < 8; i++) spawnCoins();
    spawnPowerUps();

    audioRef.current?.play().catch(() => {});
  }, [spawnObstacles, spawnCoins, spawnPowerUps]);

  // ─── Input (keyboard + touch + mouse click) ───────────────────
  useEffect(() => {
    const canvas = canvasRef.current;

    const handleKey = (e: KeyboardEvent) => {
      if (gameStateRef.current !== "playing") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startGame();
        }
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        targetLaneRef.current = Math.max(0, targetLaneRef.current - 1);
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        targetLaneRef.current = Math.min(2, targetLaneRef.current + 1);
      } else if (
        (e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === " ") &&
        !isJumpingRef.current
      ) {
        e.preventDefault();
        isJumpingRef.current = true;
        jumpVelRef.current = -12;
      }
    };

    const handleClick = (_e: MouseEvent) => {
      if (gameStateRef.current !== "playing") {
        startGame();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (gameStateRef.current !== "playing") {
        startGame();
        touchStartRef.current = null;
        return;
      }

      if (absDx > 30 || absDy > 30) {
        if (absDx > absDy) {
          if (dx > 0) targetLaneRef.current = Math.min(2, targetLaneRef.current + 1);
          else targetLaneRef.current = Math.max(0, targetLaneRef.current - 1);
        } else {
          if (dy < 0 && !isJumpingRef.current) {
            isJumpingRef.current = true;
            jumpVelRef.current = -12;
          }
        }
      }
      touchStartRef.current = null;
    };

    window.addEventListener("keydown", handleKey);
    canvas?.addEventListener("click", handleClick);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("keydown", handleKey);
      canvas?.removeEventListener("click", handleClick);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [startGame]);

  // ─── Game Loop ─────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const laneToX = (lane: number) => (lane - 1) * LANE_WIDTH;

    const drawBackground = (ctx: CanvasRenderingContext2D, W: number, H: number, realm: Realm, realmIdx: number) => {
      // Draw bg image if loaded
      const bgImg = bgImagesRef.current[`bg${realmIdx}`];
      if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
        ctx.globalAlpha = 0.4;
        // Cover the sky portion
        const skyH = H * HORIZON_Y + 40;
        const imgAspect = bgImg.naturalWidth / bgImg.naturalHeight;
        const drawW = Math.max(W, skyH * imgAspect);
        const drawH = drawW / imgAspect;
        const scrollX = (frameRef.current * 0.2) % drawW;
        ctx.drawImage(bgImg, -scrollX, 0, drawW, drawH);
        ctx.drawImage(bgImg, -scrollX + drawW, 0, drawW, drawH);
        ctx.globalAlpha = 1;
      }

      // Overlay gradient for blending
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, realm.bgGradient[0] + "88");
      bgGrad.addColorStop(0.4, realm.bgGradient[1] + "cc");
      bgGrad.addColorStop(1, realm.bgGradient[2]);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);
    };

    const loop = () => {
      animFrameRef.current = requestAnimationFrame(loop);
      const W = canvas.width;
      const H = canvas.height;
      const dt = 1 / 60;
      frameRef.current++;

      const realm = REALMS[realmIndexRef.current] || REALMS[REALMS.length - 1];

      // ─── Draw Background ────────────────────────────────────
      // Clear first
      ctx.fillStyle = realm.bgGradient[0];
      ctx.fillRect(0, 0, W, H);
      drawBackground(ctx, W, H, realm, realmIndexRef.current);

      // Animated stars
      ctx.fillStyle = realm.particleColor;
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 137.5 + frameRef.current * 0.1) % W);
        const sy = ((i * 97.3 + frameRef.current * 0.05 * (i % 3 + 1)) % (H * HORIZON_Y));
        const ss = 1 + (i % 3);
        ctx.globalAlpha = 0.3 + 0.3 * Math.sin(frameRef.current * 0.02 + i);
        ctx.fillRect(sx, sy, ss, ss);
      }
      ctx.globalAlpha = 1;

      // ─── Draw Ground (perspective road) ─────────────────────
      const horizonPx = H * HORIZON_Y;
      const roadGrad = ctx.createLinearGradient(0, horizonPx, 0, H);
      roadGrad.addColorStop(0, realm.groundColor);
      roadGrad.addColorStop(1, realm.bgGradient[2]);

      const vanishX = W / 2;
      const roadBottomHalf = ROAD_WIDTH * 1.5;
      ctx.fillStyle = roadGrad;
      ctx.beginPath();
      ctx.moveTo(vanishX - 10, horizonPx);
      ctx.lineTo(vanishX + 10, horizonPx);
      ctx.lineTo(W / 2 + roadBottomHalf, H);
      ctx.lineTo(W / 2 - roadBottomHalf, H);
      ctx.closePath();
      ctx.fill();

      // Lane lines
      for (let l = -1; l <= 1; l++) {
        const lx = l * LANE_WIDTH;
        const topP = project(lx, VIEW_DISTANCE, W, H);
        const botP = project(lx, 1, W, H);
        ctx.strokeStyle = realm.laneColor;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(topP.x, topP.y);
        ctx.lineTo(botP.x, botP.y);
        ctx.stroke();
      }

      // Road edges
      for (const side of [-1.5, 1.5]) {
        const lx = side * LANE_WIDTH;
        const topP = project(lx, VIEW_DISTANCE, W, H);
        const botP = project(lx, 1, W, H);
        ctx.strokeStyle = realm.laneColor;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(topP.x, topP.y);
        ctx.lineTo(botP.x, botP.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Scrolling ground lines
      for (let i = 0; i < 20; i++) {
        const rawZ = ((i * 8 - (distanceRef.current * 8) % 8 + 200) % 160);
        if (rawZ < 2 || rawZ > VIEW_DISTANCE) continue;
        const leftP = project(-1.5 * LANE_WIDTH, rawZ, W, H);
        const rightP = project(1.5 * LANE_WIDTH, rawZ, W, H);
        ctx.strokeStyle = realm.laneColor;
        ctx.globalAlpha = 0.15 * (1 - rawZ / VIEW_DISTANCE);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftP.x, leftP.y);
        ctx.lineTo(rightP.x, rightP.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      if (gameStateRef.current !== "playing") {
        drawOverlay(ctx, W, H);
        return;
      }

      // ─── Update Game Logic ──────────────────────────────────
      const speedMult = speedBoostActiveRef.current > 0 ? 1.6 : 1;
      distanceRef.current += speedRef.current * speedMult;
      scoreRef.current += speedRef.current * 2 * speedMult;
      speedRef.current = Math.min(1.8, 0.4 + distanceRef.current * 0.0003);
      bobPhaseRef.current += 0.15;

      // Power-up timers
      if (magnetActiveRef.current > 0) magnetActiveRef.current -= dt;
      if (shieldActiveRef.current > 0) shieldActiveRef.current -= dt;
      if (speedBoostActiveRef.current > 0) speedBoostActiveRef.current -= dt;

      // Update active power-up display
      if (magnetActiveRef.current > 0) setActivePowerUp("magnet");
      else if (shieldActiveRef.current > 0) setActivePowerUp("shield");
      else if (speedBoostActiveRef.current > 0) setActivePowerUp("speed");
      else setActivePowerUp(null);

      // Realm progression
      for (let i = REALMS.length - 1; i >= 0; i--) {
        if (scoreRef.current >= REALMS[i].scoreThreshold) {
          if (realmIndexRef.current !== i) {
            realmIndexRef.current = i;
            realmTransitionRef.current = 1;
            setCurrentRealm(REALMS[i].name);
          }
          break;
        }
      }
      if (realmTransitionRef.current > 0) realmTransitionRef.current -= 0.01;

      // Player lane movement
      const targetX = laneToX(targetLaneRef.current);
      playerXRef.current += (targetX - playerXRef.current) * 0.18;
      playerLaneRef.current = targetLaneRef.current;

      // Jump physics
      if (isJumpingRef.current) {
        jumpVelRef.current += 0.6;
        jumpRef.current += jumpVelRef.current;
        if (jumpRef.current >= 0) {
          jumpRef.current = 0;
          jumpVelRef.current = 0;
          isJumpingRef.current = false;
        }
      }

      // Reactions decay
      if (hitReactionRef.current > 0) hitReactionRef.current -= dt;
      if (collectReactionRef.current > 0) collectReactionRef.current -= dt;

      // Spawn
      while (lastObstacleZRef.current < distanceRef.current + SPAWN_DISTANCE) {
        spawnObstacles();
      }
      while (lastCoinZRef.current < distanceRef.current + SPAWN_DISTANCE) {
        spawnCoins();
      }
      while (lastPowerUpZRef.current < distanceRef.current + SPAWN_DISTANCE) {
        spawnPowerUps();
      }

      // ─── Update & Draw Coins ────────────────────────────────
      coinsRef.current = coinsRef.current.filter((c) => c.z - distanceRef.current > -5);

      for (const coin of coinsRef.current) {
        const relZ = coin.z - distanceRef.current;
        if (relZ < 0 || relZ > VIEW_DISTANCE) continue;
        const cx = laneToX(coin.lane);
        const p = project(cx, relZ, W, H);
        const sz = p.scale * (coin.isGem ? 28 : 20);
        const floatY = Math.sin(frameRef.current * 0.05 + coin.floatPhase) * 5 * p.scale;

        if (!coin.collected) {
          // Magnet effect - attract coins from adjacent lanes
          const magnetRange = magnetActiveRef.current > 0 ? 2 : 0;
          const laneDiff = Math.abs(coin.lane - targetLaneRef.current);
          const playerRelZ = 2;
          const inRange = Math.abs(relZ - playerRelZ) < (magnetRange > 0 ? 8 : 3);
          const laneMatch = magnetRange > 0 ? laneDiff <= magnetRange : coin.lane === targetLaneRef.current;

          if (inRange && laneMatch && jumpRef.current > -60) {
            coin.collected = true;
            if (coin.isGem) {
              gemsCountRef.current++;
              setGems(gemsCountRef.current);
              addParticles(p.x, p.y - floatY, "#ff66cc", 15);
            } else {
              coinsCountRef.current++;
              setCoins(coinsCountRef.current);
              addParticles(p.x, p.y - floatY, "#ffcc00", 10);
            }
            collectReactionRef.current = 0.3;
            continue;
          }

          // Draw coin
          if (coin.isGem) {
            ctx.save();
            ctx.shadowColor = "#ff66cc";
            ctx.shadowBlur = 15 * p.scale;
            ctx.fillStyle = "#ff66cc";
            ctx.beginPath();
            ctx.moveTo(p.x, p.y - floatY - sz);
            ctx.lineTo(p.x + sz * 0.6, p.y - floatY);
            ctx.lineTo(p.x, p.y - floatY + sz * 0.5);
            ctx.lineTo(p.x - sz * 0.6, p.y - floatY);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          } else {
            ctx.save();
            ctx.shadowColor = "#ffcc00";
            ctx.shadowBlur = 10 * p.scale;
            ctx.fillStyle = "#ffcc00";
            ctx.beginPath();
            ctx.arc(p.x, p.y - floatY - sz / 2, sz / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffa500";
            ctx.beginPath();
            ctx.arc(p.x, p.y - floatY - sz / 2, sz / 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      // ─── Update & Draw Power-Ups ──────────────────────────────
      powerUpsRef.current = powerUpsRef.current.filter((pu) => pu.z - distanceRef.current > -5);

      for (const pu of powerUpsRef.current) {
        const relZ = pu.z - distanceRef.current;
        if (relZ < 0 || relZ > VIEW_DISTANCE || pu.collected) continue;
        const px = laneToX(pu.lane);
        const p = project(px, relZ, W, H);
        const sz = p.scale * 32;
        const floatY = Math.sin(frameRef.current * 0.06 + pu.floatPhase) * 6 * p.scale;
        const color = POWER_UP_COLORS[pu.type];

        // Collision
        const playerRelZ = 2;
        if (Math.abs(relZ - playerRelZ) < 3 && pu.lane === targetLaneRef.current && jumpRef.current > -60) {
          pu.collected = true;
          if (pu.type === "magnet") magnetActiveRef.current = 8;
          else if (pu.type === "shield") shieldActiveRef.current = 10;
          else if (pu.type === "speed") speedBoostActiveRef.current = 5;
          addParticles(p.x, p.y - floatY, color, 20);
          continue;
        }

        // Draw power-up (glowing hexagon)
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 20 * p.scale;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(frameRef.current * 0.1);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const hx = p.x + sz * Math.cos(angle);
          const hy = p.y - floatY - sz + sz * Math.sin(angle);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // Icon
        ctx.fillStyle = "#000";
        ctx.font = `bold ${sz}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(POWER_UP_ICONS[pu.type], p.x, p.y - floatY - sz);
        ctx.restore();
      }

      // ─── Update & Draw Obstacles ────────────────────────────
      obstaclesRef.current = obstaclesRef.current.filter((o) => o.z - distanceRef.current > -5);

      for (const obs of obstaclesRef.current) {
        const relZ = obs.z - distanceRef.current;
        if (relZ < 0 || relZ > VIEW_DISTANCE) continue;
        const ox = laneToX(obs.lane);
        const p = project(ox, relZ, W, H);
        const sz = p.scale * 80;

        obs.glitchOffset = Math.sin(frameRef.current * 0.1 + obs.floatPhase) * 2 * p.scale;
        const floatY = Math.sin(frameRef.current * 0.04 + obs.floatPhase) * 4 * p.scale;

        // Draw obstacle avatar
        const imgKey = `obs${obs.type + 1}`;
        const img = imagesRef.current[imgKey];
        if (img && img.complete) {
          ctx.save();
          ctx.shadowColor = realm.obstacleGlow;
          ctx.shadowBlur = 20 * p.scale;
          ctx.drawImage(
            img,
            p.x - sz / 2 + obs.glitchOffset,
            p.y - sz - floatY,
            sz,
            sz
          );
          // Neon border
          ctx.strokeStyle = realm.obstacleGlow;
          ctx.lineWidth = 2 * p.scale;
          ctx.globalAlpha = 0.6 + 0.3 * Math.sin(frameRef.current * 0.08);
          ctx.strokeRect(
            p.x - sz / 2 + obs.glitchOffset - 2,
            p.y - sz - floatY - 2,
            sz + 4,
            sz + 4
          );
          ctx.globalAlpha = 1;
          ctx.restore();
        }

        // Collision detection
        const playerRelZ = 2;
        if (
          Math.abs(relZ - playerRelZ) < 2.5 &&
          obs.lane === targetLaneRef.current &&
          jumpRef.current > -40
        ) {
          if (shieldActiveRef.current > 0) {
            // Shield absorbs hit
            shieldActiveRef.current = 0;
            addParticles(p.x, p.y - sz / 2, "#00ccff", 30);
            // Remove this obstacle
            obs.z = -100;
          } else {
            hitReactionRef.current = 0.5;
            gameStateRef.current = "gameover";
            setGameState("gameover");
            setScore(Math.floor(scoreRef.current));
            audioRef.current?.pause();
            addParticles(p.x, p.y - sz / 2, "#ff0044", 25);
          }
        }
      }

      // ─── Draw Player (Mochi) ───────────────────────────────
      const playerP = project(playerXRef.current, 2, W, H);
      const playerSize = playerP.scale * 140;
      const bob = Math.sin(bobPhaseRef.current) * 4;
      const squash =
        isJumpingRef.current && jumpVelRef.current > 0
          ? 1.15
          : isJumpingRef.current
          ? 0.9
          : 1 + Math.sin(bobPhaseRef.current * 2) * 0.03;
      const stretch = 2 - squash;
      const collectBounce = collectReactionRef.current > 0 ? -8 : 0;

      // Trail particles
      if (frameRef.current % 2 === 0) {
        trailRef.current.push({
          x: playerP.x,
          y: playerP.y + jumpRef.current + bob,
          life: 1,
          maxLife: 0.5,
        });
      }
      trailRef.current = trailRef.current.filter((t) => {
        t.life -= 0.03;
        return t.life > 0;
      });
      for (const t of trailRef.current) {
        ctx.globalAlpha = t.life * 0.3;
        ctx.fillStyle = realm.laneColor;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 5 * t.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Shield glow around player
      if (shieldActiveRef.current > 0) {
        ctx.save();
        ctx.strokeStyle = "#00ccff";
        ctx.shadowColor = "#00ccff";
        ctx.shadowBlur = 25;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(frameRef.current * 0.1);
        ctx.beginPath();
        ctx.arc(playerP.x, playerP.y + jumpRef.current + bob - playerSize / 2, playerSize * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Magnet aura
      if (magnetActiveRef.current > 0) {
        ctx.save();
        ctx.strokeStyle = "#ffcc00";
        ctx.shadowColor = "#ffcc00";
        ctx.shadowBlur = 15;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3 + 0.2 * Math.sin(frameRef.current * 0.15);
        ctx.beginPath();
        ctx.arc(playerP.x, playerP.y + jumpRef.current + bob - playerSize / 2, playerSize * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      const mochiImage =
        collectReactionRef.current > 0
          ? imagesRef.current.mochiEat
          : imagesRef.current.mochi;
      if (mochiImage && mochiImage.complete) {
        ctx.save();
        ctx.shadowColor = "#bca2ff";
        ctx.shadowBlur = 25;
        const drawX = playerP.x;
        const drawY = playerP.y + jumpRef.current + bob + collectBounce;
        ctx.translate(drawX, drawY);
        ctx.scale(squash, stretch);
        ctx.drawImage(mochiImage, -playerSize / 2, -playerSize, playerSize, playerSize);
        ctx.restore();
      }

      // Speed boost lines
      if (speedBoostActiveRef.current > 0) {
        ctx.save();
        ctx.strokeStyle = "#ff3366";
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const ly = playerP.y + jumpRef.current - playerSize * 0.2 + i * 12;
          const lx = playerP.x - playerSize * 0.8 - Math.random() * 20;
          ctx.globalAlpha = 0.4 + Math.random() * 0.3;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx - 30 - Math.random() * 20, ly);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ─── Draw Particles ────────────────────────────────────
      particlesRef.current = particlesRef.current.filter((p) => {
        p.life -= 1 / (60 * p.maxLife);
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        return p.life > 0;
      });
      for (const p of particlesRef.current) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Realm transition flash
      if (realmTransitionRef.current > 0) {
        ctx.globalAlpha = realmTransitionRef.current * 0.4;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      // Update React state periodically
      if (frameRef.current % 10 === 0) {
        setScore(Math.floor(scoreRef.current));
      }
    };

    const drawOverlay = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
      // Cinematic overlay
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, W, H);

      // Animated scanlines
      ctx.globalAlpha = 0.03;
      for (let y = 0; y < H; y += 3) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, y, W, 1);
      }
      ctx.globalAlpha = 1;

      const isMenu = gameStateRef.current === "menu";

      // Cinematic letterbox bars
      const barH = H * 0.04;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, barH);
      ctx.fillRect(0, H - barH, W, barH);

      // Logo with glow
      const logo = imagesRef.current.logo;
      if (logo && logo.complete) {
        const logoSize = Math.min(W * 0.3, 150);
        ctx.save();
        ctx.shadowColor = "#bca2ff";
        ctx.shadowBlur = 40;
        ctx.globalAlpha = 0.95;
        ctx.drawImage(logo, W / 2 - logoSize / 2, H * 0.08, logoSize, logoSize);
        ctx.restore();
      }

      // Title with animated glow
      const glowIntensity = 20 + 15 * Math.sin(frameRef.current * 0.03);
      ctx.fillStyle = "#bca2ff";
      ctx.font = `bold ${Math.min(W * 0.07, 44)}px Orbitron, sans-serif`;
      ctx.textAlign = "center";
      ctx.shadowColor = "#bca2ff";
      ctx.shadowBlur = glowIntensity;
      ctx.fillText(
        isMenu ? "CYBER MOCHI DASH" : "GAME OVER",
        W / 2,
        H * 0.34
      );

      // Subtitle
      if (isMenu) {
        ctx.shadowBlur = 10;
        ctx.fillStyle = "#00ffff";
        ctx.font = `${Math.min(W * 0.03, 16)}px Rajdhani, sans-serif`;
        ctx.fillText("NEON STREETS AWAIT", W / 2, H * 0.39);
      }
      ctx.shadowBlur = 0;

      if (!isMenu) {
        ctx.fillStyle = "#ffffff";
        ctx.font = `${Math.min(W * 0.05, 28)}px Orbitron, sans-serif`;
        ctx.shadowColor = "#bca2ff";
        ctx.shadowBlur = 10;
        ctx.fillText(`${Math.floor(scoreRef.current)}`, W / 2, H * 0.44);
        ctx.shadowBlur = 0;
        ctx.font = `${Math.min(W * 0.03, 18)}px Rajdhani, sans-serif`;
        ctx.fillStyle = "#aaa";
        ctx.fillText("SCORE", W / 2, H * 0.48);

        // Coins and gems side by side
        ctx.font = `${Math.min(W * 0.035, 20)}px Rajdhani, sans-serif`;
        ctx.fillStyle = "#ffcc00";
        ctx.fillText(`🪙 ${coinsCountRef.current}`, W / 2 - 50, H * 0.54);
        ctx.fillStyle = "#ff66cc";
        ctx.fillText(`💎 ${gemsCountRef.current}`, W / 2 + 50, H * 0.54);
      }

      // Mochi character with cinematic float
      const mochi = imagesRef.current.mochi;
      if (mochi && mochi.complete) {
        const mSize = Math.min(W * 0.35, 200);
        const floatOffset = Math.sin(frameRef.current * 0.03) * 8;
        const pulse = 1 + Math.sin(frameRef.current * 0.05) * 0.02;
        ctx.save();
        ctx.shadowColor = "#bca2ff";
        ctx.shadowBlur = 30;
        ctx.translate(W / 2, H * 0.54 + mSize / 2 + floatOffset);
        ctx.scale(pulse, pulse);
        ctx.drawImage(mochi, -mSize / 2, 0, mSize, mSize);
        ctx.restore();
      }

      // Animated button with pulse
      const btnW = Math.min(W * 0.5, 240);
      const btnH = 52;
      const btnX = W / 2 - btnW / 2;
      const btnY = H * 0.82;
      const btnPulse = 1 + Math.sin(frameRef.current * 0.06) * 0.03;
      ctx.save();
      ctx.translate(W / 2, btnY + btnH / 2);
      ctx.scale(btnPulse, btnPulse);
      ctx.translate(-W / 2, -(btnY + btnH / 2));
      // Button gradient
      const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY);
      btnGrad.addColorStop(0, "#110fff");
      btnGrad.addColorStop(1, "#bca2ff");
      ctx.shadowColor = "#110fff";
      ctx.shadowBlur = 25;
      ctx.fillStyle = btnGrad;
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 14);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.min(W * 0.04, 20)}px Orbitron, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(isMenu ? "START GAME" : "PLAY AGAIN", W / 2, btnY + 34);
      ctx.restore();

      // Controls hint
      ctx.fillStyle = "#666";
      ctx.font = `${Math.min(W * 0.025, 13)}px Rajdhani, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(
        "Arrow keys / WASD / Swipe to move • Up / Space / Swipe up to jump • Click to start",
        W / 2,
        H * 0.93
      );
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [project, spawnObstacles, spawnCoins, spawnPowerUps, addParticles]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <canvas ref={canvasRef} className="block w-full h-full cursor-pointer" />

      {/* HUD */}
      {gameState === "playing" && (
        <div className="fixed top-0 left-0 right-0 p-3 flex justify-between items-start pointer-events-none z-10">
          <div className="flex flex-col gap-1">
            <div className="font-display text-xl md:text-2xl text-foreground text-glow-primary">
              {score}
            </div>
            <div className="font-body text-xs text-secondary uppercase tracking-widest">
              {currentRealm}
            </div>
          </div>
          <div className="flex gap-4 items-center">
            {activePowerUp && (
              <div
                className="px-2 py-0.5 rounded-full text-xs font-display uppercase tracking-wider animate-pulse-glow"
                style={{
                  backgroundColor: POWER_UP_COLORS[activePowerUp as keyof typeof POWER_UP_COLORS] + "33",
                  color: POWER_UP_COLORS[activePowerUp as keyof typeof POWER_UP_COLORS],
                  border: `1px solid ${POWER_UP_COLORS[activePowerUp as keyof typeof POWER_UP_COLORS]}`,
                }}
              >
                {activePowerUp}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-[hsl(45,100%,50%)] shadow-[0_0_8px_hsl(45,100%,50%)]" />
              <span className="font-display text-sm text-foreground">{coins}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-neon-pink rotate-45 shadow-[0_0_8px_hsl(320,100%,60%)]" />
              <span className="font-display text-sm text-foreground">{gems}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EndlessRunner;
