'use server';

import { runGuardedAI } from '@/lib/ai-guard';
import type { AIGuardError } from '@/lib/ai-guard-types';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const BirthdayMessageInputSchema = z.object({
  name: z.string().describe('The name of the establishment.'),
  context: z.string().optional().describe('Additional context about the establishment style or tone.'),
});
export type BirthdayMessageInput = z.infer<typeof BirthdayMessageInputSchema>;

const BirthdayMessageOutputSchema = z.object({
  birthdayTitle: z.string().describe('A short, catchy birthday notification title.'),
  birthdayMessage: z.string().describe('A warm birthday message for the client.'),
});
export type BirthdayMessageOutput = z.infer<typeof BirthdayMessageOutputSchema>;

const prompt = ai.definePrompt({
  name: 'birthdayMessagePrompt',
  input: { schema: BirthdayMessageInputSchema },
  output: { schema: BirthdayMessageOutputSchema },
  prompt: `Você é um redator de marketing para a empresa {{{name}}}.
  {{#if context}}
  Contexto do estabelecimento: {{{context}}}
  {{/if}}

  Sua tarefa é criar uma mensagem de feliz aniversário curta e calorosa para ser enviada via notificação push para os clientes.
  
  Gere:
  1. Um título curto e festivo (birthdayTitle), ex: "Feliz Aniversário! 🎂"
  2. Uma mensagem carinhosa (birthdayMessage) que mencione o nome do estabelecimento e deseje um dia incrível ao cliente.
  
  Mantenha o tom profissional mas amigável.
  `,
});

export async function generateBirthdayMessage(
  idToken: string,
  input: z.infer<typeof BirthdayMessageInputSchema>,
): Promise<z.infer<typeof BirthdayMessageOutputSchema> | AIGuardError> {
  return runGuardedAI(
    idToken,
    { category: 'GEMINI_COPYWRITING', description: 'IA: Mensagem de aniversário para clientes', estimatedTokens: 300 },
    () => generateBirthdayMessageFlow(input),
  );
}

const generateBirthdayMessageFlow = ai.defineFlow(
  {
    name: 'generateBirthdayMessage',
    inputSchema: BirthdayMessageInputSchema,
    outputSchema: BirthdayMessageOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
