# Contrato entre velo-admin e velo-studio

> **Este arquivo é idêntico nos repositórios `invivio-velo-admin` e `invivio-velo-studio`.**
> Qualquer PR que altere algo listado aqui é uma **mudança coordenada**: a spec deve dizer o que muda do outro lado,
> e o PR deve trazer o rótulo `contrato` e a seção "🔗 Mudança coordenada" com o PR/issue correspondente no outro repositório.
> Ao alterar este arquivo, copie a nova versão para o outro repositório no PR correspondente.

## Por que isto importa
- Cada agente roda em **um** repositório e não enxerga o outro.
- O admin grava no **banco do tenant** dados que o studio lê, e vice-versa.
- Toda mudança na `main` do studio chega a **todos os clientes** na próxima atualização pela Central de Versões; clientes ficam semanas em versões diferentes. Por isso as mudanças precisam ser **compatíveis para trás**: o studio novo tem de funcionar com dados gravados pelo admin antigo e o admin novo com studios antigos ainda publicados.

## 1. Modelo de tenant
| Item | Valor |
|---|---|
| Projeto Firebase | `invivio-velo-admin` (todos os tenants) |
| Banco do tenant | Firestore **nomeado**, `databaseId` = slug do cliente (`southamerica-east1`) |
| Site do tenant | Firebase Hosting multi-site, `site_id` = slug (ou variação, se ocupado) |
| Login | Firebase Auth **compartilhado** por todos os tenants |
| Storage | Bucket **compartilhado** por todos os tenants |
| Cadastro central | Banco `(default)`, coleção `clients/{slug}` (campo `firebaseDatabaseId`, `firebaseHostingSiteId`) |
| Branch do tenant | `client/<slug>` no repo do studio — só o admin cria, atualiza e apaga |

Tenants legados podem estar no projeto `invivio-velo` (ex.: `barbeariaeastside`).

## 2. Distribuição (admin → GitHub do studio)
- `src/lib/github-api.ts` (admin) faz merge `main` → `client/<slug>` e dispara `workflow_dispatch` do `.github/workflows/provision.yml` (studio) com `ref = client/<slug>`.
- **Inputs do `provision.yml`:** `site_id`, `database_id`, `gemini_api_key` (opcional). Renomear, remover ou tornar obrigatório um input quebra o provisionamento e a atualização de todos os clientes.
- O admin acompanha a conclusão pelo **último run da branch** `client/<slug>`.

