import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { Heart, Coins, ShoppingBag, Sparkles, Bone, Gamepad2, Droplet, LogIn, LogOut, Trophy, Download, Upload, Zap, History as HistoryIcon, Gift, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import petImg from "@/assets/pet-mel.png";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "PetLife — Simulador de Pet, Loja e Vida" },
      { name: "description", content: "Cuide do seu pet, gerencie dinheiro, complete missões e viva eventos aleatórios neste simulador fofo." },
    ],
  }),
});

type Tab = "pet" | "shop" | "missions" | "life";

interface Item {
  id: string;
  name: string;
  icon: string;
  price: number;
  effect: { hunger?: number; happy?: number; clean?: number };
}

const SHOP_ITEMS: Item[] = [
  { id: "bone", name: "Ossinho", icon: "🦴", price: 10, effect: { hunger: 25 } },
  { id: "ball", name: "Bolinha", icon: "🎾", price: 15, effect: { happy: 30 } },
  { id: "bath", name: "Banho", icon: "🛁", price: 20, effect: { clean: 40 } },
  { id: "treat", name: "Petisco", icon: "🍪", price: 25, effect: { hunger: 15, happy: 15 } },
  { id: "toy", name: "Brinquedo", icon: "🧸", price: 40, effect: { happy: 50 } },
  { id: "spa", name: "Spa", icon: "✨", price: 60, effect: { clean: 60, happy: 20 } },
];

interface Mission {
  id: string;
  label: string;
  target: number;
  progress: number;
  reward: number;
  xp: number;
  done: boolean;
  type: "feed" | "play" | "wash" | "buy";
}

const buildDailyMissions = (): Mission[] => [
  { id: "m_feed", label: "Alimentar 3 vezes", target: 3, progress: 0, reward: 20, xp: 15, done: false, type: "feed" },
  { id: "m_play", label: "Brincar 3 vezes", target: 3, progress: 0, reward: 25, xp: 20, done: false, type: "play" },
  { id: "m_wash", label: "Dar 2 banhos", target: 2, progress: 0, reward: 20, xp: 15, done: false, type: "wash" },
  { id: "m_buy", label: "Comprar 1 item da loja", target: 1, progress: 0, reward: 15, xp: 10, done: false, type: "buy" },
];

interface RandomEvent {
  id: string;
  emoji: string;
  title: string;
  description: string;
  options: { label: string; effect: { hunger?: number; happy?: number; clean?: number; coins?: number; xp?: number }; toast: string }[];
}

const RANDOM_EVENTS: RandomEvent[] = [
  {
    id: "rain",
    emoji: "🌧️",
    title: "Começou a chover!",
    description: "Seu pet ficou todo molhado e sujo.",
    options: [
      { label: "Dar banho quente 🛁", effect: { clean: 30, happy: 10 }, toast: "Banho aquecido! 🧼" },
      { label: "Deixar secar 💨", effect: { clean: -10, happy: -5 }, toast: "Hmm, ficou meio fedido..." },
    ],
  },
  {
    id: "friend",
    emoji: "🐶",
    title: "Apareceu um amigo!",
    description: "Outro pet quer brincar.",
    options: [
      { label: "Brincar juntos 🎾", effect: { happy: 25, hunger: -10, xp: 10 }, toast: "Que diversão! 💕" },
      { label: "Ignorar 😴", effect: { happy: -10 }, toast: "Seu pet ficou triste..." },
    ],
  },
  {
    id: "treat",
    emoji: "🍖",
    title: "Achou comida na rua!",
    description: "Tem um petisco misterioso no chão.",
    options: [
      { label: "Comer 😋", effect: { hunger: 30, clean: -15 }, toast: "Delícia! Mas se sujou." },
      { label: "Não comer 🙅", effect: { coins: 5 }, toast: "Decisão sábia! +5 moedas." },
    ],
  },
  {
    id: "chase",
    emoji: "🦋",
    title: "Borboleta passando!",
    description: "Seu pet quer perseguir.",
    options: [
      { label: "Correr atrás 💨", effect: { happy: 20, hunger: -15, xp: 8 }, toast: "Gastou energia, mas adorou!" },
      { label: "Ficar quieto 🛋️", effect: { happy: -5 }, toast: "Que tédio..." },
    ],
  },
  {
    id: "found_coin",
    emoji: "🪙",
    title: "Moeda na calçada!",
    description: "Brilhando no chão.",
    options: [
      { label: "Pegar 💰", effect: { coins: 25, xp: 5 }, toast: "+25 moedas!" },
    ],
  },
];

