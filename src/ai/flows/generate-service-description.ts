'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a barbershop service description.
 *
 * - generateServiceDescription - A function that generates a compelling service description.
 * - ServiceDescriptionInput - The input type for the generateServiceDescription function.
 * - ServiceDescriptionOutput - The return type for the generateServiceDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
  input: {schema: ServiceDescriptionInputSchema},
  output: {schema: ServiceDescriptionOutputSchema},
  prompt: `Você é um redator de marketing especialista em barbearias.
  Sua tarefa é criar uma descrição curta, atraente e convidativa para um serviço de barbearia.
  A descrição deve destacar a qualidade e a experiência, e ter no máximo 150 caracteres.

  Detalhes do Serviço:
  - Nome: {{{name}}}
  - Preço: R$ {{{price}}}
  - Duração: {{{duration}}}

  Gere apenas a descrição do serviço.
  `,
});

const generateServiceDescriptionFlow = ai.defineFlow(
  {
    name: 'generateServiceDescriptionFlow',
    inputSchema: ServiceDescriptionInputSchema,
    outputSchema: ServiceDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
