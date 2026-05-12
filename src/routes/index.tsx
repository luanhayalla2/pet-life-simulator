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

type Tab = "pet" | "shop" | "missions" | "history" | "life";

interface HistoryEntry {
  id: string;
  action: string;
  label: string;
  hunger_delta: number;
  happy_delta: number;
  clean_delta: number;
  coins_delta: number;
  created_at: string;
}

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
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [pendingImport, setPendingImport] = useState<any | null>(null);
  const [claimedMissions, setClaimedMissions] = useState<Mission[]>([]);
  const [showRewards, setShowRewards] = useState(false);
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

  // ---------- REALTIME SYNC ----------
  const skipNextRealtimeRef = useRef(false);
  useEffect(() => {
    if (!userId) return;
    loadHistory(userId);
    const channel = supabase
      .channel(`pet_progress_${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pet_progress", filter: `user_id=eq.${userId}` },
        (payload) => {
          if (skipNextRealtimeRef.current) { skipNextRealtimeRef.current = false; return; }
          const d: any = payload.new;
          applySave({
            coins: d.coins, hunger: d.hunger, happy: d.happy, clean: d.clean,
            xp: d.xp, level: d.level,
            missions: Array.isArray(d.missions) ? d.missions : undefined,
            missionsDate: d.missions_date,
          });
          toast("☁️ Save sincronizado de outro dispositivo");
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log", filter: `user_id=eq.${userId}` },
        (payload) => setHistory((h) => [payload.new as HistoryEntry, ...h].slice(0, 100))
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const loadHistory = async (uid: string) => {
    const { data } = await supabase
      .from("activity_log")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setHistory(data as HistoryEntry[]);
  };

  const logAction = (action: string, label: string, deltas: { hunger?: number; happy?: number; clean?: number; coins?: number }) => {
    const entry: HistoryEntry = {
      id: `local_${Date.now()}_${Math.random()}`,
      action, label,
      hunger_delta: deltas.hunger ?? 0,
      happy_delta: deltas.happy ?? 0,
      clean_delta: deltas.clean ?? 0,
      coins_delta: deltas.coins ?? 0,
      created_at: new Date().toISOString(),
    };
    setHistory((h) => [entry, ...h].slice(0, 100));
    if (userId) {
      supabase.from("activity_log").insert({
        user_id: userId, action, label,
        hunger_delta: entry.hunger_delta,
        happy_delta: entry.happy_delta,
        clean_delta: entry.clean_delta,
        coins_delta: entry.coins_delta,
      }).then(() => {});
    }
  };

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
      skipNextRealtimeRef.current = true;
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
      const updated = { ...m, progress: Math.min(np, m.target), done };
      if (done) {
        setTimeout(() => {
          setCoins((c) => c + m.reward);
          gainXp(m.xp);
          spawnParticles("⭐", 8);
          playSound("yay");
          setClaimedMissions((cm) => [{ ...updated }, ...cm].slice(0, 50));
          toast.success(`Missão concluída: ${m.label}`, { description: `+${m.reward} 🪙 +${m.xp} XP` });
        }, 50);
      }
      return updated;
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
    logAction("feed", "Alimentou o pet", { hunger: 10, coins: 2 });
  };
  const play = () => {
    setHappy((v) => Math.min(100, v + 10)); pulseStat("happy");
    setCoins((c) => c + 3);
    spawnParticles("❤️", 4); playSound("pop"); triggerBounce();
    progressMission("play"); gainXp(3);
    logAction("play", "Brincou com o pet", { happy: 10, coins: 3 });
  };
  const wash = () => {
    setClean((v) => Math.min(100, v + 10)); pulseStat("clean");
    spawnParticles("💧", 4); playSound("pop"); triggerBounce();
    progressMission("wash"); gainXp(3);
    logAction("wash", "Lavou o pet", { clean: 10 });
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
    logAction("buy", `Comprou ${item.name} ${item.icon}`, {
      hunger: item.effect.hunger ?? 0,
      happy: item.effect.happy ?? 0,
      clean: item.effect.clean ?? 0,
      coins: -item.price,
    });
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
    const deltas = { hunger: 0, happy: 0, clean: 0, coins: 0 };
    if (opt.effect.hunger) { setHunger((v) => clamp(v + opt.effect.hunger!)); pulseStat("hunger"); deltas.hunger = opt.effect.hunger; }
    if (opt.effect.happy) { setHappy((v) => clamp(v + opt.effect.happy!)); pulseStat("happy"); deltas.happy = opt.effect.happy; }
    if (opt.effect.clean) { setClean((v) => clamp(v + opt.effect.clean!)); pulseStat("clean"); deltas.clean = opt.effect.clean; }
    if (opt.effect.coins) { setCoins((c) => Math.max(0, c + opt.effect.coins!)); playSound("coin"); deltas.coins = opt.effect.coins; }
    if (opt.effect.xp) gainXp(opt.effect.xp);
    spawnParticles(event.emoji, 5);
    toast(opt.toast);
    logAction("event", `${event.emoji} ${event.title} → ${opt.label}`, deltas);
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

  const validateSave = (s: any): string | null => {
    if (!s || typeof s !== "object") return "Arquivo não é um save válido.";
    const isPct = (v: any) => typeof v === "number" && v >= 0 && v <= 100;
    const isNonNeg = (v: any) => typeof v === "number" && v >= 0 && Number.isFinite(v);
    if (!isPct(s.hunger)) return "Campo 'hunger' inválido (0-100).";
    if (!isPct(s.happy)) return "Campo 'happy' inválido (0-100).";
    if (!isPct(s.clean)) return "Campo 'clean' inválido (0-100).";
    if (!isNonNeg(s.coins)) return "Campo 'coins' inválido.";
    if (!isNonNeg(s.xp)) return "Campo 'xp' inválido.";
    if (!isNonNeg(s.level) || s.level < 1) return "Campo 'level' inválido.";
    if (s.missions && !Array.isArray(s.missions)) return "Campo 'missions' inválido.";
    return null;
  };

  const importSave = (file: File) => {
    if (file.size > 256 * 1024) { toast.error("Arquivo muito grande"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const err = validateSave(parsed);
        if (err) { toast.error("Save inválido", { description: err }); return; }
        setPendingImport(parsed);
      } catch {
        toast.error("Arquivo JSON inválido");
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    applySave(pendingImport);
    logAction("import", "Importou save de backup", { coins: (pendingImport.coins ?? 0) - coins });
    toast.success("Save importado!");
    playSound("yay");
    setPendingImport(null);
  };

  const signOut = async () => { await supabase.auth.signOut(); toast("Sessão encerrada"); };

  const mood = (happy + hunger + clean) / 3;
  const xpPct = Math.round((xp / xpForLevel(level)) * 100);

  return (
    <div className="min-h-screen bg-app text-foreground relative overflow-hidden">
      {/* Floating decorative shapes */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <span className="absolute -top-10 -left-8 h-40 w-40 rounded-full bg-[var(--gradient-pet)] opacity-30 blur-2xl animate-float" />
        <span className="absolute top-1/3 -right-10 h-48 w-48 rounded-full bg-[var(--gradient-hero)] opacity-25 blur-2xl animate-float" style={{ animationDelay: "1.2s" }} />
        <span className="absolute bottom-10 left-1/4 h-36 w-36 rounded-full bg-[var(--gradient-reward)] opacity-25 blur-2xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <h1 className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--gradient-hero)] shadow-[var(--shadow-soft)]">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            <span className="bg-[var(--gradient-hero)] bg-clip-text text-transparent">PetLife</span>
          </h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-[var(--gradient-reward)] px-3 py-1.5 text-xs font-extrabold text-reward-foreground shadow-[var(--shadow-reward)]">
              <Zap className="h-3.5 w-3.5 fill-current" /> Nv {level}
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-[var(--gradient-money)] px-3 py-1.5 text-money-foreground text-sm font-extrabold shadow-[var(--shadow-money)]">
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
        <div className="mx-auto max-w-md px-4 pb-2.5">
          <div className="relative h-2 overflow-hidden rounded-full bg-muted/80 ring-1 ring-white/60">
            <div className="h-full bg-[var(--gradient-reward)] transition-all duration-500" style={{ width: `${xpPct}%` }} />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ backgroundSize: "200% 100%", animation: "shimmer 2.5s linear infinite" }} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pb-28 pt-4">
        {tab === "pet" && (
          <section className="space-y-6">
            <div className="relative overflow-hidden rounded-[2rem] bg-[var(--gradient-pet)] p-6 text-center shadow-[var(--shadow-pet)] ring-1 ring-white/50">
              {/* Sunburst aura */}
              <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="h-[120%] w-[120%] animate-spin-slow opacity-60"
                     style={{ background: "conic-gradient(from 0deg, transparent 0 30deg, rgba(255,255,255,.45) 35deg 45deg, transparent 50deg 90deg, rgba(255,255,255,.35) 95deg 105deg, transparent 110deg 150deg, rgba(255,255,255,.4) 155deg 165deg, transparent 170deg 210deg, rgba(255,255,255,.35) 215deg 225deg, transparent 230deg 270deg, rgba(255,255,255,.4) 275deg 285deg, transparent 290deg 330deg, rgba(255,255,255,.35) 335deg 345deg, transparent 350deg 360deg)" }} />
              </div>
              <div className="relative">
                <p className="text-xs font-bold uppercase tracking-widest text-pet-foreground/80">Seu pet</p>
                <h2 className="text-3xl font-extrabold text-pet-foreground drop-shadow-sm">{petName}</h2>
                <div className={`relative mx-auto my-4 grid h-48 w-48 place-items-center rounded-full bg-white/60 ring-4 ring-white/80 shadow-[var(--shadow-glow)] transition-transform duration-300 ${bounce ? "scale-110 -translate-y-2" : "scale-100"}`}>
                  <div aria-hidden className="absolute inset-0 rounded-full animate-pulse-ring" />
                  <img src={petImg} alt={petName} width={176} height={176} className="h-44 w-44 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)]" />
                  {/* particles */}
                  <div className="pointer-events-none absolute inset-0">
                    {particles.map((p, i) => (
                      <span
                        key={p.id}
                        className="absolute left-1/2 top-1/2 text-2xl drop-shadow"
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
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-sm font-bold text-foreground shadow-sm">
                  {mood > 70 ? "💖 Tô feliz!" : mood > 40 ? "🙂 Tô de boa..." : "🥺 Preciso de cuidado"}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Stat icon={<Bone className="h-4 w-4" />} label="Fome" value={hunger} color="reward" pulse={statPulse === "hunger"} />
              <Stat icon={<Heart className="h-4 w-4" />} label="Felicidade" value={happy} color="pet" pulse={statPulse === "happy"} />
              <Stat icon={<Droplet className="h-4 w-4" />} label="Limpeza" value={clean} color="primary" pulse={statPulse === "clean"} />
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <ActionBtn
                label="Alimentar"
                icon="🦴"
                onClick={feed}
                variant="reward"
                loading={loadingAction === "feed"}
                disabled={!!loadingAction || hunger >= 100}
              />
              <ActionBtn
                label="Brincar"
                icon="🎾"
                onClick={play}
                variant="pet"
                loading={loadingAction === "play"}
                disabled={!!loadingAction || happy >= 100 || hunger <= 0}
              />
              <ActionBtn
                label="Banho"
                icon="🛁"
                onClick={wash}
                variant="primary"
                loading={loadingAction === "wash"}
                disabled={!!loadingAction || clean >= 100}
              />
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
                    className="group relative overflow-hidden rounded-2xl border border-white/60 bg-card/90 p-4 text-left ring-1 ring-black/5 backdrop-blur transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-pop)] active:scale-95 disabled:opacity-40 disabled:hover:translate-y-0"
                  >
                    <span className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-[var(--gradient-reward)] opacity-30 blur-xl transition-opacity group-hover:opacity-60" />
                    <div className="relative text-4xl drop-shadow transition-transform group-hover:scale-110">{item.icon}</div>
                    <div className="relative mt-2 font-bold">{item.name}</div>
                    <div className="relative mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--gradient-money)] px-2.5 py-0.5 text-xs font-extrabold text-money-foreground shadow-[var(--shadow-money)]">
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  <h2 className="text-lg font-bold">Missões diárias</h2>
                </div>
                <button
                  onClick={() => setShowRewards(true)}
                  className="flex items-center gap-1 rounded-full bg-white/40 px-3 py-1 text-xs font-bold active:scale-95"
                >
                  <Gift className="h-3.5 w-3.5" /> Recompensas
                </button>
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
              <div className="mt-3 text-xs opacity-90">
                {missions.filter((m) => m.done).length} / {missions.length} concluídas hoje
              </div>
            </div>
            <div className="space-y-2">
              {missions.map((m) => {
                const pct = (m.progress / m.target) * 100;
                return (
                  <div
                    key={m.id}
                    className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${m.done ? "border-money/40 bg-money/5" : "border-border bg-card"}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className={`font-semibold ${m.done ? "text-money" : ""}`}>
                        {m.done && "✅ "}{m.label}
                      </p>
                      <span className="text-xs font-bold text-money">+{m.reward} 🪙 · +{m.xp} XP</span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full transition-all duration-500 ${m.done ? "bg-money" : "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground tabular-nums">{m.progress} / {m.target}</span>
                      {m.done && <span className="font-semibold text-money">Recompensa recebida 🎁</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {tab === "history" && (
          <section className="space-y-4">
            <div className="rounded-3xl bg-[var(--gradient-hero)] p-6 text-primary-foreground shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-2">
                <HistoryIcon className="h-5 w-5" />
                <h2 className="text-lg font-bold">Histórico</h2>
              </div>
              <p className="mt-1 text-sm opacity-90">Tudo o que você fez com {petName}</p>
            </div>
            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Nenhuma atividade ainda. Comece a cuidar do seu pet!
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <HistoryRow key={h.id} entry={h} />
                ))}
              </div>
            )}
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

      {/* Import confirmation modal */}
      {pendingImport && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-3 flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 shrink-0 text-reward" />
              <div>
                <h3 className="font-bold">Confirmar importação</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Isso vai sobrescrever seu progresso atual. Não tem como desfazer.
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Moedas</span><span className="font-semibold">{coins} → {pendingImport.coins}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Nível</span><span className="font-semibold">{level} → {pendingImport.level}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fome</span><span className="font-semibold">{hunger} → {pendingImport.hunger}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Felicidade</span><span className="font-semibold">{happy} → {pendingImport.happy}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Limpeza</span><span className="font-semibold">{clean} → {pendingImport.clean}</span></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setPendingImport(null)} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold active:scale-95">
                Cancelar
              </button>
              <button onClick={confirmImport} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground active:scale-95">
                Sobrescrever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rewards review modal */}
      {showRewards && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-4" onClick={() => setShowRewards(false)}>
          <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2">
              <Gift className="h-5 w-5 text-reward" />
              <h3 className="font-bold">Recompensas ganhas</h3>
            </div>
            {claimedMissions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma missão concluída ainda. Continue cuidando do seu pet!</p>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {claimedMissions.map((m, i) => (
                  <div key={`${m.id}_${i}`} className="flex items-center justify-between rounded-xl border border-money/30 bg-money/5 p-3 text-sm">
                    <span className="font-semibold">✅ {m.label}</span>
                    <span className="text-xs font-bold text-money">+{m.reward} 🪙 · +{m.xp} XP</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowRewards(false)} className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground active:scale-95">
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-around px-1 py-2">
          <NavBtn active={tab === "pet"} onClick={() => setTab("pet")} icon={<Heart />} label="Pet" />
          <NavBtn active={tab === "shop"} onClick={() => setTab("shop")} icon={<ShoppingBag />} label="Loja" />
          <NavBtn active={tab === "missions"} onClick={() => setTab("missions")} icon={<Trophy />} label="Missões" />
          <NavBtn active={tab === "history"} onClick={() => setTab("history")} icon={<HistoryIcon />} label="Histórico" />
          <NavBtn active={tab === "life"} onClick={() => setTab("life")} icon={<Gamepad2 />} label="Vida" />
        </div>
      </nav>
    </div>
  );
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const d = new Date(entry.created_at);
  const date = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const deltas: { label: string; value: number; cls: string }[] = [
    { label: "🦴", value: entry.hunger_delta, cls: "text-reward" },
    { label: "❤️", value: entry.happy_delta, cls: "text-pet" },
    { label: "💧", value: entry.clean_delta, cls: "text-primary" },
    { label: "🪙", value: entry.coins_delta, cls: "text-money" },
  ].filter((x) => x.value !== 0);
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{entry.label}</p>
        <span className="text-[11px] text-muted-foreground tabular-nums">{date} · {time}</span>
      </div>
      {deltas.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
          {deltas.map((x, i) => (
            <span key={i} className={`rounded-full bg-muted px-2 py-0.5 font-semibold ${x.cls}`}>
              {x.label} {x.value > 0 ? `+${x.value}` : x.value}
            </span>
          ))}
        </div>
      )}
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

function ActionBtn({
  label,
  icon,
  onClick,
  variant = "primary",
  disabled = false,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  variant?: "primary" | "pet" | "reward";
  disabled?: boolean;
}) {
  const styles: Record<string, string> = {
    primary:
      "bg-[var(--gradient-hero)] shadow-[var(--shadow-pop)] hover:shadow-[0_18px_0_-4px_oklch(0.55_0.16_254/0.45),0_24px_46px_-10px_oklch(0.65_0.16_254/0.55)] active:shadow-[0_4px_0_-2px_oklch(0.55_0.16_254/0.5)]",
    pet:
      "bg-[var(--gradient-pet)] shadow-[var(--shadow-pet)] hover:shadow-[0_22px_46px_-10px_oklch(0.78_0.18_340/0.7)] active:shadow-[0_6px_14px_-4px_oklch(0.78_0.18_340/0.55)]",
    reward:
      "bg-[var(--gradient-reward)] shadow-[var(--shadow-reward)] hover:shadow-[0_18px_0_-4px_oklch(0.65_0.18_70/0.5),0_24px_46px_-10px_oklch(0.84_0.16_80/0.65)] active:shadow-[0_4px_0_-2px_oklch(0.65_0.18_70/0.55)]",
  };
  // Texto na mesma cor do ícone, com contraste reforçado para boa legibilidade
  const labelColor: Record<string, string> = {
    primary: "text-[oklch(0.32_0.16_254)]", // azul profundo (🛁)
    pet: "text-[oklch(0.36_0.18_350)]",     // rosa escuro (🎾)
    reward: "text-[oklch(0.34_0.14_60)]",   // âmbar escuro (🦴)
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex min-h-[88px] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl ${styles[variant]} px-2 py-3 ring-1 ring-white/60 transition-all duration-200 hover:-translate-y-1 hover:ring-2 hover:ring-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:translate-y-0.5 active:scale-95 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:saturate-50 disabled:shadow-none`}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-white/30 group-hover:bg-white/40 group-active:bg-white/20" />
      <span className="relative text-3xl drop-shadow transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6 group-active:scale-90 group-active:rotate-0">
        {icon}
      </span>
      <span
        className={`relative w-full text-center text-[13px] font-extrabold uppercase leading-tight tracking-wide drop-shadow-[0_1px_0_rgba(255,255,255,0.6)] ${labelColor[variant]}`}
      >
        {label}
      </span>
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
      className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-extrabold uppercase tracking-wide transition-all ${active ? "text-primary-foreground" : "text-muted-foreground"}`}
    >
      {active && (
        <span className="absolute inset-x-1 inset-y-1 -z-0 rounded-2xl bg-[var(--gradient-hero)] shadow-[var(--shadow-soft)] animate-pop-in" />
      )}
      <span className={`relative z-10 grid h-7 w-7 place-items-center [&_svg]:h-5 [&_svg]:w-5 transition-transform ${active ? "scale-110" : ""}`}>{icon}</span>
      <span className="relative z-10">{label}</span>
    </button>
  );
}
