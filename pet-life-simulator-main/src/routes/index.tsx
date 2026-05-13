import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, useCallback } from "react";
import { Heart, Coins, ShoppingBag, Sparkles, Bone, Gamepad2, Droplet, LogIn, LogOut, Trophy, Download, Upload, Zap, History as HistoryIcon, Gift, AlertTriangle, Shirt, Home, MessageCircle, Send, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import petMelImg from "@/assets/pet-mel.png";


import petLuaImg from "@/assets/pet-lua.png";


import petPipoImg from "@/assets/pet-pipo.png";

import { supabase } from "@/integrations/supabase/client";
import { talkToPet } from "@/lib/pet-chat.functions";
import { MiniGameOverlay } from "@/components/MiniGameOverlay";
import { translations, Language } from "@/lib/i18n";
import { Settings as SettingsIcon, Bell, BellOff, Globe } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "PetLife — Simulador de Pet, Loja e Vida" },
      { name: "description", content: "Cuide do seu pet, gerencie dinheiro, complete missões e viva eventos aleatórios neste simulador fofo." },
    ],
  }),
});

type Tab = "pet" | "shop" | "closet" | "toys" | "activities" | "home" | "chat" | "missions" | "history" | "life" | "settings" | "achievements" | "inventory";

interface Trick {
  id: string;
  label: string;
  icon: string;
  minFriendship: number;
  xp: number;
  animation: string;
}

const TRICKS: Trick[] = [
  { id: "paw", label: "Dar a Pata", icon: "🐾", minFriendship: 10, xp: 15, animation: "animate-trick-paw" },
  { id: "spin", label: "Girar", icon: "🔄", minFriendship: 25, xp: 25, animation: "animate-trick-spin" },
  { id: "roll", label: "Rolar", icon: "🌀", minFriendship: 45, xp: 40, animation: "animate-trick-roll" },
];

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
  description?: string;
}

const SHOP_ITEMS: Item[] = [
  { id: "bone", name: "Ossinho", icon: "🦴", price: 10, effect: { hunger: 25 } },
  { id: "ball", name: "Bolinha", icon: "🎾", price: 15, effect: { happy: 30 } },
  { id: "bath", name: "Banho", icon: "🛁", price: 20, effect: { clean: 40 } },
  { id: "treat", name: "Petisco", icon: "🍪", price: 25, effect: { hunger: 15, happy: 15 } },
  { id: "toy", name: "Brinquedo", icon: "🧸", price: 40, effect: { happy: 50 } },
  { id: "spa", name: "Spa", icon: "✨", price: 60, effect: { clean: 60, happy: 20 } },
  { id: "auto_feeder", name: "Alimentador Auto", icon: "🤖", price: 200, effect: {}, description: "Reduz fome mais devagar" },
  { id: "luxury_bed", name: "Cama de Luxo", icon: "🛏️", price: 250, effect: {}, description: "Recupera energia extra" },
  { id: "golden_brush", name: "Escova de Ouro", icon: "✨", price: 180, effect: {}, description: "Limpeza dura mais" },
];

type Rarity = "Comum" | "Raro" | "Épico" | "Lendário" | "Evento especial ✨";
type ClothingCategory = "Camisas" | "Bonés" | "Óculos" | "Sapatos" | "Acessórios" | "Itens raros";

interface ClothingItem {
  id: string;
  name: string;
  icon: string;
  category: ClothingCategory;
  rarity: Rarity;
  price: number;
  buff: string;
  colors: string[];
  unlockLevel?: number;
}

const CLOTHING_ITEMS: ClothingItem[] = [
  { id: "sport_tee", name: "Roupa esportiva", icon: "👕", category: "Camisas", rarity: "Comum", price: 0, buff: "+energia", colors: ["Azul", "Rosa", "Verde"] },
  { id: "happy_cap", name: "Boné feliz", icon: "🧢", category: "Bonés", rarity: "Raro", price: 35, buff: "+felicidade", colors: ["Amarelo", "Azul", "Vermelho"] },
  { id: "star_glasses", name: "Óculos estrela", icon: "👓", category: "Óculos", rarity: "Épico", price: 70, buff: "+XP", colors: ["Dourado", "Roxo", "Preto"], unlockLevel: 2 },
  { id: "speed_shoes", name: "Tênis veloz", icon: "👟", category: "Sapatos", rarity: "Raro", price: 55, buff: "+mini-games", colors: ["Branco", "Neon", "Azul"] },
  { id: "bow_party", name: "Laço festa", icon: "🎀", category: "Acessórios", rarity: "Evento especial ✨", price: 95, buff: "+moedas", colors: ["Rosa", "Lilás", "Dourado"], unlockLevel: 3 },
  { id: "royal_crown", name: "Coroa real", icon: "👑", category: "Itens raros", rarity: "Lendário", price: 150, buff: "brilho especial", colors: ["Ouro", "Prata", "Safira"], unlockLevel: 4 },
];

interface ToyItem {
  id: string;
  name: string;
  icon: string;
  price: number;
  effect: string;
  happy: number;
  xp: number;
  coins: number;
  animation?: string;
}

const TOY_ITEMS: ToyItem[] = [
  { id: "ball", name: "Bola", icon: "🎾", price: 0, effect: "animação de pulo", happy: 12, xp: 5, coins: 2, animation: "animate-pet-jump" },
  { id: "teddy", name: "Ursinho", icon: "🧸", price: 35, effect: "carinho extra", happy: 16, xp: 4, coins: 1, animation: "animate-toy-bounce" },
  { id: "yoyo", name: "Io-iô", icon: "🪀", price: 45, effect: "combo de XP", happy: 10, xp: 9, coins: 2, animation: "animate-pet-jump" },
  { id: "car", name: "Carrinho", icon: "🚗", price: 60, effect: "corrida rápida", happy: 13, xp: 7, coins: 5, animation: "animate-pet-run" },
  { id: "chew", name: "Mordedor", icon: "🦴", price: 25, effect: "acalma o pet", happy: 9, xp: 3, coins: 1, animation: "animate-pet-sleep" },
  { id: "ufo", name: "Brinquedo futurista", icon: "🛸", price: 120, effect: "partículas sci-fi", happy: 20, xp: 12, coins: 8, animation: "animate-toy-bounce" },
];

