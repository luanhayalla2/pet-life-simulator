import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Coins, ShoppingBag, Sparkles, Bone, Gamepad2, Droplet } from "lucide-react";
import petImg from "@/assets/pet-mel.png";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "PetLife — Simulador de Pet, Loja e Vida" },
      { name: "description", content: "Cuide do seu pet, gerencie dinheiro e compre itens neste simulador fofo e profissional." },
    ],
  }),
});

type Tab = "pet" | "shop" | "life";

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

function Index() {
  const [tab, setTab] = useState<Tab>("pet");
  const [coins, setCoins] = useState(100);
  const [hunger, setHunger] = useState(70);
  const [happy, setHappy] = useState(80);
  const [clean, setClean] = useState(60);
  const [petName] = useState("Mel");
  const [bounce, setBounce] = useState(false);

  const triggerBounce = () => {
    setBounce(true);
    setTimeout(() => setBounce(false), 400);
  };

  const feed = () => {
    setHunger((v) => Math.min(100, v + 10));
    setCoins((c) => c + 2);
    triggerBounce();
  };
  const play = () => {
    setHappy((v) => Math.min(100, v + 10));
    setCoins((c) => c + 3);
    triggerBounce();
  };
  const wash = () => {
    setClean((v) => Math.min(100, v + 10));
    triggerBounce();
  };

  const buy = (item: Item) => {
    if (coins < item.price) return;
    setCoins((c) => c - item.price);
    if (item.effect.hunger) setHunger((v) => Math.min(100, v + item.effect.hunger!));
    if (item.effect.happy) setHappy((v) => Math.min(100, v + item.effect.happy!));
    if (item.effect.clean) setClean((v) => Math.min(100, v + item.effect.clean!));
    triggerBounce();
  };

  const mood = (happy + hunger + clean) / 3;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-4">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 text-accent" />
            PetLife
          </h1>
          <div className="flex items-center gap-2 rounded-full bg-money/10 px-3 py-1.5 text-money font-semibold">
            <Coins className="h-4 w-4" />
            <span className="tabular-nums">{coins}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pb-28 pt-6">
        {tab === "pet" && (
          <section className="space-y-6">
            <div className="rounded-3xl bg-[var(--gradient-pet)] p-8 text-center shadow-[var(--shadow-pet)]">
              <p className="text-sm font-medium text-pet-foreground/80">Seu pet</p>
              <h2 className="text-2xl font-bold text-pet-foreground">{petName}</h2>
              <div
                className={`mx-auto my-4 flex h-44 w-44 items-center justify-center rounded-full bg-white/40 shadow-inner transition-transform duration-300 ${
                  bounce ? "scale-110" : "scale-100"
                }`}
              >
                <img src={petImg} alt={petName} width={176} height={176} className="h-40 w-40 object-contain drop-shadow-md" />
              </div>
              <p className="text-sm text-pet-foreground/90">
                {mood > 70 ? "Tô feliz! 💖" : mood > 40 ? "Tô de boa..." : "Preciso de cuidado 🥺"}
              </p>
            </div>

            <div className="space-y-3">
              <Stat icon={<Bone className="h-4 w-4" />} label="Fome" value={hunger} color="reward" />
              <Stat icon={<Heart className="h-4 w-4" />} label="Felicidade" value={happy} color="pet" />
              <Stat icon={<Droplet className="h-4 w-4" />} label="Limpeza" value={clean} color="primary" />
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
                    className="rounded-2xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] disabled:opacity-40 disabled:hover:translate-y-0"
                  >
                    <div className="text-3xl">{item.icon}</div>
                    <div className="mt-2 font-semibold">{item.name}</div>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-money/10 px-2 py-0.5 text-xs font-semibold text-money">
                      <Coins className="h-3 w-3" />
                      {item.price}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {tab === "life" && (
          <section className="space-y-4">
            <div className="rounded-3xl bg-[var(--gradient-hero)] p-6 text-primary-foreground shadow-[var(--shadow-soft)]">
              <h2 className="text-xl font-bold">Sua vida com {petName}</h2>
              <p className="mt-1 text-sm opacity-90">Resumo do seu dia</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InfoCard label="Humor geral" value={`${Math.round(mood)}%`} />
              <InfoCard label="Moedas" value={`${coins} 🪙`} />
              <InfoCard label="Itens na loja" value={`${SHOP_ITEMS.length}`} />
              <InfoCard label="Status" value={mood > 70 ? "Ótimo" : mood > 40 ? "Ok" : "Atenção"} />
            </div>
            <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
              💡 Em breve: missões diárias, conquistas e novos pets!
            </div>
          </section>
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-around px-4 py-2">
          <NavBtn active={tab === "pet"} onClick={() => setTab("pet")} icon={<Heart />} label="Pet" />
          <NavBtn active={tab === "shop"} onClick={() => setTab("shop")} icon={<ShoppingBag />} label="Loja" />
          <NavBtn active={tab === "life"} onClick={() => setTab("life")} icon={<Gamepad2 />} label="Vida" />
        </div>
      </nav>
    </div>
  );
}

function Stat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: "pet" | "reward" | "primary" }) {
  const bg = color === "pet" ? "bg-pet" : color === "reward" ? "bg-reward" : "bg-primary";
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium">{icon}{label}</span>
        <span className="tabular-nums text-muted-foreground">{value}%</span>
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
      className="flex flex-col items-center gap-1 rounded-2xl bg-primary p-3 text-primary-foreground shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5 active:scale-95"
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
      className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-xs font-semibold transition-colors ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <span className={`grid h-6 w-6 place-items-center [&_svg]:h-5 [&_svg]:w-5 ${active ? "scale-110" : ""}`}>{icon}</span>
      {label}
    </button>
  );
}
