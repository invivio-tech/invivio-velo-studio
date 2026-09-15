# 🗺️ Roadmap — Invivio Care
> Plataforma SaaS Multi-Cliente para Clínicas Veterinárias e Saúde Animal  
> **Stack:** Next.js 15 · Firebase · Genkit · TypeScript · Tailwind CSS  
> **Versão atual:** v1.00056 (branch `main`)

---

## ✅ Fase 1 — Base e Conversão (CONCLUÍDA)

> Migração da base "Barbearia Inteligente" para o domínio de saúde/veterinária.

- [x] Migração de contexto: barbearia → clínica veterinária / pets
- [x] Sidebar com terminologia correta (Pacientes, Procedimentos, Equipe, Dashboard Clínico)
- [x] Módulo de Pets (`/pets`) com prontuário básico, vínculo ao tutor, filtro por espécie
- [x] Módulo de Retornos (`/followups`) — gestão de pacientes com retorno médico pendente
- [x] Chatbot de agendamento via Genkit + Gemini 2.0 Flash
- [x] Conclusão de atendimento com anotações clínicas criptografadas (`/lib/encryption.ts`)
- [x] `CompleteServiceDialog` com campo de follow-up e upload de fotos
- [x] Visão Agenda (`/agenda-view`) com atualização em tempo real
- [x] Sistema de temas dinâmicos (IA sugere paleta via logo)
- [x] Cloud Functions: aniversário, re-targeting (push), notificações
- [x] Infraestrutura SaaS multi-tenant (Firebase multi-project + GitHub branches)
- [x] Painel Admin (`invivio-care-admin`): provisionamento automatizado de clientes
- [x] CI/CD via GitHub Actions (deploy automático por branch/cliente)
- [x] Limpeza completa de textos de barbearia residuais

---

## ✅ Fase 2 — Ajustes e Consistência de UI/UX (CONCLUÍDA)

> Interface alinhada com o domínio de saúde conforme a `businessCategory`.

### 2.1 — Ícones e Iconografia
- [x] Substituir `<BarberPoleIcon>` na sidebar pelo `<Stethoscope>` do lucide-react
      - Arquivo: `src/components/layout/sidebar.tsx`
- [x] Substituir ícone `<Scissors>` no `AgendaViewPage` por `<Stethoscope>`
      - Arquivo: `src/app/agenda-view/page.tsx`
- [x] Substituir ícone `<Scissors>` no `BookingChat.tsx` por `<BookOpen>`

### 2.2 — Textos e Mensagens do Chatbot
- [x] Atualizar mensagem inicial do bot em `BookingChat.tsx` — de ✂️ para 🩺
- [x] Prompt do Genkit flow `booking-chatbot.ts` já está correto (contexto de saúde)

### 2.3 — Init Script (`scripts/init-prod.js`)
- [x] Atualizar `heroTitle`, `heroSubtitle` para genéricos de saúde
- [x] Adicionado `businessCategory: 'general_practice'` e `businessTone: 'friendly'`

### 2.4 — Página de Estabelecimento (`/establishment`)
- [x] `businessCategory` alinhado com `CareCategory` do `care-terms.ts`
- [x] Select com todas as especialidades agrupadas: "Saúde Humana" e "Saúde Animal"

---

## ✅ Fase 3 — Módulos Clínicos (CONCLUÍDA)

> Estes módulos são genéricos e funcionam para qualquer categoria de saúde.
> A UI usa `getCareTerms()` para os rótulos e `getCareCapabilities()` para visibilidade.
> O modelo de dado é **único** — o que muda é o contexto.

### 3.1 — Prontuário Clínico por Atendimento (`healthRecords: true` → todas as categorias)
- [x] Tela de histórico de evoluções clínicas por paciente (`/clients/[id]/records`)
- [x] Listar todos os atendimentos concluídos com notas criptografadas, fotos e data
- [x] Coleção Firestore: Nova coleção `users/{clientId}/records` segura via rules

### 3.2 — Imunizações / Vacinas (`vaccination: true` → vet, pediatria, clínica geral)
- [x] Módulo de registro de vacinas aplicadas por paciente (`/clients/[id]/vaccines`)
- [x] Campos: nome da vacina, data de aplicação, próxima dose, lote, profissional