const ACTIVITY_ITEMS = [
  { id: "ball", name: "Jogar bola", icon: "🎾", mini: "pegar moedas", hunger: -6, happy: 18, clean: -4, xp: 8, coins: 5 },
  { id: "run", name: "Correr", icon: "🏃", mini: "corrida", hunger: -10, happy: 14, clean: -6, xp: 10, coins: 4 },
  { id: "sleep", name: "Dormir", icon: "💤", mini: "recuperação", hunger: -2, happy: 8, clean: 0, xp: 4, coins: 0 },
  { id: "eat", name: "Comer", icon: "🍖", mini: "receitas", hunger: 22, happy: 5, clean: -2, xp: 5, coins: -8 },
  { id: "bath", name: "Tomar banho", icon: "🚿", mini: "memória", hunger: 0, happy: 4, clean: 24, xp: 6, coins: -6 },
  { id: "photo", name: "Tirar foto", icon: "📸", mini: "moda", hunger: 0, happy: 12, clean: 0, xp: 7, coins: 6 },
  { id: "dance", name: "Dançar", icon: "🎵", mini: "parkour", hunger: -8, happy: 20, clean: -3, xp: 12, coins: 7 },
];

const HOME_ZONES = [
  { name: "Quarto", icon: "🛏️", details: "cama, TV, brinquedos e decoração" },
  { name: "Jardim", icon: "🌳", details: "árvores, piscina, céu animado e brinquedos externos" },
  { name: "Cozinha", icon: "🍳", details: "alimentar pet e receitas especiais" },
  { name: "Sala Gamer", icon: "🎮", details: "mini-games, computador e console" },
];

interface ChatMessage { id: string; role: "user" | "pet"; content: string; }

