'use server';

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

export const generateBirthdayMessage = ai.defineFlow(
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