### 3.3 — Prescrições e Documentos (`prescriptions: true` → médicos, vet, planos terapêuticos)
- [x] Geração de documento pós-atendimento (receita, plano, protocolo) (`/clients/[id]/prescriptions`)
- [x] Campos: tipo (receita/plano/protocolo), conteúdo, data, profissional, URL do PDF
- [x] Geração de PDF client-side

### 3.4 — Exames e Laudos (`labResults: true` → maioria das categorias clínicas)
- [x] Upload de arquivos (PDF, imagem) vinculados ao paciente e ao atendimento (`/clients/[id]/exams`)
- [x] Campos: nome do exame, data, solicitado por (profissional), URL do arquivo, observações

### 3.5 — Módulo de Pets (`petProfiles: true` → somente `isVetCategory()`)
- [x] Tela `/pets` com prontuário básico do animal
- [x] Integrar histórico clínico do pet à sua página de perfil
- [x] Vincular vacinas, exames e prescrições ao pet quando `petProfiles: true`

---

## ✅ Fase 4 — SaaS Multi-Tenant e Monetização (CONCLUÍDA)

> Foco no controle de clientes, provisionamento, segurança e limits (Paywalls).

### 4.1 — Provisionamento Automático
- [x] API de criação de novo cliente (`/api/provision`)
- [x] Provisioning automatizado: Firestore DB isolado + Firebase Hosting site + GitHub branch + CI/CD
- [x] Suporte a múltiplos slugs de URL (opções de domínio)
- [x] **Gerenciamento de domínios customizados** (`/api/clients/[slug]/domains`)

### 4.2 — Controle de Limits, Billing Manual e Paywalls
- [x] Controle de acesso e visibilidade aos módulos dinâmicos (Add-ons granulares)
- [x] Fiscalização de Limites: Restringir adição de profissionais caso cota atingida
- [x] Paywalls: Exibir Landing Page interna de Upgrade nas rotas cujo módulo não está contratado
- [x] Baixa Manual de Inadimplência: Botão **Suspender / Reativar Cliente** no Velo Health Admin

### 4.3 — Auditoria, Segurança e Inbox
- [x] Sistema de audit log (`src/lib/audit-logger.ts`)
- [x] **Caixa de Entrada WhatsApp (Inbox Híbrida):** Permite ver mensagens e pausar a IA (`aiEnabled=false`) assumindo o controle manualmente pelo painel da clínica (`/admin/mensagens`).

### 4.4 — Onboarding Assistido
- [x] Tela de bloqueio obrigatória de primeiro acesso
- [x] Definição de Dados do Estabelecimento e **Tom da Inteligência Artificial** (Amigável, Premium, Formal, etc.)

---

## 🚀 Fase 5 — Expansão, Integrações e Lançamento Oficial (ATUAL)

### 5.1 — Integração de Catálogo / PDV (CONCLUÍDO)
- [x] Tela para venda de produtos na clínica (Estoque, Petshop)
- [x] Emissão simplificada de Recibos/Faturas

### 5.2 — Landing Page Pública do Produto (invivio.com.br)
- [ ] Site de marketing do produto Invivio Care
- [ ] Formulário de "Quero meu sistema" → dispara provisionamento automático no Admin (Self-service onboarding)

### 5.3 — App Mobile para Pacientes (PWA)
- [ ] Versão de Tutores / Pacientes para login e visualização dos Exames, Receitas e Prontuários do Pet

### 5.4 — Notificações Automatizadas via IA / WhatsApp
- [ ] Lembrete automático de retorno médico
- [ ] Aviso X dias antes do vencimento da próxima dose de vacina

---

## 🎯 Próximas Ações Sugeridas (Fase 5)

1. **Landing Page de Vendas (Self-Service)** — Permitir que novas clínicas contratem o sistema sozinhas, disparando o webhook de provisionamento automaticamente.
2. **Notificações Automáticas (Lembretes)** — Usar o Cloud Functions para ler exames e vacinas e mandar um Push/WhatsApp lembrando o tutor de marcar a próxima consulta com a IA.
3. **App Mobile para Pacientes (PWA)** — Interface web instalável para o tutor acompanhar o Prontuário.

---

*Última atualização: 2026-09-02 | v1.00056*
