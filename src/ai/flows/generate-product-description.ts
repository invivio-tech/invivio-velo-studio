'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a barbershop product description.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ProductDescriptionInputSchema = z.object({
  name: z.string().describe('O nome do produto.'),
  price: z.number().describe('O preço de venda do produto.'),
  categoryName: z.string().optional().describe('A categoria do produto.'),
  establishmentName: z.string().optional().describe('O nome da barbearia.'),
  nicheContext: z.string().optional().describe('Contexto da barbearia (ex: clássica, moderna, urbana).'),
});
export type ProductDescriptionInput = z.infer<typeof ProductDescriptionInputSchema>;

const ProductDescriptionOutputSchema = z.object({
  description: z.string().describe('A descrição gerada do produto.'),
});
export type ProductDescriptionOutput = z.infer<typeof ProductDescriptionOutputSchema>;

const prompt = ai.definePrompt({
  name: 'productDescriptionPrompt',
  input: { schema: ProductDescriptionInputSchema },
  output: { schema: ProductDescriptionOutputSchema },
  prompt: `Você é um copywriter sênior especializado em e-commerce de alto desempenho e produtos de beleza/grooming masculino.
  Sua tarefa é criar uma descrição de produto IRRESISTÍVEL para a barbearia "{{{establishmentName}}}".
  
  Contexto da Barbearia: {{{nicheContext}}}

  Dados do Produto:
  - Nome: {{{name}}}
  - Preço: R$ {{{price}}}
  - Categoria: {{{categoryName}}}

  Instruções de Copywriting (Técnicas de Vendas):
  1. Use uma estrutura baseada em BENEFÍCIOS, não apenas características.
  2. Comece com um gancho forte que prenda a atenção do cliente.
  3. Explore o "desejo de status" ou a "solução de um problema" (ex: cabelo difícil de modelar, barba ressecada).
  4. Use gatilhos mentais como exclusividade, autoridade da barbearia e transformação visual.
  5. Tom de voz: Profissional, masculino, sofisticado e persuasivo.
  6. Mantenha o texto entre 300 e 600 caracteres para ser direto mas completo.
  7. Não mencione o preço explicitamente no texto, foque no VALOR do produto.
  
  Retorne apenas a 'description' no formato solicitado.
  `,
});

export async function generateProductDescription(input: ProductDescriptionInput): Promise<ProductDescriptionOutput> {
  const { output } = await prompt(input);
  return output!;
}
