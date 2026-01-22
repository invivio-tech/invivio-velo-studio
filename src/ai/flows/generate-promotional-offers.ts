'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating promotional offers
 * and suggesting the best time to launch them.
 *
 * - generatePromotionalOffers - A function that generates promotional offers and launch time suggestions.
 * - PromotionalOfferInput - The input type for the generatePromotionalOffers function.
 * - PromotionalOfferOutput - The return type for the generatePromotionalOffers function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
});
export type PromotionalOfferOutput = z.infer<typeof PromotionalOfferOutputSchema>;

export async function generatePromotionalOffers(input: PromotionalOfferInput): Promise<PromotionalOfferOutput> {
  return generatePromotionalOffersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'promotionalOfferPrompt',
  input: {schema: PromotionalOfferInputSchema},
  output: {schema: PromotionalOfferOutputSchema},
  prompt: `Você é um especialista em marketing para uma barbearia.
  Seu objetivo é gerar ofertas promocionais eficazes e sugerir o melhor momento para lançá-las para atrair mais clientes e aumentar a receita.

  Considere as seguintes informações:
  Catálogo de Serviços: {{{serviceCatalog}}}
  Histórico de Clientes: {{{customerHistory}}}
  Promoções Atuais: {{{currentPromotions}}}

  Gere uma oferta promocional e sugira o momento mais eficaz para lançá-la, explicando seu raciocínio.
  `,
});

const generatePromotionalOffersFlow = ai.defineFlow(
  {
    name: 'generatePromotionalOffersFlow',
    inputSchema: PromotionalOfferInputSchema,
    outputSchema: PromotionalOfferOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
