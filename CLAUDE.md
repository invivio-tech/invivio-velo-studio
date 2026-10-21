# Invivio Velo — Studio (app do cliente)

SaaS multi-tenant para barbearias/salões: agendamento inteligente, fidelidade, assinaturas, chat, portal do cliente, IA.
**Faz parte do produto Velo junto com `invivio-velo-admin`** (painel que provisiona e administra os tenants).
Cada tenant tem uma branch `client/<slug>`, um site do Firebase Hosting e um banco Firestore nomeado, provisionados pelo workflow `.github/workflows/provision.yml` (disparado pelo velo-admin via API do GitHub).

## Stack
- Next.js 15.5 (App Router, porta 9002), React 19, TypeScript, Tailwind 3 + shadcn/ui
- Firebase: produção `invivio-velo` (alvos `main`, `eastside`), staging `invivio-velo-dev`, sites de clientes no projeto `invivio-velo-admin` (alvo `site-cliente`)
- Firestore com múltiplos bancos nomeados (ex.: `salaodadudu7`, `studiobarber`) — o banco é escolhido por `NEXT_PUBLIC_FIREBASE_DATABASE_ID`
- Cloud Functions em `functions/`; IA com Genkit
- Playwright instalado (scripts E2E soltos na raiz serão migrados para `e2e/`)

## Pontos de atenção
- **Isolamento entre tenants é o requisito de segurança nº 1.** Nenhuma consulta pode atravessar bancos/tenants.
- Mudanças que afetam o provisionamento (`provision.yml`, variáveis de ambiente por tenant) devem ser coordenadas com o velo-admin — registre na spec.
- `provision.yml` recebe a chave do Gemini como input do workflow (fica visível nos logs) — mover para segredo.
- **Este repositório não tem CI nem deploy pela esteira.** Fluxo: PR dos agentes → o dono faz o merge na `main` → o dono atualiza os clientes pelo velo-admin (Central de Versões: merge `main` → `client/<slug>` + `provision.yml`). Build, testes e catraca são verificados pelos próprios agentes antes de abrir o PR.
- Nunca altere, crie ou apague branches `client/*`, nem rode `provision.yml` — são gerenciados pelo velo-admin.
- Toda mudança na `main` chega a TODOS os clientes na próxima atualização: trate a `main` como produção.

## Regras para todos os agentes
- Idioma: código em inglês quando o projeto já usa inglês; textos de interface, commits, specs e PRs em **português do Brasil**.
- Fuso horário de negócio: `America/Sao_Paulo`.
- Nunca leia nem versione `.env*`, `service-account*.json` ou chaves. Configuração pública vai em variáveis `NEXT_PUBLIC_*`; segredos no Secret Manager / segredos do GitHub.
- Nunca execute deploy, scripts contra produção ou escrita no Firestore real. Use o emulador.
- Não crie scripts soltos na raiz. Scripts de manutenção vão em `scripts/` com nome descritivo.
- `next.config` está com `typescript.ignoreBuildErrors`/`eslint.ignoreDuringBuilds` (herança do Firebase Studio). O gate real de tipos é a catraca `bash scripts/ci/ratchet.sh`: **não pode piorar**. Não remova essas flags sem uma issue específica.
- Specs anteriores em `docs/specs/` são a memória do projeto — leia as relacionadas antes de decidir.
- **Este sistema está em produção com clientes reais.** Prefira mudanças pequenas e reversíveis; nada de refatoração ampla sem issue específica.
- A atualização pelo velo-admin (`provision.yml`) publica **somente o hosting** — regras e índices dos bancos dos tenants **não** são publicados por ela (ver `docs/contrato-admin-studio.md`, seção 10). Se o PR alterar `firestore.rules`, `firestore.indexes.json`, `storage.rules` ou `functions/`, adicione o rótulo `requer-deploy-manual` e uma seção "⚠️ Deploy manual necessário" no PR com o comando exato.
- Mudança de dados existentes (migração/backfill) exige script idempotente em `scripts/`, com modo de simulação (`--dry-run`) como padrão; nunca é executado pelos agentes.

## Comandos
| Ação | Comando |
|---|---|
| Instalar | `npm ci` |
| Dev | `npm run dev` |
| Catraca de tipos/lint | `bash scripts/ci/ratchet.sh` |
| Testes | `npm test` (após bootstrap de qualidade) |
| E2E | `npm run test:e2e` (após bootstrap) |
| Build | `npm run build` |

## Documentação de referência (leitura obrigatória para os agentes)
- `docs/arquitetura.md` — perfis, módulos, dados, integrações e riscos conhecidos deste repositório.
- `docs/contrato-admin-studio.md` — tudo que o studio e o admin compartilham (idêntico nos dois repositórios). Mudou algo dali → mudança coordenada.

## Esteira
Ver `docs/AGENTES.md`. Branch de integração: `main`. Branches de agentes: `agent/issue-<n>-<slug>`.
