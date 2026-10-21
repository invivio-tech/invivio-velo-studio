# Arquitetura — velo-studio

App white-label que cada barbearia/salão recebe (um site e um banco por tenant).
Relação com o admin: ver `docs/contrato-admin-studio.md` (leitura obrigatória antes de mexer em `establishmentSettings`, `chats`, `appointments`, `users`, variáveis de ambiente ou `provision.yml`).

## Visão geral
- Next.js 15.5 (App Router, porta 9002), React 19, Tailwind 3 + shadcn/Radix.
- **Um mesmo código para todos os tenants.** O banco é escolhido por `NEXT_PUBLIC_FIREBASE_DATABASE_ID` (`src/firebase/config.ts`, `index.ts`, `admin.ts`).
- Login (Firebase Auth) e Storage são **compartilhados** por todos os tenants do projeto `invivio-velo-admin`.
- Distribuição: merge na `main` → o dono atualiza os clientes pela Central de Versões do admin (`client/<slug>` + `provision.yml`). Clientes podem ficar em versões diferentes por semanas.
- Sem CI nem deploy pela esteira.

## Perfis e áreas
| Perfil (`users.role`) | Áreas |
|---|---|
| visitante / `client` | `/`, `/agendar`, `/book-appointment`, `/services`, `/store`, `/club`, `/club/billing`, `/rewards`, `/account`, `/totem` (PIN) |
| `professional` | `/schedule`, `/services`, `/invoices`, `/agenda-view` |
| `admin` (dono) | `/dashboard`, `/schedule/*`, `/team/*`, `/clients/*`, `/categories`, `/admin/memberships*`, `/admin/subscribers`, `/admin/mensagens`, `/invoices`, `/financial-report`, `/promotions`, `/establishment`, `/sales-dashboard`, `/orders`, `/products/*`, `/product-categories` |

Menus por perfil em `src/components/layout/sidebar.tsx`. Módulos pagos protegidos por `PlanGate` (lê `planLimits`) e cobrança por `SubscriptionGuard` — **ambos só no navegador**.

## Dados (por banco de tenant)
`appointments`, `users` (+ `scheduleSettings/main`, `blockedTimes`), `establishmentSettings/main`, `services`, `serviceCategories`, `products`, `productCategories`, `orders`, `membershipPlans`, `userMemberships`, `membershipInvoices`, `loyaltyTransactions`, `blockedTimes`, `scheduleSettings`, `chats/{tel}/messages`, `professionalTransactions`, `expenses`, `recurringExpenses`, `pushLogs`, `campaigns`.
Campos compartilhados com o admin: ver contrato.

**Dados antigos:** tenants foram criados em épocas diferentes; documentos antigos podem não ter campos novos. Todo código deve tratar campo ausente.

## Módulos
| Área | Arquivos |
|---|---|
| Firebase | `src/firebase/` (client SDK, Admin SDK, hooks `use-collection`/`use-doc`, `auth/client.ts`, `messaging.ts`) |
| IA (Genkit, Gemini 2.5 Flash) | `src/ai/genkit.ts`, `src/ai/flows/*` — `booking-chatbot.ts` (server action pública `chatWithBookingBot`, espelha a lógica do bot do admin) e geradores de texto/paleta |
| APIs | `src/app/api/chat/send` (proxy para o admin), `api/send-push`, `api/upload`, `src/app/actions/uploadImage.ts` |
| Cloud Functions | `functions/index.js` (gatilhos de agendamento, lembretes, aniversário, retargeting, push agendado, reset mensal, `updateuserpassword`) — usam o banco `(default)` |
| Notificações | FCM web (`public/firebase-messaging-sw.js`), tokens em `users.fcmTokens` |
| Provisionamento | `.github/workflows/provision.yml` — **contrato com o admin**, nunca alterar sem mudança coordenada |

## Integrações externas (sempre com mock nos testes)
Gemini (Genkit), Firebase Cloud Messaging, admin Velo (`NEXT_PUBLIC_VELO_ADMIN_URL`).

## Riscos conhecidos (pré-existentes)
1. **`firestore.rules`: quase tudo `allow write: if request.auth != null`.** Como o login é compartilhado, um usuário de outro tenant satisfaz a regra; `users` permite que qualquer logado grave `role: 'admin'`.
2. `PlanGate`/`SubscriptionGuard` só no navegador — o dono do tenant pode alterar `planLimits`/`isExempt` no próprio banco.
3. Callable `updateuserpassword` recebe `databaseId` de quem chama e pode atingir usuários de outro tenant.
4. Rotas sem autenticação: `api/send-push`, `api/chat/send`, `api/upload` (pasta escolhida pelo cliente, devolve `stack`).
5. `chatWithBookingBot` público, usa Admin SDK (custo de Gemini, enumeração de clientes, prompt injection).
6. Cloud Functions só no banco `(default)` — provavelmente não rodam para os tenants em bancos nomeados.
7. Storage sem prefixo de tenant; `storage.rules` aceita escrita de qualquer logado.
8. Drift: `client/studiobarber` tem código fora da `main`.
