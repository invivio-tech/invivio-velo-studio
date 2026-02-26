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
  name: z.string().describe('The name of the service.'),
  price: z.string().describe('The price of the service.'),
  duration: z.string().describe('The duration of the service.'),
  establishmentName: z.string().optional().describe('The name of the establishment.'),
  nicheContext: z.string().optional().describe('The context or niche of the establishment.'),
  imageStylePrompt: z.string().optional().describe('The desired visual style for the image prompt.'),
});
export type ServiceDescriptionInput = z.infer<typeof ServiceDescriptionInputSchema>;

const ServiceDescriptionOutputSchema = z.object({
  description: z.string().describe('The generated service description.'),
  imagePrompt: z.string().optional().describe('A detailed prompt for generating an image of this service using an AI image generator (like Midjourney or DALL-E).'),
});
export type ServiceDescriptionOutput = z.infer<typeof ServiceDescriptionOutputSchema>;

export async function generateServiceDescription(input: ServiceDescriptionInput): Promise<ServiceDescriptionOutput> {
  return generateServiceDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'serviceDescriptionPrompt',
  input: { schema: ServiceDescriptionInputSchema },
  output: { schema: ServiceDescriptionOutputSchema },
  prompt: `Você é um copywriter sênior e um excelente direcionador de IA para imagens.
  Escreva uma descrição sofisticada e atraente para um serviço do estabelecimento "{{{establishmentName}}}".
  
  Contexto do Negócio e Público Alvo: {{{nicheContext}}}

  Dados do Serviço:
  - Nome: {{{name}}}
  - Preço: R$ {{{price}}}
  - Duração: {{{duration}}}

  Requisitos:
  - Máximo de 180 caracteres para a descrição comercial.
  - Destaque a experiência (bem-estar, precisão, estilo, relaxamento) na descrição, focando no nicho.
  - Use linguagem moderna e elegante e que case com o negócio.
  - Não mencione o preço na descrição.
  - O 'imagePrompt' deve ser uma descrição altamente detalhada, em inglês, focada na estética, iluminação e composição visual de uma foto profissional para gerar a imagem exata do serviço. 
  - A imagem deve seguir a seguinte direção de fotografia/estilo visual da marca: {{{imageStylePrompt}}}

  Gere a descrição ('description') e o prompt em inglês ('imagePrompt').
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
