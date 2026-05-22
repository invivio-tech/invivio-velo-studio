'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating promotional offers
 * and suggesting the best time to launch them.
 *
 * - generatePromotionalOffers - A function that generates promotional offers and launch time suggestions.
 * - PromotionalOfferInput - The input type for the generatePromotionalOffers function.
 * - PromotionalOfferOutput - The return type for the generatePromotionalOffers function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminFirestore, initAdmin } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

const PromotionalOfferInputSchema = z.object({
  serviceCatalog: z.string().describe('Uma descrição dos serviços oferecidos pela barbearia, incluindo preços.'),
  customerHistory: z.string().describe('Um resumo do comportamento e preferências de clientes anteriores.'),
  currentPromotions: z.string().optional().describe('Quaisquer promoções atuais em vigor na barbearia.'),
});
export type PromotionalOfferInput = z.infer<typeof PromotionalOfferInputSchema>;

const PromotionalOfferOutputSchema = z.object({
  offer: z.string().describe('A oferta promocional gerada.'),
  launchTimeSuggestion: z.string().describe('Uma sugestão para o momento mais eficaz de lançar a oferta.'),
  reasoning: z.string().describe('O raciocínio da IA por trás da promoção e do horário de lançamento sugeridos.'),
  pushTitle: z.string().describe('Um título chamativo e curto para notificação push (máximo de 50 caracteres).'),
  pushBody: z.string().describe('O corpo da notificação push engajante baseada na promoção (máximo de 150 caracteres).'),
});
export type PromotionalOfferOutput = z.infer<typeof PromotionalOfferOutputSchema>;

export async function analyzeBusinessData(): Promise<{ serviceCatalog: string; customerHistory: string; error?: string }> {
  // Step 1: Init Firebase Admin
  try {
    initAdmin();
  } catch (e: any) {
    console.error('[analyzeBusinessData] STEP 1 FAILED - initAdmin:', e);
    return { serviceCatalog: '', customerHistory: '', error: `Erro ao inicializar Firebase Admin: ${e.message}` };
  }

  let db: ReturnType<typeof getAdminFirestore>;
  try {
    db = getAdminFirestore();
  } catch (e: any) {
    console.error('[analyzeBusinessData] STEP 2 FAILED - getAdminFirestore:', e);
    return { serviceCatalog: '', customerHistory: '', error: `Erro ao obter Firestore: ${e.message}` };
  }

  // Step 2: Fetch Services
  let servicesList = 'Nenhum serviço registrado';
  try {
    const servicesSnap = await db.collection('services').get();
    if (!servicesSnap.empty) {
      servicesList = servicesSnap.docs.map(doc => {
        const d = doc.data();
        return `${d.name} (Preço: R$${d.price}, Duração: ${d.duration}min)`;
      }).join(', ');
    }
    console.log(`[analyzeBusinessData] Services fetched: ${servicesSnap.size} docs`);
  } catch (e: any) {
    console.error('[analyzeBusinessData] STEP 3 FAILED - services query:', e);
    return { serviceCatalog: '', customerHistory: '', error: `Erro ao buscar serviços: ${e.message}` };
  }

  // Step 3: Fetch Appointments (last 30 days) - query simples sem índice composto
  let total = 0;
  let completed = 0;
  let cancelled = 0;
  const servicesCount: Record<string, number> = {};
  const weekdayCount: Record<number, number> = {};

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Query simples: apenas filtro por startTime, sem campos adicionais
    const appointmentsSnap = await db.collection('appointments')
      .where('startTime', '>=', Timestamp.fromDate(thirtyDaysAgo))
      .get();

    console.log(`[analyzeBusinessData] Appointments fetched: ${appointmentsSnap.size} docs`);

    appointmentsSnap.forEach(doc => {
      const app = doc.data();
      total++;
      if (app.status === 'completed') completed++;
      if (app.status === 'cancelled') cancelled++;

      if (app.serviceName) {
        servicesCount[app.serviceName] = (servicesCount[app.serviceName] || 0) + 1;
      }

      if (app.startTime) {
        let date: Date | null = null;
        if (typeof app.startTime.toDate === 'function') {
          date = app.startTime.toDate();
        } else if (app.startTime instanceof Date) {
          date = app.startTime;
        } else if (typeof app.startTime === 'string' || typeof app.startTime === 'number') {
          date = new Date(app.startTime);
        } else if (app.startTime && typeof app.startTime === 'object' && '_seconds' in app.startTime) {
          date = new Date((app.startTime as any)._seconds * 1000);
        }

        if (date && !isNaN(date.getTime())) {
          const day = date.getDay();
          weekdayCount[day] = (weekdayCount[day] || 0) + 1;
        }
      }
    });
  } catch (e: any) {
    console.error('[analyzeBusinessData] STEP 4 FAILED - appointments query:', e);
    return { serviceCatalog: '', customerHistory: '', error: `Erro ao buscar agendamentos: ${e.message}` };
  }

  const daysMap = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const weekdaySummary = Object.entries(weekdayCount).map(([day, count]) => {
    return `${daysMap[parseInt(day)]}: ${count} agendamentos`;
  }).join(', ');

  const topServices = Object.entries(servicesCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => `${name} (${count}x)`)
    .join(', ');

  const rawBehavior = `
    Total de agendamentos criados nos últimos 30 dias: ${total}.
    Status: ${completed} concluídos, ${cancelled} cancelados.
    Serviços mais solicitados: ${topServices || 'Nenhum'}.
    Movimento por dia da semana: ${weekdaySummary || 'Sem agendamentos registrados'}.
  `;

  // Step 4: Call AI
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: `Você é uma inteligência artificial analítica especializada em negócios de beleza, estética e bem-estar.
      Sua tarefa é ler dados brutos de serviços e agendamentos e gerar descrições polidas e insights estratégicos ricos.

      Dados brutos de serviços:
      ${servicesList}

      Dados brutos de comportamento de clientes nos últimos 30 dias:
      ${rawBehavior}

      Com base nesses dados brutos, retorne descrições detalhadas e completas para preencher dois campos de texto de um painel de marketing:
      1. "serviceCatalog": Escreva um catálogo de serviços polido e claro com preços.
      2. "customerHistory": Escreva um resumo completo e analítico sobre o comportamento dos clientes, padrões de preferência, e especificamente identifique dias de maior/menor fluxo com base nos números reais fornecidos.

      Seja extremamente preciso em relação aos números reais de agendamentos e dias fornecidos nos dados. Não invente números diferentes dos dados reais.
      Tom de voz: Profissional, analítico e de alto nível de consultoria de negócios.`,
      output: {
        schema: z.object({
          serviceCatalog: z.string().describe('Um catálogo de serviços polido e atrativo baseado nos dados fornecidos.'),
          customerHistory: z.string().describe('Uma análise comportamental detalhada dos clientes, padrões de agendamento e dias calmos/cheios baseada nos dados fornecidos.'),
        })
      }
    });

    console.log('[analyzeBusinessData] AI response received successfully');
    return response.output!;
  } catch (e: any) {
    console.error('[analyzeBusinessData] STEP 5 FAILED - AI generate:', e);
    return { serviceCatalog: '', customerHistory: '', error: `Erro ao chamar IA: ${e.message}` };
  }
}