## 3. Variáveis de ambiente do studio (geradas pelo `provision.yml`)
`NEXT_PUBLIC_FIREBASE_DATABASE_ID`, `NEXT_PUBLIC_FIREBASE_{API_KEY,AUTH_DOMAIN,PROJECT_ID,STORAGE_BUCKET,MESSAGING_SENDER_ID,APP_ID,MEASUREMENT_ID}`, `GEMINI_API_KEY`, `GOOGLE_GENAI_API_KEY`.
Não definidas hoje (o código usa fallback): `NEXT_PUBLIC_VELO_ADMIN_URL` (→ `https://invivio-velo-admin.web.app`), `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.
Variável nova que o studio exija precisa ser adicionada ao `provision.yml` **e** ter fallback seguro.

## 4. Dados iniciais gravados pelo admin no banco do tenant (`seedInitialData`, `gcp-provisioning.ts`)
- `establishmentSettings/main`: `name`, `businessCategory`, `heroTitle`, `heroSubtitle`, `primaryColor` (HSL `"217 91% 60%"`), `hostingUrl`, `createdAt`, `planLimits`, `isExempt` (+ status abaixo se isento).
- `users/admin_temp_uid` e `users/invivio_tech_admin_uid`: `{ name, email, role: 'admin', createdAt }`. O studio (`src/firebase/auth/client.ts`) usa esses documentos como "convite": no primeiro login com aquele e-mail, o usuário vira `admin`.

## 5. `establishmentSettings/main` — campos que o ADMIN escreve e o STUDIO lê
| Campo | Tipo | Quem escreve (admin) | Quem lê (studio) |
|---|---|---|---|
| `planLimits` | objeto: `planKey`, `team`, `store`, `club`, `rewards`, `marketing`, `financial`, `whatsappBot{enabled, phoneNumberId, systemToken, webhookVerifyToken, hasLineManagement}`, `geminiApiKey` | `limits/route.ts`, provisionamento | `PlanGate`, sidebar, BottomNav, dashboard, `team/new`, `products/new`, `/` |
| `isExempt` | boolean | `limits/route.ts`, `clients/[slug]` PATCH | `SubscriptionGuard` |
| `status` | `'active' \| 'in_grace_period' \| 'suspended'` | webhook Asaas, cron | `SubscriptionGuard` |
| `subscriptionStatus` | string (idem) | webhook Asaas, cron, limits | `SubscriptionGuard` |
| `isSuspended` | boolean | webhook Asaas, cron, limits | `SubscriptionGuard` |
| `inGracePeriod` | boolean | webhook Asaas, cron, limits | `SubscriptionGuard` |
| `gracePeriodUntil` | data ISO | webhook Asaas | `SubscriptionGuard` (tolerância de 10 dias calculada no navegador) |
| `latestDueDate`, `latestInvoiceUrl` | string | webhook Asaas | `SubscriptionGuard` |
| `overdueDays`, `suspendedAt` | number / ISO | webhook Asaas, cron | — |

⚠️ `planLimits` contém **segredos** (`systemToken`, `webhookVerifyToken`, `geminiApiKey`) e é copiado para o banco do tenant, que o navegador do studio lê. Não adicione mais segredos aqui; o caminho certo é removê-los do documento lido pelo cliente (issue de segurança).

## 6. `establishmentSettings/main` — campos que o STUDIO escreve e o ADMIN (bot do WhatsApp) lê
`botName`, `businessTone`, `context`, `about`, `address`, `instagram`, `whatsapp`, `aiTimeoutHours` (padrão 12), `slotIntervalMinutes`, `loyaltyPercentage`.

## 7. Coleções do tenant que o bot do WhatsApp (admin) lê e escreve
O bot (`src/app/api/webhooks/whatsapp/route.ts` no admin) opera diretamente no banco do tenant. Mudar o formato destas coleções no studio quebra o bot:
- **Lê:** `services`, `users` (profissionais e clientes, por telefone), `scheduleSettings` (`workingHours` com `startTime`/`endTime`), `blockedTimes`, `membershipPlans`, `userMemberships`, `appointments`.
- **Cria `appointments`** com: `customerId`, `customerName`, `customerEmail`, `customerPhoneNumber`, `customerPhotoURL`, `professionalId`, `professionalName`, `serviceId`, `serviceName`, `servicePrice`, `serviceDuration`, `startTime`, `endTime`, `status`, `type`, `notes`, `source`, `isSubscriptionUsage`, `reminderSent`, `createdAt`.
- **Cancela/lista** `appointments` por `customerPhoneNumber` + `status` + `startTime` (índice composto obrigatório no banco do tenant).

## 8. Chat do WhatsApp — `chats/{telefone}` e `chats/{telefone}/messages`
| Campo | Escrito por | Observação |
|---|---|---|
| `chats/{tel}.aiEnabled` | bot (admin), `whatsapp/send` (admin, grava `false`), tela `/admin/mensagens` (studio, alterna) | `false` = atendimento humano; o bot reativa sozinho após `aiTimeoutHours` |
| `chats/{tel}.lastMessage`, `lastMessageAt` | admin | o studio ordena por `lastMessageAt desc` |
| `messages.role` | admin | `'user'` (cliente), `'ai'` (bot), `'human'` (atendente) — o studio renderiza por esses três valores |
| `messages.content`, `timestamp` | admin | |

## 9. Chamadas HTTP do studio para o admin
| Rota no admin | Chamada por (studio) | Corpo / parâmetros | Autenticação hoje |
|---|---|---|---|
| `POST /api/webhooks/whatsapp/send` | `src/app/api/chat/send/route.ts` | `{ databaseId, to, text }` | **nenhuma** |
| `GET /api/webhooks/whatsapp/media?mediaId=&tenantId=` | `/admin/mensagens` | query string | **nenhuma** |

Proteger essas rotas exige **transição em duas etapas**: (1) o admin passa a aceitar e registrar o segredo/token, sem exigir; o studio passa a enviar; todos os clientes são atualizados pela Central de Versões; (2) só então o admin passa a exigir.

## 10. Regras do Firestore dos tenants
- Na criação, o admin publica `allow read, write: if true` no banco novo (`applyDefaultFirestoreRules`).
- O `provision.yml` **não** publica regras; o `firebase.json` do studio lista só alguns bancos. O estado real por banco deve ser conferido no console.
- Qualquer mudança de regras dos tenants precisa definir **quem publica** (admin no provisionamento ou deploy manual) e testar no emulador contra as telas do studio e contra o bot.
