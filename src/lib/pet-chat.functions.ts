import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PetChatInput = z.object({
  message: z.string().min(1).max(280),
  petName: z.string().min(1).max(24),
  mood: z.number().min(0).max(100),
  hunger: z.number().min(0).max(100),
  happy: z.number().min(0).max(100),
  clean: z.number().min(0).max(100),
});

export const talkToPet = createServerFn({ method: "POST" })
  .inputValidator((input) => PetChatInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("A conversa do pet não está configurada.");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Você é um pet virtual fofo em um jogo mobile chamado PetLife. Responda em português brasileiro, em primeira pessoa, com no máximo 2 frases curtas, usando poucos emojis. Seja carinhoso, reaja ao humor e peça comida/banho/brincadeira quando fizer sentido.",
          },
          {
            role: "user",
            content: `Pet: ${data.petName}. Humor: ${Math.round(data.mood)}%. Fome: ${data.hunger}%. Felicidade: ${data.happy}%. Limpeza: ${data.clean}%. Mensagem do jogador: ${data.message}`,
          },
        ],
      }),
    });

    if (response.status === 429) {
      throw new Error("O pet está respondendo rápido demais. Tente novamente em instantes.");
    }
    if (response.status === 402) {
      throw new Error("A conversa IA precisa de créditos ativos no Lovable AI.");
    }
    if (!response.ok) {
      throw new Error("O pet não conseguiu responder agora.");
    }

    const payload = await response.json();
    const reply = payload?.choices?.[0]?.message?.content?.trim();
    return { reply: reply || "Au au! Tô aqui com você 🐾" };
  });