const xpForLevel = (lvl: number) => lvl * 100;

interface Particle { id: number; emoji: string; }

function Index() {
  const [tab, setTab] = useState<Tab>("pet");
  const [userId, setUserId] = useState<string | null>(null);
  const [coins, setCoins] = useState(100);
  const [hunger, setHunger] = useState(70);
  const [happy, setHappy] = useState(80);
  const [clean, setClean] = useState(60);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [missions, setMissions] = useState<Mission[]>(buildDailyMissions());
  const [missionsDate, setMissionsDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [petName] = useState("Mel");
  const [bounce, setBounce] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [event, setEvent] = useState<RandomEvent | null>(null);
  const [statPulse, setStatPulse] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastEventRef = useRef<number>(Date.now());

  // ---------- AUTH + LOAD ----------
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
      if (session?.user) setTimeout(() => loadCloud(session.user.id), 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (uid) loadCloud(uid);
      else loadLocal();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadLocal = () => {
    try {
      const raw = localStorage.getItem("petlife_save");
      if (raw) applySave(JSON.parse(raw));
    } catch {}
  };

  const loadCloud = async (uid: string) => {
    const { data } = await supabase.from("pet_progress").select("*").eq("user_id", uid).maybeSingle();
    if (data) {
      const today = new Date().toISOString().slice(0, 10);
      const sameDay = (data as any).missions_date === today;
      applySave({
        coins: data.coins,
        hunger: data.hunger,
        happy: data.happy,
        clean: data.clean,
        xp: (data as any).xp ?? 0,
        level: (data as any).level ?? 1,
        missions: sameDay && Array.isArray((data as any).missions) && (data as any).missions.length
          ? (data as any).missions
          : buildDailyMissions(),
        missionsDate: today,
      });
    }
  };

  const applySave = (s: Partial<{ coins: number; hunger: number; happy: number; clean: number; xp: number; level: number; missions: Mission[]; missionsDate: string }>) => {
    if (s.coins != null) setCoins(s.coins);
    if (s.hunger != null) setHunger(s.hunger);
    if (s.happy != null) setHappy(s.happy);
    if (s.clean != null) setClean(s.clean);
    if (s.xp != null) setXp(s.xp);
    if (s.level != null) setLevel(s.level);
    if (s.missions) setMissions(s.missions);
    if (s.missionsDate) setMissionsDate(s.missionsDate);
  };

  // ---------- PERSIST ----------
  const persistRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const save = { coins, hunger, happy, clean, xp, level, missions, missionsDate };
    localStorage.setItem("petlife_save", JSON.stringify(save));
    if (!userId) return;
    if (persistRef.current) clearTimeout(persistRef.current);
    persistRef.current = setTimeout(() => {
      supabase.from("pet_progress").upsert({
        user_id: userId,
        coins, hunger, happy, clean,
        xp, level,
        missions: missions as any,
        missions_date: missionsDate,
      }, { onConflict: "user_id" }).then(() => {});
    }, 800);
  }, [userId, coins, hunger, happy, clean, xp, level, missions, missionsDate]);

  // ---------- AUDIO ----------
  const playSound = useCallback((type: "coin" | "pop" | "yay" | "buy" | "alert") => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      const map: Record<string, [number, number, OscillatorType]> = {
        coin: [880, 0.12, "triangle"],
        pop: [520, 0.08, "sine"],
        yay: [660, 0.18, "triangle"],
        buy: [440, 0.12, "square"],
        alert: [330, 0.2, "sawtooth"],
      };
      const [freq, dur, wave] = map[type];
      o.type = wave; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.start();
      o.stop(ctx.currentTime + dur);
      if (type === "coin" || type === "yay") {
        setTimeout(() => {
          const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
          o2.connect(g2); g2.connect(ctx.destination);
          o2.type = wave; o2.frequency.value = freq * 1.5;
          g2.gain.setValueAtTime(0.0001, ctx.currentTime);
          g2.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
          g2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
          o2.start(); o2.stop(ctx.currentTime + 0.12);
        }, 80);
      }
    } catch {}
  }, []);

  const spawnParticles = (emoji: string, n = 6) => {
    const base = Date.now();
    const next = Array.from({ length: n }, (_, i) => ({ id: base + i, emoji }));
    setParticles((p) => [...p, ...next]);
    setTimeout(() => {
      setParticles((p) => p.filter((x) => !next.find((n2) => n2.id === x.id)));
    }, 1200);
  };

  const triggerBounce = () => { setBounce(true); setTimeout(() => setBounce(false), 400); };

  const pulseStat = (key: string) => {
    setStatPulse(key);
    setTimeout(() => setStatPulse(null), 600);
  };

  // ---------- MISSIONS / XP ----------
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== missionsDate) {
      setMissions(buildDailyMissions());
      setMissionsDate(today);
      toast("🌅 Novo dia! Missões diárias renovadas.");
    }
  }, [missionsDate]);

  const progressMission = (type: Mission["type"]) => {
    setMissions((ms) => ms.map((m) => {
      if (m.type !== type || m.done) return m;
      const np = m.progress + 1;
      const done = np >= m.target;
      if (done) {
        setTimeout(() => {
          setCoins((c) => c + m.reward);
          gainXp(m.xp);
          spawnParticles("⭐", 8);
          playSound("yay");
          toast.success(`Missão concluída: ${m.label}`, { description: `+${m.reward} 🪙 +${m.xp} XP` });
        }, 50);
      }
      return { ...m, progress: Math.min(np, m.target), done };
    }));
  };

  const gainXp = (amount: number) => {
    setXp((cur) => {
      let total = cur + amount;
      let lvl = level;
      while (total >= xpForLevel(lvl)) {
        total -= xpForLevel(lvl);
        lvl += 1;
      }
      if (lvl !== level) {
        setLevel(lvl);
        setCoins((c) => c + 50);
        spawnParticles("🎉", 12);
        playSound("yay");
        toast.success(`Subiu para o nível ${lvl}!`, { description: "+50 🪙 de bônus" });
      }
      return total;
    });
  };

  // ---------- ACTIONS ----------
  const feed = () => {
    setHunger((v) => Math.min(100, v + 10)); pulseStat("hunger");
    setCoins((c) => c + 2);
    spawnParticles("🦴", 4); playSound("pop"); triggerBounce();
    progressMission("feed"); gainXp(3);
  };
  const play = () => {
    setHappy((v) => Math.min(100, v + 10)); pulseStat("happy");
    setCoins((c) => c + 3);
    spawnParticles("❤️", 4); playSound("pop"); triggerBounce();
    progressMission("play"); gainXp(3);
  };
  const wash = () => {
    setClean((v) => Math.min(100, v + 10)); pulseStat("clean");
    spawnParticles("💧", 4); playSound("pop"); triggerBounce();
    progressMission("wash"); gainXp(3);
  };

  const buy = (item: Item) => {
    if (coins < item.price) { playSound("alert"); toast.error("Moedas insuficientes"); return; }
    setCoins((c) => c - item.price);
    if (item.effect.hunger) { setHunger((v) => Math.min(100, v + item.effect.hunger!)); pulseStat("hunger"); }
    if (item.effect.happy) { setHappy((v) => Math.min(100, v + item.effect.happy!)); pulseStat("happy"); }
    if (item.effect.clean) { setClean((v) => Math.min(100, v + item.effect.clean!)); pulseStat("clean"); }
    spawnParticles(item.icon, 6); playSound("buy"); triggerBounce();
    progressMission("buy"); gainXp(5);
    toast.success(`Comprou ${item.name}`, { description: `-${item.price} 🪙` });
  };

  // ---------- RANDOM EVENTS ----------
  useEffect(() => {
    const id = setInterval(() => {
      if (event) return;
      // Trigger every 45-90s after at least 30s
      if (Date.now() - lastEventRef.current < 45000) return;
      if (Math.random() < 0.35) {
        const ev = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
        setEvent(ev);
        lastEventRef.current = Date.now();
        playSound("alert");
      }
    }, 15000);
    return () => clearInterval(id);
  }, [event, playSound]);

  const resolveEvent = (idx: number) => {
    if (!event) return;
    const opt = event.options[idx];
    if (opt.effect.hunger) { setHunger((v) => clamp(v + opt.effect.hunger!)); pulseStat("hunger"); }
    if (opt.effect.happy) { setHappy((v) => clamp(v + opt.effect.happy!)); pulseStat("happy"); }
    if (opt.effect.clean) { setClean((v) => clamp(v + opt.effect.clean!)); pulseStat("clean"); }
    if (opt.effect.coins) { setCoins((c) => Math.max(0, c + opt.effect.coins!)); playSound("coin"); }
    if (opt.effect.xp) gainXp(opt.effect.xp);
    spawnParticles(event.emoji, 5);
    toast(opt.toast);
    setEvent(null);
  };

  // ---------- EXPORT / IMPORT ----------
  const exportSave = () => {
    const save = { version: 1, coins, hunger, happy, clean, xp, level, missions, missionsDate, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(save, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `petlife-save-${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Save exportado!");
  };

  const importSave = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        applySave(parsed);
        toast.success("Save importado!");
        playSound("yay");
      } catch {
        toast.error("Arquivo inválido");
      }
    };
    reader.readAsText(file);
  };

  const signOut = async () => { await supabase.auth.signOut(); toast("Sessão encerrada"); };

  const mood = (happy + hunger + clean) / 3;
  const xpPct = Math.round((xp / xpForLevel(level)) * 100);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
          <h1 className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="h-5 w-5 text-accent" />
            PetLife
          </h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-reward/15 px-2.5 py-1 text-xs font-bold text-reward-foreground">
              <Zap className="h-3.5 w-3.5" /> Nv {level}
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-money/10 px-2.5 py-1 text-money text-sm font-semibold">
              <Coins className="h-4 w-4" />
              <span className="tabular-nums">{coins}</span>
            </div>
            {userId ? (
              <button onClick={signOut} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted" aria-label="Sair">
                <LogOut className="h-4 w-4" />
              </button>
            ) : (
              <Link to="/auth" className="rounded-full p-1.5 text-primary hover:bg-muted" aria-label="Entrar">
                <LogIn className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
        <div className="mx-auto max-w-md px-5 pb-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-gradient-to-r from-reward to-accent transition-all duration-500" style={{ width: `${xpPct}%` }} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pb-28 pt-4">
        {tab === "pet" && (
          <section className="space-y-6">
            <div className="relative rounded-3xl bg-[var(--gradient-pet)] p-8 text-center shadow-[var(--shadow-pet)] overflow-hidden">
              <p className="text-sm font-medium text-pet-foreground/80">Seu pet</p>
              <h2 className="text-2xl font-bold text-pet-foreground">{petName}</h2>
              <div className={`relative mx-auto my-4 flex h-44 w-44 items-center justify-center rounded-full bg-white/40 shadow-inner transition-transform duration-300 ${bounce ? "scale-110 -translate-y-2" : "scale-100"}`}>
                <img src={petImg} alt={petName} width={176} height={176} className="h-40 w-40 object-contain drop-shadow-md" />
                {/* particles */}
                <div className="pointer-events-none absolute inset-0">
                  {particles.map((p, i) => (
                    <span
                      key={p.id}
                      className="absolute left-1/2 top-1/2 text-2xl"
                      style={{
                        animation: "particle 1.1s ease-out forwards",
                        transform: `translate(-50%, -50%) rotate(${(i * 53) % 360}deg)`,
                      }}
                    >
                      {p.emoji}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-sm text-pet-foreground/90">
                {mood > 70 ? "Tô feliz! 💖" : mood > 40 ? "Tô de boa..." : "Preciso de cuidado 🥺"}
              </p>
            </div>

            <div className="space-y-3">
              <Stat icon={<Bone className="h-4 w-4" />} label="Fome" value={hunger} color="reward" pulse={statPulse === "hunger"} />
              <Stat icon={<Heart className="h-4 w-4" />} label="Felicidade" value={happy} color="pet" pulse={statPulse === "happy"} />
              <Stat icon={<Droplet className="h-4 w-4" />} label="Limpeza" value={clean} color="primary" pulse={statPulse === "clean"} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <ActionBtn label="Alimentar" icon="🦴" onClick={feed} />
              <ActionBtn label="Brincar" icon="🎾" onClick={play} />
              <ActionBtn label="Banho" icon="🛁" onClick={wash} />
            </div>
          </section>
        )}

        {tab === "shop" && (
          <section className="space-y-4">
            <div className="rounded-3xl bg-[var(--gradient-money)] p-6 text-money-foreground shadow-[var(--shadow-soft)]">
              <p className="text-sm opacity-90">Saldo disponível</p>
              <p className="text-3xl font-bold tabular-nums">{coins} 🪙</p>
              <p className="mt-1 text-xs opacity-80">Ganhe moedas cuidando do seu pet</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {SHOP_ITEMS.map((item) => {
                const can = coins >= item.price;
                return (
                  <button
                    key={item.id}
                    onClick={() => buy(item)}
                    disabled={!can}
                    className="rounded-2xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] active:scale-95 disabled:opacity-40 disabled:hover:translate-y-0"
                  >
                    <div className="text-3xl">{item.icon}</div>
                    <div className="mt-2 font-semibold">{item.name}</div>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-money/10 px-2 py-0.5 text-xs font-semibold text-money">
                      <Coins className="h-3 w-3" />{item.price}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {tab === "missions" && (
          <section className="space-y-4">
            <div className="rounded-3xl bg-[var(--gradient-reward)] p-6 text-reward-foreground shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                <h2 className="text-lg font-bold">Missões diárias</h2>
              </div>
              <p className="mt-1 text-xs opacity-80">Renovam ao trocar o dia</p>
              <div className="mt-3 flex items-center gap-3 text-sm">
                <div className="rounded-full bg-white/40 px-3 py-1 font-bold">Nv {level}</div>
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-white/30">
                    <div className="h-full bg-foreground/70 transition-all duration-500" style={{ width: `${xpPct}%` }} />
                  </div>
                  <p className="mt-1 text-xs opacity-80">{xp} / {xpForLevel(level)} XP</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {missions.map((m) => (
                <div key={m.id} className={`rounded-2xl border border-border bg-card p-4 ${m.done ? "opacity-60" : ""}`}>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{m.label}</p>
                    <span className="text-xs font-bold text-money">+{m.reward} 🪙 · +{m.xp} XP</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(m.progress / m.target) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{m.progress} / {m.target} {m.done && "✅"}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "life" && (
          <section className="space-y-4">
            <div className="rounded-3xl bg-[var(--gradient-hero)] p-6 text-primary-foreground shadow-[var(--shadow-soft)]">
              <h2 className="text-xl font-bold">Sua vida com {petName}</h2>
              <p className="mt-1 text-sm opacity-90">Resumo e backup</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InfoCard label="Humor geral" value={`${Math.round(mood)}%`} />
              <InfoCard label="Nível" value={`${level} (${xpPct}%)`} />
              <InfoCard label="Moedas" value={`${coins} 🪙`} />
              <InfoCard label="Sync" value={userId ? "☁️ Nuvem" : "💾 Local"} />
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h3 className="font-semibold text-sm">Backup do progresso</h3>
              <p className="text-xs text-muted-foreground">Exporte seu save em JSON ou importe um backup.</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={exportSave} className="flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground active:scale-95">
                  <Download className="h-4 w-4" /> Exportar
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold active:scale-95">
                  <Upload className="h-4 w-4" /> Importar
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) importSave(f); e.target.value = ""; }}
                />
              </div>
            </div>
            {!userId && (
              <Link to="/auth" className="block rounded-2xl border border-dashed border-primary/50 bg-primary/5 p-4 text-center text-sm font-semibold text-primary">
                ☁️ Entre para sincronizar entre dispositivos
              </Link>
            )}
          </section>
        )}
      </main>

      {/* Random event modal */}
      {event && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 px-4 pb-24 sm:items-center sm:pb-0" onClick={() => {}}>
          <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center">
              <div className="text-5xl">{event.emoji}</div>
              <h3 className="mt-2 text-lg font-bold">{event.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
            </div>
            <div className="mt-4 space-y-2">
              {event.options.map((o, i) => (
                <button
                  key={i}
                  onClick={() => resolveEvent(i)}
                  className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground active:scale-95"
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
          <NavBtn active={tab === "pet"} onClick={() => setTab("pet")} icon={<Heart />} label="Pet" />
          <NavBtn active={tab === "shop"} onClick={() => setTab("shop")} icon={<ShoppingBag />} label="Loja" />
          <NavBtn active={tab === "missions"} onClick={() => setTab("missions")} icon={<Trophy />} label="Missões" />
          <NavBtn active={tab === "life"} onClick={() => setTab("life")} icon={<Gamepad2 />} label="Vida" />
        </div>
      </nav>
    </div>
  );
}

function clamp(v: number) { return Math.max(0, Math.min(100, v)); }

function Stat({ icon, label, value, color, pulse }: { icon: React.ReactNode; label: string; value: number; color: "pet" | "reward" | "primary"; pulse?: boolean }) {
  const bg = color === "pet" ? "bg-pet" : color === "reward" ? "bg-reward" : "bg-primary";
  return (
    <div className={`rounded-2xl border border-border bg-card p-3 transition-transform ${pulse ? "scale-[1.03] ring-2 ring-primary/40" : ""}`}>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium">{icon}{label}</span>
        <span className={`tabular-nums text-muted-foreground ${pulse ? "font-bold text-foreground" : ""}`}>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${bg} transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ActionBtn({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-2xl bg-primary p-3 text-primary-foreground shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5 active:scale-90"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-xs font-semibold transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
    >
      <span className={`grid h-6 w-6 place-items-center [&_svg]:h-5 [&_svg]:w-5 ${active ? "scale-110" : ""}`}>{icon}</span>
      {label}
    </button>
  );
}
