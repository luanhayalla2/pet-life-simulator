import { useState, useEffect, useRef } from "react";
import { X, Trophy, Timer, Target, Brain, Zap } from "lucide-react";
import { toast } from "sonner";

type GameType = "racing" | "memory" | "parkour" | "treasure";

interface MiniGameOverlayProps {
  type: GameType;
  onComplete: (reward: { coins: number; xp: number }) => void;
  onClose: () => void;
}

export function MiniGameOverlay({ type, onComplete, onClose }: MiniGameOverlayProps) {
  const [gameState, setGameState] = useState<"ready" | "playing" | "finished">("ready");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  
  // Game 1: Racing (Click fast)
  const [progress, setProgress] = useState(0);
  
  // Game 2: Memory (Emoji match)
  const [cards, setCards] = useState<{ id: number; emoji: string; matched: boolean; flipped: boolean }[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  
  // Game 3: Parkour (Timing jump)
  const [jumpActive, setJumpActive] = useState(false);
  const [obstaclePos, setObstaclePos] = useState(100);

  // Game 4: Treasure Hunt
  const [bushes, setBushes] = useState<{ id: number; hasTreasure: boolean; revealed: boolean }[]>([]);

  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && gameState === "playing") {
      finishGame();
    }
  }, [gameState, timeLeft]);

  const startGame = () => {
    setGameState("playing");
    setScore(0);
    setTimeLeft(type === "memory" ? 25 : 10);
    
    if (type === "memory") {
      const emojis = ["🐶", "🐱", "🐰", "🦊", "🐻", "🐼"];
      const deck = [...emojis, ...emojis]
        .sort(() => Math.random() - 0.5)
        .map((emoji, i) => ({ id: i, emoji, matched: false, flipped: false }));
      setCards(deck);
    } else if (type === "treasure") {
      const newBushes = Array.from({ length: 9 }, (_, i) => ({
        id: i,
        hasTreasure: Math.random() < 0.3,
        revealed: false,
      }));
      setBushes(newBushes);
    } else if (type === "parkour") {
      setObstaclePos(100);
    }
  };

  const finishGame = () => {
    setGameState("finished");
    let finalScore = score;
    if (type === "racing") finalScore = Math.floor(progress / 5);
    
    const reward = {
      coins: Math.max(5, Math.floor(finalScore * 2)),
      xp: Math.max(5, Math.floor(finalScore * 1.5)),
    };
    
    onComplete(reward);
  };

  // --- Racing Logic ---
  const handleRaceTap = () => {
    if (gameState !== "playing") return;
    const next = progress + 4;
    setProgress(next);
    if (next >= 100) {
      setScore(10);
      finishGame();
    }
  };

  // --- Memory Logic ---
  const handleCardClick = (id: number) => {
    if (gameState !== "playing" || flipped.length === 2 || cards[id].flipped || cards[id].matched) return;
    
    const newCards = [...cards];
    newCards[id].flipped = true;
    setCards(newCards);
    
    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);
    
    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      if (cards[first].emoji === cards[second].emoji) {
        setTimeout(() => {
          const matchedCards = [...cards];
          matchedCards[first].matched = true;
          matchedCards[second].matched = true;
          setCards(matchedCards);
          setFlipped([]);
          setScore((s) => s + 5);
          if (matchedCards.every(c => c.matched)) finishGame();
        }, 500);
      } else {
        setTimeout(() => {
          const unFlippedCards = [...cards];
          unFlippedCards[first].flipped = false;
          unFlippedCards[second].flipped = false;
          setCards(unFlippedCards);
          setFlipped([]);
        }, 800);
      }
    }
  };

  // --- Parkour Logic ---
  useEffect(() => {
    if (type === "parkour" && gameState === "playing") {
      const interval = setInterval(() => {
        setObstaclePos((p) => {
          const next = p - 2.5;
          if (next < 15 && next > 5 && !jumpActive) {
             toast.error("Oops! Bateu no obstáculo.");
             setGameState("finished");
             return 0;
          }
          if (next <= 0) {
            setScore((s) => s + 2);
            return 100;
          }
          return next;
        });
      }, 30);
      return () => clearInterval(interval);
    }
  }, [type, gameState, jumpActive]);

  // --- Treasure Logic ---
  const handleBushClick = (id: number) => {
    if (gameState !== "playing" || bushes[id].revealed) return;
    const nextBushes = [...bushes];
    nextBushes[id].revealed = true;
    setBushes(nextBushes);
    if (nextBushes[id].hasTreasure) {
      setScore((s) => s + 10);
      toast.success("Encontrou um tesouro! 💎");
    }
    if (nextBushes.every(b => b.revealed)) finishGame();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] bg-background p-8 shadow-2xl">
        <button 
          onClick={onClose} 
          className="absolute right-6 top-6 rounded-full bg-muted p-2 text-muted-foreground hover:bg-muted/80"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {type === "racing" && <Zap className="h-8 w-8" />}
            {type === "memory" && <Brain className="h-8 w-8" />}
            {type === "parkour" && <Timer className="h-8 w-8" />}
            {type === "treasure" && <Target className="h-8 w-8" />}
          </div>
          <h2 className="text-2xl font-extrabold uppercase tracking-tight">
            {type === "racing" ? "Corrida Veloz" : type === "memory" ? "Jogo da Memória" : type === "parkour" ? "Salto Ninja" : "Caça ao Tesouro"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {type === "racing" ? "Toque o mais rápido possível!" : type === "memory" ? "Encontre os pares de emojis!" : type === "parkour" ? "Pule na hora certa!" : "Encontre os tesouros escondidos!"}
          </p>
        </div>

        {gameState === "ready" && (
          <div className="py-12 text-center">
            <button 
              onClick={startGame}
              className="w-full rounded-2xl bg-[var(--gradient-hero)] px-8 py-4 text-lg font-bold text-white shadow-lg active:scale-95"
            >
              Começar Game
            </button>
          </div>
        )}

        {gameState === "playing" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-2 text-money"><Trophy className="h-4 w-4" /> Score: {score}</span>
              <span className="flex items-center gap-2 text-reward"><Timer className="h-4 w-4" /> {timeLeft}s</span>
            </div>

            <div className="min-h-[240px] rounded-3xl bg-muted/30 p-6 flex items-center justify-center border-2 border-dashed border-border">
              {type === "racing" && (
                <div className="w-full space-y-8">
                  <div className="relative h-4 w-full rounded-full bg-muted">
                    <div 
                      className="absolute inset-y-0 left-0 rounded-full bg-[var(--gradient-money)] transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 text-4xl transition-all duration-300"
                      style={{ left: `calc(${progress}% - 20px)` }}
                    >
                      🏃
                    </div>
                  </div>
                  <button 
                    onClick={handleRaceTap}
                    className="h-32 w-32 mx-auto block rounded-full bg-primary text-white shadow-xl active:scale-90 flex flex-col items-center justify-center gap-1"
                  >
                    <span className="text-4xl">👟</span>
                    <span className="font-bold uppercase text-xs">Tap!</span>
                  </button>
                </div>
              )}

              {type === "memory" && (
                <div className="grid grid-cols-4 gap-2">
                  {cards.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => handleCardClick(card.id)}
                      className={`h-16 w-16 rounded-xl text-2xl transition-all duration-300 ${card.flipped || card.matched ? "bg-white shadow-md" : "bg-primary text-primary-foreground"}`}
                    >
                      {(card.flipped || card.matched) ? card.emoji : "?"}
                    </button>
                  ))}
                </div>
              )}

              {type === "parkour" && (
                <div 
                  className="relative h-40 w-full overflow-hidden bg-white/50 rounded-xl"
                  onClick={() => { if(!jumpActive) { setJumpActive(true); setTimeout(() => setJumpActive(false), 500); } }}
                >
                  <div 
                    className={`absolute bottom-4 left-10 text-4xl transition-all duration-500 ${jumpActive ? "-translate-y-20 rotate-12" : "translate-y-0"}`}
                  >
                    🐶
                  </div>
                  <div 
                    className="absolute bottom-4 h-8 w-8 bg-destructive rounded-lg flex items-center justify-center text-xl"
                    style={{ left: `${obstaclePos}%` }}
                  >
                    🌵
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-4 bg-money/20" />
                  <div className="absolute top-4 right-4 text-xs font-bold uppercase opacity-40 italic">Toque para pular!</div>
                </div>
              )}

              {type === "treasure" && (
                <div className="grid grid-cols-3 gap-3">
                  {bushes.map((bush) => (
                    <button
                      key={bush.id}
                      onClick={() => handleBushClick(bush.id)}
                      className={`h-20 w-20 rounded-2xl text-3xl transition-all active:scale-95 ${bush.revealed ? (bush.hasTreasure ? "bg-reward/20 border-reward" : "bg-muted opacity-40") : "bg-green-100 hover:bg-green-200"}`}
                    >
                      {bush.revealed ? (bush.hasTreasure ? "💎" : "🍃") : "🌳"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {gameState === "finished" && (
          <div className="space-y-6 py-8 text-center">
            <h3 className="text-3xl font-extrabold text-money">Game Over!</h3>
            <p className="text-muted-foreground">Você mandou bem demais!</p>
            <div className="flex justify-center gap-4">
               <div className="rounded-2xl bg-money/10 px-6 py-3 font-bold text-money">+{Math.max(5, Math.floor(score * 2))} 🪙</div>
               <div className="rounded-2xl bg-primary/10 px-6 py-3 font-bold text-primary">+{Math.max(5, Math.floor(score * 1.5))} XP</div>
            </div>
            <button 
              onClick={onClose}
              className="w-full rounded-2xl bg-foreground px-8 py-4 font-bold text-background active:scale-95"
            >
              Coletar Recompensas
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
