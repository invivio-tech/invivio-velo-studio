'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating brand color suggestions based on logo analysis.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ThemePaletteInputSchema = z.object({
  logoUrl: z.string().describe('The URL of the establishment logo image.'),
  businessCategory: z.string().optional().describe('The business category context (e.g. barbershop, beauty_salon).'),
  businessTone: z.string().optional().describe('The business tone context (e.g. luxury, friendly).'),
});
export type ThemePaletteInput = z.infer<typeof ThemePaletteInputSchema>;

const ThemePaletteOutputSchema = z.object({
  primaryColor: z.string().describe('Space-separated HSL value for primary color, e.g., "217 91% 60%"'),
  primaryForegroundColor: z.string().describe('Space-separated HSL value for text on primary color, e.g., "0 0% 100%"'),
  secondaryColor: z.string().describe('Space-separated HSL value for secondary color, e.g., "210 10% 65%"'),
  secondaryForegroundColor: z.string().describe('Space-separated HSL value for text on secondary color, e.g., "220 15% 6%"'),
  backgroundColor: z.string().describe('Space-separated HSL value for background, e.g., "220 15% 6%"'),
  foregroundColor: z.string().describe('Space-separated HSL value for text on background, e.g., "210 20% 95%"'),
  cardColor: z.string().describe('Space-separated HSL value for card backgrounds, e.g., "222 47% 11%"'),
  accentColor: z.string().describe('Space-separated HSL value for accent details, e.g., "215 60% 20%"'),
  borderColor: z.string().describe('Space-separated HSL value for borders, e.g., "210 15% 25%"'),
  reasoning: z.string().describe('A detailed reasoning in Portuguese explaining the color choices based on the logo.'),
});
export type ThemePaletteOutput = z.infer<typeof ThemePaletteOutputSchema>;

async function imageUrlToDataUri(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get('content-type') || 'image/png';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error('Error converting image URL to data URI:', error);
    return url; // fallback to URL
  }
}

export async function generateThemePalette(input: ThemePaletteInput): Promise<ThemePaletteOutput> {
  // Convert logo URL to base64 data URI to pass to multimodal Gemini model securely
  const dataUri = await imageUrlToDataUri(input.logoUrl);
  return generateThemePaletteFlow({
    ...input,
    logoUrl: dataUri,
  });
}

const prompt = ai.definePrompt({
  name: 'themePalettePrompt',
  input: { schema: ThemePaletteInputSchema },
  output: { schema: ThemePaletteOutputSchema },
  prompt: `Você é um designer de interfaces (UI/UX) sênior e especialista em branding e identidade visual.
  Sua tarefa é analisar o logotipo fornecido e sugerir uma paleta de cores moderna, harmoniosa e de alta qualidade (premium) para o site/landing page do estabelecimento.

  Contexto do Negócio:
  - Categoria do negócio: {{{businessCategory}}}
  - Tom da comunicação: {{{businessTone}}}

  Logo do estabelecimento: {{media url=logoUrl}}

  Gere as cores no formato HSL (apenas números separados por espaços, por exemplo: "217 91% 60%"), adequadas para CSS/Tailwind (ex: "217 91% 60%").
  
  Você deve sugerir cores que combinem perfeitamente com a logo analisada.
  Para manter a estética sofisticada e elegante do aplicativo, use um tema predominantemente escuro (dark mode premium) ou com alto contraste e elegância:
  1. primaryColor: Cor principal de destaque (geralmente a cor mais forte da logo ou uma cor complementar muito bonita). Ex: "217 91% 60%".
  2. primaryForegroundColor: Texto sobre a cor primária (geralmente branco puro ou preto, dependendo do contraste). Ex: "0 0% 100%".
  3. secondaryColor: Cor secundária de apoio. Ex: "210 10% 65%".
  4. secondaryForegroundColor: Texto sobre a cor secundária. Ex: "220 15% 6%".
  5. backgroundColor: Cor de fundo principal da página (deve ser um preto ou cinza escuro elegante e harmonioso com o restante da marca). Ex: "220 15% 6%" ou "222 47% 4%".
  6. foregroundColor: Cor de texto principal (deve contrastar com o fundo, geralmente um off-white ou cinza muito claro). Ex: "210 20% 95%".
  7. cardColor: Cor de fundo para cards e popovers (deve ser ligeiramente mais clara que o background para criar elevação). Ex: "222 47% 11%".
  8. accentColor: Cor de destaque secundário (pode ser usado em detalhes sutis). Ex: "215 60% 20%".
  9. borderColor: Cor para bordas sutis e divisores (normalmente um cinza ou azul bem escuro). Ex: "210 15% 25%".
  10. reasoning: Justificativa em português (1-2 parágrafos) explicando a escolha técnica de cores e como elas se alinham com a logo, a categoria do negócio e o tom especificados.

  Certifique-se de que todas as cores fornecidas tenham contraste adequado e gerem um visual luxuoso.
  `,
});

const generateThemePaletteFlow = ai.defineFlow(
  {
    name: 'generateThemePaletteFlow',
    inputSchema: ThemePaletteInputSchema,
    outputSchema: ThemePaletteOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
