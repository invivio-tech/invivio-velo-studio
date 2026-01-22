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
  serviceCatalog: z.string().describe('A description of the services offered by the barbershop, including prices.'),
  customerHistory: z.string().describe('A summary of past customer behavior and preferences.'),
  currentPromotions: z.string().optional().describe('Any current promotions running at the barbershop.'),
});
export type PromotionalOfferInput = z.infer<typeof PromotionalOfferInputSchema>;

const PromotionalOfferOutputSchema = z.object({
  offer: z.string().describe('The generated promotional offer.'),
  launchTimeSuggestion: z.string().describe('A suggestion for the most effective time to launch the offer.'),
  reasoning: z.string().describe('The AI reasoning behind the suggested promotion and launch time.'),
});
export type PromotionalOfferOutput = z.infer<typeof PromotionalOfferOutputSchema>;

export async function generatePromotionalOffers(input: PromotionalOfferInput): Promise<PromotionalOfferOutput> {
  return generatePromotionalOffersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'promotionalOfferPrompt',
  input: {schema: PromotionalOfferInputSchema},
  output: {schema: PromotionalOfferOutputSchema},
  prompt: `You are a marketing expert for a barbershop.
  Your goal is to generate effective promotional offers and suggest the best time to launch them to attract more customers and increase revenue.

  Consider the following information:
  Service Catalog: {{{serviceCatalog}}}
  Customer History: {{{customerHistory}}}
  Current Promotions: {{{currentPromotions}}}

  Generate a promotional offer and suggest the most effective time to launch it, explaining your reasoning.
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
