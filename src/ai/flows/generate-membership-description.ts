'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MembershipDescriptionInputSchema = z.object({
  name: z.string().describe('The name of the membership plan.'),
  price: z.string().describe('The monthly price of the plan.'),
  servicesCount: z.number().describe('Number of services included.'),
  limitText: z.string().describe('Text representation of the usage limit.'),
});
export type MembershipDescriptionInput = z.infer<typeof MembershipDescriptionInputSchema>;

const MembershipDescriptionOutputSchema = z.object({
  description: z.string().describe('The generated compelling description for the membership plan.'),
  imagePrompt: z.string().describe('A detailed prompt for generating an image of this plan using an AI image generator (like Midjourney or DALL-E).'),
});
export type MembershipDescriptionOutput = z.infer<typeof MembershipDescriptionOutputSchema>;

export async function generateMembershipDescription(input: MembershipDescriptionInput): Promise<MembershipDescriptionOutput> {
  return generateMembershipDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'membershipDescriptionPrompt',
  input: { schema: MembershipDescriptionInputSchema },
  output: { schema: MembershipDescriptionOutputSchema },
  prompt: `Você é um copywriter especialista em clubes de assinatura para barbearias e salões e um excelente direcionador de IA para imagens.
  Escreva uma descrição altamente persuasiva (benefícios) para um pacote do Clube de Vantagens e um prompt de imagem em inglês.
  
  Dados do Plano:
  - Nome: {{{name}}}
  - Preço: R$ {{{price}}} / mês
  - Serviços Inclusos: {{{servicesCount}}} serviço(s)
  - Limite Mensal: {{{limitText}}}

  Requisitos:
  - Máximo de 200 caracteres para a descrição comercial.
  - O texto da descrição deve convencer o cliente de que assinar este plano é o melhor custo-benefício.
  - Destaque a previsibilidade (sempre no estilo) ou a economia.
  - Tom moderno, direto e engajador na descrição.
  - Não coloque o preço no texto da descrição.
  - O 'imagePrompt' deve ser uma descrição altamente detalhada, em inglês, focada na estética, iluminação e composição visual de uma foto profissional/premium para gerar uma imagem representativa desse pacote de assinatura (ex: cliente elegante saindo da barbearia, texturas ricas de produtos, ambiente de luxo).
  
  Gere a descrição ('description') e o prompt de imagem em inglês ('imagePrompt').
  `,
});

const generateMembershipDescriptionFlow = ai.defineFlow(
  {
    name: 'generateMembershipDescriptionFlow',
    inputSchema: MembershipDescriptionInputSchema,
    outputSchema: MembershipDescriptionOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