const PET_DATA = [
  { 
    id: "mel", 
    name: "Mel", 
    type: "Cachorro", 
    icon: "🐶",
    stages: {
      baby: petMelImg,
      young: petMelImg,
      adult: petMelImg
    }
  },
  { 
    id: "lua", 
    name: "Lua", 
    type: "Gato", 
    icon: "🐱",
    stages: {
      baby: petLuaImg,
      young: petLuaImg,
      adult: petLuaImg
    }
  },
  { 
    id: "pipo", 
    name: "Pipo", 
    type: "Coelho", 
    icon: "🐰",
    stages: {
      baby: petPipoImg,
      young: petPipoImg,
      adult: petPipoImg
    }
  },
  { 
    id: "krysto", 
    name: "Krysto", 
    type: "Dragão", 
    icon: "🐲",
    theme: "crystal",
    stages: { baby: null, young: null, adult: null }
  },
  { 
    id: "stelar", 
    name: "Stelar", 
    type: "Unicórnio", 
    icon: "🦄",
    theme: "crystal",
    stages: { baby: null, young: null, adult: null }
  },
  { 
    id: "glacy", 
    name: "Glacy", 
    type: "Panda", 
    icon: "🐼",
    theme: "crystal",
    stages: { baby: null, young: null, adult: null }
  },
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

interface Achievement {
  id: string;
  label: string;
  desc: string;
  icon: string;
  condition: (state: any) => boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: "rich", label: "Rico!", desc: "Acumule 500 moedas", icon: "💰", condition: (s) => s.coins >= 500 },
  { id: "best_friend", label: "Melhor Amigo", desc: "Atingir amizade nível 50", icon: "💖", condition: (s) => Object.values(s.friendship).some((v: any) => v >= 50) },
  { id: "clean_freak", label: "Mestre da Higiene", desc: "Dar 10 banhos", icon: "🛁", condition: (s) => s.history.filter((h: any) => h.action === "wash").length >= 10 },
  { id: "pro_gamer", label: "Pro Gamer", desc: "Completar 15 mini-games", icon: "🎮", condition: (s) => s.history.filter((h: any) => h.action === "activity").length >= 15 },
  { id: "level_10", label: "Mestre Pet", desc: "Chegar ao nível 10", icon: "🏆", condition: (s) => s.level >= 10 },
];

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
  const [selectedPetId, setSelectedPetId] = useState("mel");
  const currentPet = PET_DATA.find(p => p.id === selectedPetId) || PET_DATA[0];
  const petName = currentPet.name;
  const petIcon = currentPet.icon;
  const petTheme = (currentPet as any).theme || "default";
  
  // Dynamic Pet Image based on level
  const getPetImg = () => {
    const stages = currentPet.stages;
    if (!stages) return null;
    let img = null;
    if (level >= 11) img = stages.adult;
    else if (level >= 6) img = stages.young;
    else img = stages.baby;
    return img || null;
  };
  const petImg = getPetImg();
  const [bounce, setBounce] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [event, setEvent] = useState<RandomEvent | null>(null);
  const [statPulse, setStatPulse] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [pendingImport, setPendingImport] = useState<any | null>(null);
  const [claimedMissions, setClaimedMissions] = useState<Mission[]>([]);
  const [showRewards, setShowRewards] = useState(false);
  const [loadingAction, setLoadingAction] = useState<null | "feed" | "play" | "wash">(null);
  const [ownedClothes, setOwnedClothes] = useState<string[]>(["sport_tee"]);
  const [equippedClothing, setEquippedClothing] = useState("sport_tee");
  const [selectedColor, setSelectedColor] = useState("Azul");
  const [ownedToys, setOwnedToys] = useState<string[]>(["ball"]);
  const [selectedZone, setSelectedZone] = useState(HOME_ZONES[0]);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: "hello", role: "pet", content: "Oi! Eu sou a Mel. Bora brincar ou decorar minha casinha? 🐾" },
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [petAction, setPetAction] = useState<"idle" | "walking" | "sleeping" | "running" | "jumping" | "trick_paw" | "trick_spin" | "trick_roll">("idle");
  const [toyAnimation, setToyAnimation] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("pt");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [friendship, setFriendship] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    PET_DATA.forEach(p => initial[p.id] = 0);
    return initial;
  });
  const [ownedPassives, setOwnedPassives] = useState<string[]>([]);
  const [consumables, setConsumables] = useState<Record<string, number>>({});
  const t = translations[language];

  const askPet = useServerFn(talkToPet);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastEventRef = useRef<number>(Date.now());
  const [activeMiniGame, setActiveMiniGame] = useState<any>(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [weather, setWeather] = useState<"sunny" | "rainy" | "snowy">("sunny");
  const [timeOfDay, setTimeOfDay] = useState<"day" | "sunset" | "night">("day");
  const notificationCooldownRef = useRef<Record<string, number>>({});

  // ---------- DECAY LOGIC WITH PASSIVES ----------
  useEffect(() => {
    const id = setInterval(() => {
      const hasAutoFeeder = ownedPassives.includes("auto_feeder");
      const hasLuxuryBed = ownedPassives.includes("luxury_bed");
      const hasGoldenBrush = ownedPassives.includes("golden_brush");

      setHunger(v => Math.max(0, v - (hasAutoFeeder ? 0.3 : 0.8)));
      setHappy(v => Math.max(0, v - 0.5));
      setClean(v => Math.max(0, v - (hasGoldenBrush ? 0.2 : 0.6)));
      setXp(v => {
        if (hasLuxuryBed && v < xpForLevel(level)) {
           // Small XP boost while resting/existing
           return v + 0.1;
        }
        return v;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [ownedPassives, level]);

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

  const applySave = (s: Partial<{ coins: number; hunger: number; happy: number; clean: number; xp: number; level: number; missions: Mission[]; missionsDate: string; language: Language; notificationsEnabled: boolean }>) => {
    if (s.coins != null) setCoins(s.coins);
    if (s.hunger != null) setHunger(s.hunger);
    if (s.happy != null) setHappy(s.happy);
    if (s.clean != null) setClean(s.clean);
    if (s.xp != null) setXp(s.xp);
    if (s.level != null) setLevel(s.level);
    if (s.missions) setMissions(s.missions);
    if (s.missionsDate) setMissionsDate(s.missionsDate);
    if (s.language) setLanguage(s.language);
    if (s.notificationsEnabled !== undefined) setNotificationsEnabled(s.notificationsEnabled);
    if (s.friendship) setFriendship(s.friendship);
    if (s.ownedPassives) setOwnedPassives(s.ownedPassives);
    if (s.unlockedAchievements) setUnlockedAchievements(s.unlockedAchievements);
  };

  // ---------- PERSIST ----------
  const persistRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const save = { coins, hunger, happy, clean, xp, level, missions, missionsDate, language, notificationsEnabled, friendship, ownedPassives, unlockedAchievements };
    localStorage.setItem("petlife_save", JSON.stringify(save));
    localStorage.setItem("petlife_style", JSON.stringify({ ownedClothes, equippedClothing, selectedColor, ownedToys, selectedPetId, language, notificationsEnabled, friendship, ownedPassives, unlockedAchievements }));
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
        language,
        notifications_enabled: notificationsEnabled,
        friendship: friendship as any,
        owned_passives: ownedPassives,
        unlocked_achievements: unlockedAchievements,
      }, { onConflict: "user_id" }).then(() => {});
    }, 800);
  }, [userId, coins, hunger, happy, clean, xp, level, missions, missionsDate, ownedClothes, equippedClothing, selectedColor, ownedToys, language, notificationsEnabled, friendship, ownedPassives, unlockedAchievements]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("petlife_style");
      if (!raw) return;
      const style = JSON.parse(raw);
      if (Array.isArray(style.ownedClothes)) setOwnedClothes(style.ownedClothes);
      if (typeof style.equippedClothing === "string") setEquippedClothing(style.equippedClothing);
      if (typeof style.selectedColor === "string") setSelectedColor(style.selectedColor);
      if (Array.isArray(style.ownedToys)) setOwnedToys(style.ownedToys);
      if (typeof style.selectedPetId === "string") setSelectedPetId(style.selectedPetId);
    } catch {}
  }, []);

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
  const withLoading = (key: "feed" | "play" | "wash", fn: () => void, ms = 450) => {
    if (loadingAction) return;
    setLoadingAction(key);
    try { fn(); } finally {
      setTimeout(() => setLoadingAction((cur) => (cur === key ? null : cur)), ms);
    }
  };
  const feed = () => withLoading("feed", () => {
    setHunger((v) => Math.min(100, v + 10)); pulseStat("hunger");
    setCoins((c) => c + 2);
    spawnParticles("🦴", 4); playSound("pop"); triggerBounce();
    progressMission("feed"); gainXp(3);
    setFriendship(prev => ({ ...prev, [selectedPetId]: Math.min(100, (prev[selectedPetId] || 0) + 0.5) }));
    logAction("feed", "Alimentou o pet", { hunger: 10, coins: 2 });
  });
  const play = () => withLoading("play", () => {
    setHappy((v) => Math.min(100, v + 10)); pulseStat("happy");
    setCoins((c) => c + 3);
    spawnParticles("❤️", 4); playSound("pop"); triggerBounce();
    progressMission("play"); gainXp(3);
    setFriendship(prev => ({ ...prev, [selectedPetId]: Math.min(100, (prev[selectedPetId] || 0) + 2) }));
    logAction("play", "Brincou com o pet", { happy: 10, coins: 3 });
  });
  const wash = () => withLoading("wash", () => {
    setClean((v) => Math.min(100, v + 10)); pulseStat("clean");
    spawnParticles("💧", 4); playSound("pop"); triggerBounce();
    progressMission("wash"); gainXp(3);
    setFriendship(prev => ({ ...prev, [selectedPetId]: Math.min(100, (prev[selectedPetId] || 0) + 1) }));
    logAction("wash", "Lavou o pet", { clean: 10 });
    checkAchievements();
  });

  const checkAchievements = () => {
    const state = { coins, level, friendship, history };
    ACHIEVEMENTS.forEach(ach => {
      if (!unlockedAchievements.includes(ach.id) && ach.condition(state)) {
        setUnlockedAchievements(prev => [...prev, ach.id]);
        spawnParticles("🎖️", 10);
        playSound("yay");
        toast.success(language === "pt" ? `Conquista: ${ach.label}` : `Achievement: ${ach.label}`, {
          description: ach.desc
        });
      }
    });
  };

  useEffect(() => {
     const id = setInterval(() => {
       const hour = new Date().getHours();
       if (hour >= 18 || hour < 6) setTimeOfDay("night");
       else if (hour >= 16) setTimeOfDay("sunset");
       else setTimeOfDay("day");

       // Random weather every hour (simulated)
       if (Math.random() < 0.1) {
         const types: ("sunny" | "rainy" | "snowy")[] = ["sunny", "rainy", "snowy"];
         setWeather(types[Math.floor(Math.random() * types.length)]);
       }
     }, 60000);
     return () => clearInterval(id);
  }, []);

  const performTrick = (trick: Trick) => {
    if (loadingAction || petAction !== "idle") return;
    if ((friendship[selectedPetId] || 0) < trick.minFriendship) {
      toast.error(language === "pt" ? `Precisa de amizade nível ${trick.minFriendship}` : `Need friendship level ${trick.minFriendship}`);
      return;
    }
    setPetAction(`trick_${trick.id}` as any);
    spawnParticles("✨", 5);
    playSound("yay");
    gainXp(trick.xp);
    setTimeout(() => setPetAction("idle"), 1000);
  };

  const ambientRef = useRef<{ o: OscillatorNode; g: GainNode } | null>(null);
  useEffect(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ambientRef.current) { ambientRef.current.o.stop(); ambientRef.current = null; }
    
    if (weather !== "sunny") {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "brown" as any; // Mocking noise for rain
      if (o.type as any !== "brown") o.type = "sawtooth";
      o.frequency.value = 100;
      g.gain.value = 0.02;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      ambientRef.current = { o, g };
    }
    return () => { if (ambientRef.current) ambientRef.current.o.stop(); };
  }, [weather]);

  const buy = (item: Item) => {
    if (coins < item.price) { playSound("alert"); toast.error("Moedas insuficientes"); return; }
    if (["auto_feeder", "luxury_bed", "golden_brush"].includes(item.id)) {
      if (ownedPassives.includes(item.id)) { toast.info(language === "pt" ? "Você já possui este item!" : "You already own this item!"); return; }
      setCoins((c) => c - item.price);
      setOwnedPassives(prev => [...prev, item.id]);
      spawnParticles(item.icon, 8); playSound("buy");
      toast.success(language === "pt" ? `Equipado: ${item.name}` : `Equipped: ${item.name}`);
      return;
    }
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

  const buyClothing = (item: ClothingItem) => {
    if (item.unlockLevel && level < item.unlockLevel) { toast.error(`Desbloqueia no nível ${item.unlockLevel}`); return; }
    if (ownedClothes.includes(item.id)) { setEquippedClothing(item.id); setSelectedColor(item.colors[0]); spawnParticles(item.icon, 5); return; }
    if (coins < item.price) { playSound("alert"); toast.error("Moedas insuficientes"); return; }
    setCoins((c) => c - item.price);
    setOwnedClothes((items) => [...items, item.id]);
    setEquippedClothing(item.id);
    setSelectedColor(item.colors[0]);
    spawnParticles(item.icon, 8); playSound("buy"); gainXp(item.rarity === "Lendário" ? 20 : 8);
    logAction("clothing", `Equipou ${item.name} ${item.icon}`, { coins: -item.price, happy: 4 });
    setHappy((v) => clamp(v + 4));
    toast.success(`${item.name} equipado`, { description: `${item.buff} · ${item.rarity}` });
  };

  const useToy = (toy: ToyItem) => {
    const wasOwned = ownedToys.includes(toy.id);
    if (!wasOwned) {
      if (coins < toy.price) { playSound("alert"); toast.error("Moedas insuficientes"); return; }
      setCoins((c) => c - toy.price);
      setOwnedToys((items) => [...items, toy.id]);
      toast.success(`${toy.name} desbloqueado`);
    }
    if (toy.animation) {
      setToyAnimation(toy.animation);
      setTimeout(() => setToyAnimation(null), 1000);
    }
    setHappy((v) => clamp(v + toy.happy)); pulseStat("happy");
    setCoins((c) => Math.max(0, c + toy.coins));
    gainXp(toy.xp); spawnParticles(toy.icon, toy.id === "ufo" ? 12 : 6); playSound("pop"); triggerBounce();
    logAction("toy", `Brincou com ${toy.name} ${toy.icon}`, { happy: toy.happy, coins: toy.coins });
  };

  const doActivity = (activity: (typeof ACTIVITY_ITEMS)[number]) => {
    if (activity.coins < 0 && coins < Math.abs(activity.coins)) { playSound("alert"); toast.error("Moedas insuficientes"); return; }
    
    // Map activity IDs to mini-game types
    const gameTypeMap: Record<string, any> = {
      ball: "racing",
      run: "parkour",
      photo: "memory",
      dance: "treasure",
    };

    const type = gameTypeMap[activity.id];
    if (type) {
      setActiveMiniGame({ type, activity });
    } else {
      // Default behavior for non-game activities (sleep, eat, bath)
      applyActivityEffects(activity);
    }
  };

  const applyActivityEffects = (activity: any) => {
    setHunger((v) => clamp(v + activity.hunger));
    setHappy((v) => clamp(v + activity.happy));
    setClean((v) => clamp(v + activity.clean));
    setCoins((c) => Math.max(0, c + activity.coins));
    pulseStat(activity.clean > activity.happy ? "clean" : activity.hunger > activity.happy ? "hunger" : "happy");
    gainXp(activity.xp); spawnParticles(activity.icon, 7); playSound(activity.coins > 0 ? "coin" : "yay"); triggerBounce();
    logAction("activity", `${activity.name} · ${activity.mini}`, { hunger: activity.hunger, happy: activity.happy, clean: activity.clean, coins: activity.coins });
  };

  const sendPetMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const userMessage: ChatMessage = { id: `u_${Date.now()}`, role: "user", content: text };
    setChatMessages((msgs) => [...msgs, userMessage]);
    setChatInput("");
    setChatLoading(true);
    try {
      const result = await askPet({ data: { message: text, petName, mood: (happy + hunger + clean) / 3, hunger, happy, clean } });
      setChatMessages((msgs) => [...msgs, { id: `p_${Date.now()}`, role: "pet", content: result.reply }]);
      spawnParticles("💬", 4);
    } catch (error) {
      const message = error instanceof Error ? error.message : "O pet ficou sem resposta agora.";
      setChatMessages((msgs) => [...msgs, { id: `p_${Date.now()}`, role: "pet", content: "Au... minha conexão falhou, tenta de novo? 🐾" }]);
      toast.error(message);
    } finally {
      setChatLoading(false);
    }
  };

  // ---------- RANDOM EVENTS ----------
  useEffect(() => {
    if (!notificationsEnabled) return;
    const stats = [
      { key: "hunger", val: hunger, msg: "Tô com fome... 🦴" },
      { key: "happy", val: happy, msg: "Tô meio triste, brinca comigo? ❤️" }
    ];
    stats.forEach(s => {
      if (s.val < 25) {
        const now = Date.now();
        if (!notificationCooldownRef.current[s.key] || now - notificationCooldownRef.current[s.key] > 300000) {
          notificationCooldownRef.current[s.key] = now;
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`${petName}: ${s.msg}`);
          } else {
            toast.warning(`${petName}: ${s.msg}`);
          }
        }
      }
    });
  }, [hunger, happy, notificationsEnabled, petName]);

  useEffect(() => {
    if (notificationsEnabled && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [notificationsEnabled]);

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
              <button onClick={signOut} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted" aria-label={language === "pt" ? "Sair" : "Sign out"}>
                <LogOut className="h-4 w-4" />
              </button>
            ) : (
              <Link to="/auth" className="rounded-full p-1.5 text-primary hover:bg-muted" aria-label={language === "pt" ? "Entrar" : "Sign in"}>
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
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-3xl font-extrabold text-pet-foreground drop-shadow-sm">{petName}</h2>
                  <div className="flex items-center gap-0.5 rounded-full bg-white/40 px-2 py-0.5 text-[10px] font-bold text-pet-foreground">
                    <Heart className="h-2.5 w-2.5 fill-current text-neon-red" />
                    {Math.floor(friendship[selectedPetId] || 0)}
                  </div>
                </div>
                <div className={`relative mx-auto my-4 grid h-48 w-48 place-items-center rounded-full bg-white/60 ring-4 ring-white/80 shadow-[var(--shadow-glow)] transition-transform duration-300 ${bounce ? "scale-110 -translate-y-2" : "scale-100"} ${toyAnimation || ""} ${petTheme === "crystal" ? "pet-crystal" : ""}`}>
                  <div aria-hidden className="absolute inset-0 rounded-full animate-pulse-ring" />
                  {petImg ? (
                    <img src={petImg} alt={petName} width={176} height={176} className={`h-44 w-44 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)] ${petAction === "sleeping" ? "animate-pet-sleep" : petAction === "running" ? "animate-pet-run" : petAction === "jumping" ? "animate-pet-jump" : petAction === "trick_paw" ? "animate-trick-paw" : petAction === "trick_spin" ? "animate-trick-spin" : petAction === "trick_roll" ? "animate-trick-roll" : ""}`} />
                  ) : (
                    <div className={`text-8xl drop-shadow-xl ${petAction === "sleeping" ? "animate-pet-sleep" : petAction === "running" ? "animate-pet-run" : petAction === "jumping" ? "animate-pet-jump" : ""}`}>
                      {petIcon}
                    </div>
                  )}
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

            <div className="flex justify-center gap-3">
              {PET_DATA.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedPetId(p.id); spawnParticles(p.icon, 5); playSound("pop"); }}
                  className={`flex flex-col items-center gap-1 rounded-2xl p-2 transition-all ${selectedPetId === p.id ? "bg-white/40 ring-2 ring-white/60 shadow-md scale-105" : "bg-white/10 hover:bg-white/20"}`}
                >
                  <span className="text-2xl">{p.icon}</span>
                  <span className="text-[10px] font-bold uppercase">{p.name}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <Stat icon={<Bone className="h-4 w-4" />} label="Fome" value={hunger} color="reward" pulse={statPulse === "hunger"} />
              <Stat icon={<Heart className="h-4 w-4" />} label="Felicidade" value={happy} color="pet" pulse={statPulse === "happy"} />
              <Stat icon={<Droplet className="h-4 w-4" />} label="Limpeza" value={clean} color="primary" pulse={statPulse === "clean"} />
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <ActionBtn
                label={t.action_feed}
                icon="🦴"
                onClick={feed}
                variant="reward"
                loading={loadingAction === "feed"}
                disabled={!!loadingAction || hunger >= 100}
              />
              <ActionBtn
                label={t.action_play}
                icon="🎾"
                onClick={play}
                variant="pet"
                loading={loadingAction === "play"}
                disabled={!!loadingAction || happy >= 100 || hunger <= 0}
              />
              <ActionBtn
                label={t.action_wash}
                icon="🛁"
                onClick={wash}
                variant="primary"
                loading={loadingAction === "wash"}
                disabled={!!loadingAction || clean >= 100}
              />
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">Truques Aprendidos</h3>
                <Sparkles className="h-4 w-4 text-reward animate-pulse" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {TRICKS.map(trick => {
                  const isUnlocked = (friendship[selectedPetId] || 0) >= trick.minFriendship;
                  return (
                    <button 
                      key={trick.id}
                      onClick={() => performTrick(trick)}
                      disabled={!isUnlocked}
                      className={`flex flex-col items-center gap-1 rounded-2xl border p-3 transition-all active:scale-95 ${isUnlocked ? "border-primary/30 bg-primary/5 hover:bg-primary/10" : "opacity-40 grayscale bg-muted"}`}
                    >
                      <span className="text-2xl">{isUnlocked ? trick.icon : "🔒"}</span>
                      <span className="text-[10px] font-bold uppercase">{trick.label}</span>
                    </button>
                  );
                })}
              </div>
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

        {tab === "closet" && (
          <section className="space-y-4">
            <div className="rounded-3xl bg-[var(--gradient-pet)] p-6 text-pet-foreground shadow-[var(--shadow-pet)]">
              <div className="flex items-center gap-2">
                <Shirt className="h-5 w-5" />
                <h2 className="text-xl font-bold">Guarda-roupa</h2>
              </div>
              <p className="mt-1 text-sm opacity-90">Roupas, raridades, cores e buffs especiais</p>
              <div className="mt-4 rounded-2xl bg-white/40 p-3 text-sm font-bold">
                Equipado: {CLOTHING_ITEMS.find((item) => item.id === equippedClothing)?.icon} {CLOTHING_ITEMS.find((item) => item.id === equippedClothing)?.name} · {selectedColor}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {CLOTHING_ITEMS.map((item) => {
                const owned = ownedClothes.includes(item.id);
                const locked = !!item.unlockLevel && level < item.unlockLevel;
                const equipped = equippedClothing === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => buyClothing(item)}
                    disabled={locked || (!owned && coins < item.price)}
                    className={`relative overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-soft)] active:scale-95 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${equipped ? "border-pet ring-2 ring-pet/30" : "border-border"}`}
                  >
                    <div className="text-4xl drop-shadow">{item.icon}</div>
                    <p className="mt-2 text-sm font-extrabold leading-tight">{item.name}</p>
                    <p className="mt-1 text-[11px] font-bold text-muted-foreground">{item.category}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">{item.rarity}</span>
                      <span className="rounded-full bg-pet/10 px-2 py-0.5 text-[10px] font-bold text-pet">{item.buff}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs font-extrabold">
                      <span>{owned ? "Equipar" : `${item.price} 🪙`}</span>
                      {locked ? <span>Nv {item.unlockLevel}</span> : equipped ? <span>✅</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="mb-3 text-sm font-bold">Trocar cor</p>
              <div className="flex flex-wrap gap-2">
                {(CLOTHING_ITEMS.find((item) => item.id === equippedClothing)?.colors ?? []).map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${selectedColor === color ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === "toys" && (
          <section className="space-y-4">
            <div className="rounded-3xl bg-[var(--gradient-reward)] p-6 text-reward-foreground shadow-[var(--shadow-reward)]">
              <h2 className="text-xl font-bold">Brinquedos</h2>
              <p className="mt-1 text-sm opacity-90">Aumentam felicidade, XP, moedas e desbloqueiam animações</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {TOY_ITEMS.map((toy) => {
                const owned = ownedToys.includes(toy.id);
                return (
                  <button
                    key={toy.id}
                    onClick={() => useToy(toy)}
                    disabled={!owned && coins < toy.price}
                    className="rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-pop)] active:scale-95 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    <div className="text-4xl">{toy.icon}</div>
                    <p className="mt-2 font-extrabold">{toy.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{toy.effect}</p>
                    <div className="mt-3 grid grid-cols-3 gap-1 text-[10px] font-bold">
                      <span className="rounded-full bg-pet/10 px-2 py-1 text-pet">+{toy.happy} ❤️</span>
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">+{toy.xp} XP</span>
                      <span className="rounded-full bg-money/10 px-2 py-1 text-money">+{toy.coins} 🪙</span>
                    </div>
                    <p className="mt-3 text-xs font-extrabold">{owned ? "Brincar" : `Desbloquear ${toy.price} 🪙`}</p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {tab === "activities" && (
          <section className="space-y-4">
            <div className="rounded-3xl bg-[var(--gradient-hero)] p-6 text-primary-foreground shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                <h2 className="text-xl font-bold">Atividades</h2>
              </div>
              <p className="mt-1 text-sm opacity-90">Mini-games rápidos: corrida, memória, parkour e caça ao tesouro</p>
            </div>
            <div className="space-y-2">
              {ACTIVITY_ITEMS.map((activity) => (
                <button
                  key={activity.id}
                  onClick={() => doActivity(activity)}
                  disabled={activity.coins < 0 && coins < Math.abs(activity.coins)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-muted text-3xl">{activity.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold">{activity.name}</span>
                    <span className="block text-xs text-muted-foreground">Mini-game: {activity.mini}</span>
                  </span>
                  <span className="text-right text-[11px] font-bold text-muted-foreground">
                    +{activity.xp} XP<br />{activity.coins >= 0 ? `+${activity.coins}` : activity.coins} 🪙
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === "home" && (
          <section className="space-y-4">
              <div className={`relative min-h-[420px] overflow-hidden rounded-[2rem] border border-white/60 bg-[var(--gradient-bg)] p-5 shadow-[var(--shadow-soft)] transition-all ${timeOfDay === "night" ? "time-night" : timeOfDay === "sunset" ? "time-sunset" : ""} ${weather === "rainy" ? "weather-rain" : weather === "snowy" ? "weather-snow" : ""}`}>
              {/* Environment Animations */}
              <div className="absolute inset-x-0 top-4 flex justify-around text-4xl opacity-80 animate-bg-drift" aria-hidden>
                {weather === "rainy" ? <span className="animate-float">🌧️</span> : weather === "snowy" ? <span className="animate-float">❄️</span> : <span className="animate-float">☁️</span>}
                <span className="animate-float" style={{ animationDelay: "1.5s" }}>☁️</span>
                {timeOfDay === "night" ? <span className="animate-spin-slow text-5xl">🌙</span> : <span className="animate-spin-slow text-5xl">☀️</span>}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-money/20" aria-hidden />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-extrabold">Ambiente: {selectedZone.name}</h2>
                  </div>
                  <div className="flex gap-1">
                    {["idle", "walking", "sleeping", "running", "jumping"].map((a) => (
                      <button
                        key={a}
                        onClick={() => setPetAction(a as any)}
                        className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase transition-all ${petAction === a ? "bg-primary text-primary-foreground shadow-md" : "bg-white/40 text-foreground hover:bg-white/60"}`}
                      >
                        {a === "idle" ? "Parar" : a === "walking" ? "Andar" : a === "sleeping" ? "Dormir" : a === "running" ? "Correr" : "Pular"}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{selectedZone.details}</p>
              </div>

              <div className="absolute bottom-12 left-6 right-6 h-52 rounded-t-[2.5rem] bg-card/80 p-4 shadow-[var(--shadow-soft)] ring-1 ring-white/70 backdrop-blur-sm">
                <div className="mx-auto h-24 w-32 rounded-t-full bg-pet/20 text-center text-6xl leading-[6rem] drop-shadow-sm">{selectedZone.icon}</div>
                
                {/* Dynamic Pet Actions Display */}
                <div className={`absolute bottom-6 left-1/2 h-24 w-24 -translate-x-1/2 transition-all duration-500 ${petAction === "walking" ? "animate-pet-walk" : ""} ${petTheme === "crystal" ? "pet-crystal" : ""}`}>
                  <div className={`relative h-full w-full rounded-full bg-white/70 shadow-[var(--shadow-glow)] ring-2 ring-white/80 flex items-center justify-center`}>
                    {petImg ? (
                      <img 
                        src={petImg} 
                        alt={petName} 
                        className={`h-20 w-20 object-contain transition-transform ${petAction === "sleeping" ? "animate-pet-sleep scale-95 opacity-80" : petAction === "running" ? "animate-pet-run scale-105" : petAction === "jumping" ? "animate-pet-jump" : "scale-100"}`} 
                      />
                    ) : (
                      <div className={`text-5xl transition-transform ${petAction === "sleeping" ? "animate-pet-sleep scale-95 opacity-80" : petAction === "running" ? "animate-pet-run scale-105" : petAction === "jumping" ? "animate-pet-jump" : "scale-100"}`}>
                        {petIcon}
                      </div>
                    )}
                    {petAction === "sleeping" && <span className="absolute -top-4 -right-2 text-2xl animate-float">💤</span>}
                    {petAction === "jumping" && <span className="absolute -top-6 text-2xl animate-float">✨</span>}
                  </div>
                </div>

                <span className="absolute right-6 top-8 animate-float text-3xl">✨</span>
                <span className="absolute left-8 top-20 animate-float text-2xl" style={{ animationDelay: "1s" }}>🧸</span>
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                   <div className="absolute top-10 left-1/4 h-1 w-1 rounded-full bg-white animate-pulse" />
                   <div className="absolute top-20 right-1/3 h-1.5 w-1.5 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: "0.5s" }} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {HOME_ZONES.map((zone) => (
                <button
                  key={zone.name}
                  onClick={() => { setSelectedZone(zone); spawnParticles(zone.icon, 4); playSound("pop"); }}
                  className={`rounded-2xl border p-4 text-left transition-all active:scale-95 ${selectedZone.name === zone.name ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-md" : "border-border bg-card hover:bg-muted/50"}`}
                >
                  <div className="text-3xl drop-shadow-sm">{zone.icon}</div>
                  <p className="mt-2 font-extrabold">{zone.name}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{zone.details}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === "chat" && (
          <section className="space-y-4">
            <div className="rounded-3xl bg-[var(--gradient-pet)] p-6 text-pet-foreground shadow-[var(--shadow-pet)]">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <h2 className="text-xl font-bold">Conversar com {petName}</h2>
              </div>
              <p className="mt-1 text-sm opacity-90">Ela responde ao seu humor, fome, felicidade e limpeza</p>
            </div>
            <div className="min-h-[360px] space-y-3 rounded-2xl border border-border bg-card p-4">
              {chatMessages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[82%] rounded-2xl px-4 py-2 text-sm font-medium ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    {message.content}
                  </div>
                </div>
              ))}
              {chatLoading && <div className="text-sm font-semibold text-muted-foreground">{petName} está pensando…</div>}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => { e.preventDefault(); sendPetMessage(); }}
            >
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={280}
                placeholder="Fale com seu pet..."
                className="min-w-0 flex-1 rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none ring-ring transition focus:ring-2"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)] active:scale-95 disabled:opacity-50"
                aria-label="Enviar mensagem"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
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
                ☁️ {language === "pt" ? "Entre para sincronizar entre dispositivos" : "Sign in to sync across devices"}
              </Link>
            )}
          </section>
        )}

        {tab === "settings" && (
          <section className="space-y-4">
            <div className="rounded-3xl bg-[var(--gradient-hero)] p-6 text-primary-foreground shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                <h2 className="text-xl font-bold">{t.nav_settings}</h2>
              </div>
              <p className="mt-1 text-sm opacity-90">{language === "pt" ? "Personalize sua experiência" : "Customize your experience"}</p>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="font-bold">{t.settings_lang}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLanguage("pt")}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${language === "pt" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  >
                    Português
                  </button>
                  <button
                    onClick={() => setLanguage("en")}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${language === "en" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  >
                    English
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {notificationsEnabled ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
                    <div>
                      <p className="font-bold">{t.settings_notif}</p>
                      <p className="text-[10px] text-muted-foreground">{t.settings_notif_desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${notificationsEnabled ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${notificationsEnabled ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
          </section>
        )}
        {tab === "inventory" && (
          <section className="space-y-6">
            <div className="rounded-3xl bg-[var(--gradient-hero)] p-6 text-white shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-6 w-6" />
                <h2 className="text-2xl font-bold">{language === "pt" ? "Minha Mochila" : "My Inventory"}</h2>
              </div>
              <p className="mt-1 text-sm opacity-90">{ownedPassives.length + Object.keys(consumables).length} itens guardados</p>
            </div>

            <div className="space-y-4">
              <h3 className="font-extrabold uppercase tracking-widest text-xs text-muted-foreground">Itens Passivos (Equipados)</h3>
              <div className="grid grid-cols-1 gap-2">
                {ownedPassives.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nenhum item passivo ainda.</p>
                ) : (
                  ownedPassives.map(id => {
                    const item = SHOP_ITEMS.find(i => i.id === id);
                    return (
                      <div key={id} className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm">
                        <span className="text-3xl">{item?.icon}</span>
                        <div>
                          <p className="font-bold">{item?.name}</p>
                          <p className="text-xs text-muted-foreground">{item?.description}</p>
                        </div>
                        <div className="ml-auto text-money font-bold text-xs uppercase tracking-tighter">Ativo</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-extrabold uppercase tracking-widest text-xs text-muted-foreground">Coleção de Roupas</h3>
              <div className="flex flex-wrap gap-2">
                {ownedClothes.map(id => {
                  const item = CLOTHING_ITEMS.find(c => c.id === id);
                  return (
                    <div key={id} className="grid h-12 w-12 place-items-center rounded-xl border bg-muted/20 text-2xl shadow-sm">
                      {item?.icon}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
        {tab === "achievements" && (
          <section className="space-y-4">
            <div className="rounded-3xl bg-[var(--gradient-reward)] p-6 text-reward-foreground shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                <h2 className="text-xl font-bold">{language === "pt" ? "Suas Conquistas" : "Your Achievements"}</h2>
              </div>
              <p className="mt-1 text-sm opacity-90">{unlockedAchievements.length} de {ACHIEVEMENTS.length} medalhas coletadas</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {ACHIEVEMENTS.map((ach) => {
                const isUnlocked = unlockedAchievements.includes(ach.id);
                return (
                  <div 
                    key={ach.id} 
                    className={`flex items-center gap-4 rounded-2xl border p-4 transition-all ${isUnlocked ? "border-reward bg-reward/5 shadow-sm" : "border-border bg-muted/30 opacity-60 grayscale"}`}
                  >
                    <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-3xl shadow-inner ${isUnlocked ? "bg-reward/20" : "bg-muted"}`}>
                      {isUnlocked ? ach.icon : "🔒"}
                    </div>
                    <div>
                      <h3 className={`font-bold ${isUnlocked ? "text-foreground" : "text-muted-foreground"}`}>{ach.label}</h3>
                      <p className="text-xs text-muted-foreground">{ach.desc}</p>
                      {isUnlocked && <span className="mt-1 inline-block text-[10px] font-extrabold uppercase text-reward">Concluída! ✨</span>}
                    </div>
                  </div>
                );
              })}
            </div>
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
        <div className="mx-auto flex max-w-md items-center gap-1 overflow-x-auto px-2 py-2">
          <NavBtn active={tab === "pet"} onClick={() => setTab("pet")} icon={<Heart />} label="Pet" />
          <NavBtn active={tab === "shop"} onClick={() => setTab("shop")} icon={<ShoppingBag />} label="Loja" />
          <NavBtn active={tab === "closet"} onClick={() => setTab("closet")} icon={<Shirt />} label="Roupas" />
          <NavBtn active={tab === "toys"} onClick={() => setTab("toys")} icon={<Gift />} label="Brinq." />
          <NavBtn active={tab === "activities"} onClick={() => setTab("activities")} icon={<Dumbbell />} label="Ativid." />
          <NavBtn active={tab === "home"} onClick={() => setTab("home")} icon={<Home />} label="Casa" />
          <NavBtn active={tab === "chat"} onClick={() => setTab("chat")} icon={<MessageCircle />} label="Chat" />
          <NavBtn active={tab === "missions"} onClick={() => setTab("missions")} icon={<Trophy />} label={t.nav_missions} />
          <NavBtn active={tab === "history"} onClick={() => setTab("history")} icon={<HistoryIcon />} label={t.nav_history} />
          <NavBtn active={tab === "inventory"} onClick={() => setTab("inventory")} icon={<ShoppingBag />} label={language === "pt" ? "Mochila" : "Bag"} />
          <NavBtn active={tab === "achievements"} onClick={() => setTab("achievements")} icon={<Zap />} label={language === "pt" ? "Medalhas" : "Medals"} />
          <NavBtn active={tab === "settings"} onClick={() => setTab("settings")} icon={<SettingsIcon />} label={t.nav_settings} />
          <NavBtn active={tab === "life"} onClick={() => setTab("life")} icon={<Gamepad2 />} label={t.nav_history === "Histórico" ? "Vida" : "Life"} />
        </div>
      </nav>

      {activeMiniGame && (
        <MiniGameOverlay 
          type={activeMiniGame.type}
          onClose={() => setActiveMiniGame(null)}
          onComplete={(reward) => {
            const act = activeMiniGame.activity;
            applyActivityEffects({
              ...act,
              coins: act.coins + reward.coins,
              xp: act.xp + reward.xp
            });
            setActiveMiniGame(null);
            toast.success("Mini-game concluído!", { description: `Bônus: +${reward.coins} 🪙 e +${reward.xp} XP` });
          }}
        />
      )}
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
  loading = false,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  variant?: "primary" | "pet" | "reward";
  disabled?: boolean;
  loading?: boolean;
}) {
  const styles: Record<string, string> = {
    primary:
      "bg-[var(--gradient-hero)] shadow-[var(--shadow-pop)] hover:shadow-[0_18px_0_-4px_oklch(0.55_0.16_254/0.45),0_24px_46px_-10px_oklch(0.65_0.16_254/0.55)] active:shadow-[0_4px_0_-2px_oklch(0.55_0.16_254/0.5)]",
    pet:
      "bg-[var(--gradient-pet)] shadow-[var(--shadow-pet)] hover:shadow-[0_22px_46px_-10px_oklch(0.78_0.18_340/0.7)] active:shadow-[0_6px_14px_-4px_oklch(0.78_0.18_340/0.55)]",
    reward:
      "bg-[var(--gradient-reward)] shadow-[var(--shadow-reward)] hover:shadow-[0_18px_0_-4px_oklch(0.65_0.18_70/0.5),0_24px_46px_-10px_oklch(0.84_0.16_80/0.65)] active:shadow-[0_4px_0_-2px_oklch(0.65_0.18_70/0.55)]",
  };
  const labelColor: Record<string, string> = {
    primary: "text-[oklch(0.32_0.16_254)]",
    pet: "text-[oklch(0.36_0.18_350)]",
    reward: "text-[oklch(0.34_0.14_60)]",
  };
  const spinnerColor: Record<string, string> = {
    primary: "border-[oklch(0.32_0.16_254)]",
    pet: "border-[oklch(0.36_0.18_350)]",
    reward: "border-[oklch(0.34_0.14_60)]",
  };
  const isDisabled = disabled || loading;
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-label={label}
      className={`group relative flex min-h-[88px] w-full min-w-0 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl ${styles[variant]} px-2 py-3 ring-1 ring-white/60 transition-all duration-200 hover:-translate-y-1 hover:ring-2 hover:ring-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:translate-y-0.5 active:scale-95 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 disabled:saturate-50 disabled:shadow-none motion-reduce:transition-none motion-reduce:transform-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100 motion-reduce:active:translate-y-0 motion-reduce:active:scale-100`}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-white/30 group-hover:bg-white/40 group-active:bg-white/20" />
      <span className="relative flex h-9 items-center justify-center text-3xl drop-shadow transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6 group-active:scale-90 group-active:rotate-0 motion-reduce:transition-none motion-reduce:transform-none motion-reduce:group-hover:scale-100 motion-reduce:group-hover:rotate-0 motion-reduce:group-active:scale-100">
        {loading ? (
          <span
            aria-hidden="true"
            className={`block h-5 w-5 animate-spin rounded-full border-2 border-t-transparent ${spinnerColor[variant]} motion-reduce:animate-none motion-reduce:opacity-70`}
          />
        ) : (
          icon
        )}
      </span>
      <span
        className={`relative w-full min-w-0 truncate px-1 text-center text-[clamp(11px,2.6vw,13px)] font-extrabold uppercase leading-tight tracking-wide drop-shadow-[0_1px_0_rgba(255,255,255,0.6)] ${labelColor[variant]}`}
      >
        {label}
      </span>
      {loading && <span className="sr-only">Carregando…</span>}
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
      className={`relative flex min-w-[68px] flex-col items-center gap-0.5 rounded-2xl py-2 text-[10px] font-extrabold uppercase tracking-wide transition-all ${active ? "text-primary-foreground" : "text-muted-foreground"}`}
    >
      {active && (
        <span className="absolute inset-x-1 inset-y-1 -z-0 rounded-2xl bg-[var(--gradient-hero)] shadow-[var(--shadow-soft)] animate-pop-in" />
      )}
      <span className={`relative z-10 grid h-7 w-7 place-items-center [&_svg]:h-5 [&_svg]:w-5 transition-transform ${active ? "scale-110" : ""}`}>{icon}</span>
      <span className="relative z-10">{label}</span>
    </button>
  );
}
