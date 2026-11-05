# Roadmap do Ecossistema Invivio Velo (Admin & Studio)

> **Data de Atualização:** 05 de Novembro de 2026  
> **Status Geral:** Carteira de Créditos 100% Funcional (Studio + Portal + Asaas)  
> **Repositórios:**
> - `velo-admin` (`invivio-tech/invivio-velo-admin`)
> - `barber/studio` (`invivio-tech/invivio-velo-studio`)

---

## 📌 Visão Geral da Arquitetura
O ecossistema é composto por dois repositórios complementares:
1. **`velo-admin`**: Painel central multi-tenant, gestão de versões, webhook da Meta (WhatsApp Cloud API com Gemini 2.5 Flash), integração Asaas, Portal do Assinante (`/portal`) e Carteira de Créditos central (`clients/{slug}/billing/wallet`).
2. **`barber/studio`**: Aplicação dos estabelecimentos/tenants (PWA, agenda, catálogo, loja, promoções e ferramentas de IA integradas via Genkit). Distribuído para cada cliente em branch dedicada `client/<slug>` através da Central de Versões.

---

## ✅ 1. O que já foi Concluído

### A. Segurança & Proteção de APIs (Hardening Completo)
- [x] **Autenticação nas Rotas do Admin:** Exigência de ID Token do Firebase via `authFetch` em todas as rotas de API do `velo-admin` (PR #1).
- [x] **Remoção de Segredos no Banco do Tenant:** Campos sensíveis e chaves de API (`planLimits`) foram retirados dos bancos públicos dos tenants e centralizados no banco default do admin.
- [x] **Regras de Segurança do Firestore por Papel:** Script `scripts/aplicar-regras-tenants.mjs` garantindo isolamento de leitura/escrita por papel (`admin`, `professional`, `customer`).
- [x] **Validação Criptográfica de Webhooks:** Validação da assinatura HMAC SHA-256 da Meta (`X-Hub-Signature-256`) e token secreto do Asaas.
- [x] **Proteção de Mídias e Disparos no Studio:** Rotas `/api/webhooks/whatsapp/send` e `/media` exigem token autenticado com `checkStudioCaller`, com fallback tolerante para versões anteriores.
- [x] **Proteção de Rotas Internas do Studio:** Proteção com `requireStaff` em `/api/upload`, `/api/send-push` e `/api/chat/send` (mergeado na `main` do `barber/studio`).

### B. Bot de Atendimento WhatsApp (Gemini 2.5 Flash)
- [x] **Hotfix de Exceção de Datas:** Resolução de cache/exceção indevida que informava estabelecimento fechado (ex: caso `schmitbarbershop` em 17/10).
- [x] **Validação de Duração vs Horário de Fechamento:** Prompt do bot ajustado para calcular a duração total dos procedimentos (ex: 2h) e recusar horários próximos ao encerramento do expediente.
- [x] **Consumo de Créditos no WhatsApp:** Webhook do WhatsApp calcula tokens consumidos pelo Gemini e debita atomicamente da carteira (`GEMINI_CHATBOT`).

### C. Carteira Pré-Paga de Créditos — Fase Backend (Admin)
- [x] **Módulo Atômico da Carteira:** Implementado em `src/lib/credits-wallet.ts` no `velo-admin` com suporte a transações ACID do Firestore (`consumeCredits`, `addCredits`, `getWalletBalance`, `getWalletTransactions`).
- [x] **Tabela de Custos Variáveis:** Configuração global em `systemSettings/variableCosts` (Tokens Gemini a ~R$ 0,005/1k, Templates Meta a R$ 0,48, Alerta de saldo baixo em R$ 10,00).
- [x] **Suporte a Clientes Isentos (`isExempt`):** Clientes com plano cortesia têm uso de IA e mensagens registrado como cortesia sem débito ou bloqueio.

### D. Carteira de Créditos — Fase A: Consumo no Studio
- [x] **API Central de Consumo:** Criada rota `/api/studio/wallet/consume` no `velo-admin` com validação de segurança via `checkStudioCaller`.
- [x] **Modo Pré-checagem (`dryRun`):** Verifica saldo antes de disparar o Gemini, evitando custos de API caso o cliente esteja sem créditos.
- [x] **Helper Central no Studio:** Criado [src/lib/studio-wallet.ts](file:///home/alberto/barber/studio/src/lib/studio-wallet.ts) com a função `withWalletGuard`.
- [x] **Integração dos 7 Fluxos de IA do Studio:**
  1. *Descrição de Serviços* (`ServiceForm.tsx` - `GEMINI_COPYWRITING`)
  2. *Descrição de Produtos* (`ProductForm.tsx` - `GEMINI_COPYWRITING`)
  3. *Benefícios de Clubes/Planos* (`MembershipPlanForm.tsx` - `GEMINI_COPYWRITING`)
  4. *Ofertas e Promoções* (`promotions/page.tsx` - `GEMINI_MARKETING`)
  5. *Textos Institucionais* (`establishment/page.tsx` - `GEMINI_COPYWRITING`)
  6. *Mensagem de Aniversário* (`establishment/page.tsx` - `GEMINI_COPYWRITING`)
  7. *Paleta de Cores da Logo* (`establishment/page.tsx` - `GEMINI_COPYWRITING`)
- [x] **Feedback na UI:** Toasts descritivos orientando o usuário a recarregar no portal caso o saldo esteja insuficiente.

### E. Carteira de Créditos — Fase B: Portal do Assinante & Recarga PIX
- [x] **Página da Carteira:** Criada em `/portal/credits` no `velo-admin` com saldo em tempo real, badges de status, pacotes de recarga (R$ 25, R$ 50, R$ 100, R$ 200 ou valor customizado) e tabela transparente de custos.
- [x] **Extrato Financeiro da Carteira:** Listagem detalhada das últimas 50 transações (Data, Tipo, Categoria, Tokens, Valor e Saldo Posterior).
- [x] **API do Portal:** Criada rota `/api/portal/credits` no `velo-admin` para consulta e geração de PIX.
- [x] **Cobrança Avulsa via PIX no Asaas:** Criada função `createOneOffPixPayment` em `src/lib/asaas.ts` e exibição do QR Code + Código Copia e Cola no modal.
- [x] **Compensação Automática via Webhook:** Identificação do prefixo `velo_credits:{slug}:{timestamp}` no webhook Asaas, creditando o saldo imediatamente após o pagamento sem interferir na assinatura mensal.
- [x] **Navegação do Portal:** Adicionado menu "Carteira de Créditos" na sidebar do layout e banner de acesso rápido na Home do Portal.

---

## 🚀 2. O que Precisa Ser Feito (Backlog Priorizado)

### Prioridade 1: Deploy & Homologação em Produção
1. **Deploy do `velo-admin` para Produção:**
   - Publicar as novas rotas (`/api/studio/wallet/consume`, `/api/portal/credits`, `/portal/credits` e atualizações do webhook Asaas):
     ```bash
     firebase deploy --only hosting
     ```
2. **Atualização Piloto de um Cliente:**
   - Na Central de Versões do `velo-admin`, selecionar um cliente piloto (ex: `linuxbarber5`) e clicar em **Atualizar Versão** para validar em produção os fluxos com `withWalletGuard`.

### Prioridade 2: Melhorias de Experiência e Faturamento
1. **Notificação de Saldo Baixo no WhatsApp do Dono:**
   - Disparar um aviso via WhatsApp ou Push quando o saldo da carteira cair abaixo de R$ 10,00, contendo link direto para recarga no Portal.
2. **Recarga com Cartão de Crédito no Portal:**
   - Permitir recarga imediata cobrando no cartão já cadastrado na assinatura mensal do Asaas (1-clique sem precisar de PIX).
3. **Auto-Recarga Configurável (Recarga Automática):**
   - Permitir que o assinante marque a opção *"Recarregar R$ 50,00 automaticamente no cartão sempre que o saldo for inferior a R$ 10,00"*.

### Prioridade 3: Resiliência e Concorrência do Bot WhatsApp
1. **Agendamento Atômico do Bot WhatsApp:**
   - Envolver a criação de agendamento em transação atômica no Firestore do tenant, prevenindo que dois clientes marquem simultaneamente o mesmo profissional no mesmo minuto.
2. **Deduplicação de Mensagens da Meta:**
   - Salvar o `message.id` da Meta em cache/Firestore por 60 segundos para evitar processamento duplicado caso a Meta reenvie o webhook por timeout de rede.

### Prioridade 4: Recursos Opcionais / Internos
1. **Ativação do Copiloto Interno (Superadmin):**
   - Caso desejado, conectar o componente `CopilotChat.tsx` no `src/app/layout.tsx` para suporte interno em linguagem natural sobre clientes e faturamento.
2. **Esteira de Agentes Autônomos (`chore/esteira-agentes`):**
   - Avaliar o merge das branches de CI/CD de agentes quando a equipe desejar operar desenvolvimento por issues do GitHub.