export async function generatePromotionalOffers(input: PromotionalOfferInput): Promise<PromotionalOfferOutput> {
  const output = await generatePromotionalOffersFlow(input);
  try {
    initAdmin();
    const db = getAdminFirestore();
    await db.collection('campaigns').add({
      offer: output.offer,
      launchTimeSuggestion: output.launchTimeSuggestion,
      reasoning: output.reasoning,
      pushTitle: output.pushTitle,
      pushBody: output.pushBody,
      serviceCatalog: input.serviceCatalog,
      customerHistory: input.customerHistory,
      currentPromotions: input.currentPromotions || '',
      createdAt: Timestamp.now(),
    });
    console.log('[generatePromotionalOffers] Campaign saved to firestore');
  } catch (err) {
    console.error('[generatePromotionalOffers] Failed to save campaign log:', err);
  }
  return output;
}

const prompt = ai.definePrompt({
  name: 'promotionalOfferPrompt',
  input: { schema: PromotionalOfferInputSchema },
  output: { schema: PromotionalOfferOutputSchema },
  prompt: `Você é um estrategista de marketing digital para uma barbearia de alto padrão, a "Barbearia Inteligente".
  Seu objetivo é criar uma campanha promocional exclusiva e altamente eficaz para aumentar o faturamento e a fidelização.

  Analise os dados abaixo:
  - **Catálogo de Serviços:** {{{serviceCatalog}}}
  - **Comportamento dos Clientes:** {{{customerHistory}}}
  - **Promoções Ativas:** {{{currentPromotions}}}

  Sua tarefa:
  1. **Crie uma Oferta Irresistível:** Um título chamativo e uma descrição curta e persuasiva. Use gatilhos mentais de exclusividade ou urgência.
  2. **Sugira o Momento Ideal:** Qual dia da semana e horário disparar essa oferta? Por que?
  3. **Justifique a Estratégia:** Explique brevemente por que essa oferta funcionará com base nos dados fornecidos.
  4. **Crie a Notificação Push da Campanha:** Escreva o título (pushTitle, máximo de 50 caracteres) e o corpo (pushBody, máximo de 150 caracteres) que serão enviados aos clientes para divulgar esta promoção. Crie algo chamativo e de alto impacto para converter o cliente.

  Tom de voz: Premium, confiante e convidativo.
  `,
});

const generatePromotionalOffersFlow = ai.defineFlow(
  {
    name: 'generatePromotionalOffersFlow',
    inputSchema: PromotionalOfferInputSchema,
    outputSchema: PromotionalOfferOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
