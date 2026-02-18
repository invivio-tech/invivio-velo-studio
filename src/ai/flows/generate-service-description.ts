'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a barbershop service description.
 *
 * - generateServiceDescription - A function that generates a compelling service description.
 * - ServiceDescriptionInput - The input type for the generateServiceDescription function.
 * - ServiceDescriptionOutput - The return type for the generateServiceDescription function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ServiceDescriptionInputSchema = z.object({
  name: z.string().describe('The name of the barbershop service.'),
  price: z.string().describe('The price of the service.'),
  duration: z.string().describe('The duration of the service.'),
});
export type ServiceDescriptionInput = z.infer<typeof ServiceDescriptionInputSchema>;

const ServiceDescriptionOutputSchema = z.object({
  description: z.string().describe('The generated service description.'),
});
export type ServiceDescriptionOutput = z.infer<typeof ServiceDescriptionOutputSchema>;

export async function generateServiceDescription(input: ServiceDescriptionInput): Promise<ServiceDescriptionOutput> {
  return generateServiceDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'serviceDescriptionPrompt',
  input: { schema: ServiceDescriptionInputSchema },
  output: { schema: ServiceDescriptionOutputSchema },
  prompt: `Você é um copywriter sênior especializado em marcas de luxo masculinas.
  Escreva uma descrição sofisticada e atraente para um serviço da "Barbearia Inteligente".

  Dados do Serviço:
  - Nome: {{{name}}}
  - Preço: R$ {{{price}}}
  - Duração: {{{duration}}}

  Requisitos:
  - Máximo de 180 caracteres.
  - Destaque a experiência (relaxamento, precisão, estilo).
  - Use linguagem moderna e elegante.
  - Não mencione o preço na descrição.

  Gere apenas o texto da descrição.
  `,
});

const generateServiceDescriptionFlow = ai.defineFlow(
  {
    name: 'generateServiceDescriptionFlow',
    inputSchema: ServiceDescriptionInputSchema,
    outputSchema: ServiceDescriptionOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
