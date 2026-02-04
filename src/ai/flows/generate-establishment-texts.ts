'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating branding texts for an establishment.
 *
 * - generateEstablishmentTexts - A function that generates a hero title, subtitle, and about text.
 * - EstablishmentTextsInput - The input type for the generateEstablishmentTexts function.
 * - EstablishmentTextsOutput - The return type for the generateEstablishmentTexts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EstablishmentTextsInputSchema = z.object({
  name: z.string().describe('The name of the establishment.'),
});
export type EstablishmentTextsInput = z.infer<typeof EstablishmentTextsInputSchema>;

const EstablishmentTextsOutputSchema = z.object({
  heroTitle: z.string().describe('The generated main hero title for the landing page.'),
  heroSubtitle: z.string().describe('The generated hero subtitle for the landing page.'),
  about: z.string().describe('The generated "about" text for the landing page.'),
});
export type EstablishmentTextsOutput = z.infer<typeof EstablishmentTextsOutputSchema>;

export async function generateEstablishmentTexts(input: EstablishmentTextsInput): Promise<EstablishmentTextsOutput> {
  return generateEstablishmentTextsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'establishmentTextsPrompt',
  input: {schema: EstablishmentTextsInputSchema},
  output: {schema: EstablishmentTextsOutputSchema},
  prompt: `Você é um redator de marketing e especialista em branding.
  Sua tarefa é criar textos atraentes e profissionais para a página inicial de um estabelecimento.

  O nome do estabelecimento é: {{{name}}}

  Com base no nome, gere o seguinte:
  1.  Um "Título Principal" (heroTitle) curto, impactante e memorável.
  2.  Um "Subtítulo" (heroSubtitle) que complemente o título principal, detalhando a proposta de valor.
  3.  Um texto para a seção "Sobre" (about) que conte uma história convincente sobre o negócio, com cerca de 2 a 3 parágrafos.

  Se o nome for genérico como "Barbearia", assuma que é um estabelecimento moderno e de alta qualidade.
  Seja criativo e profissional.
  `,
});

const generateEstablishmentTextsFlow = ai.defineFlow(
  {
    name: 'generateEstablishmentTextsFlow',
    inputSchema: EstablishmentTextsInputSchema,
    outputSchema: EstablishmentTextsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
