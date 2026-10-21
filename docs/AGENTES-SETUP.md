# Setup da esteira de agentes

## 1. Segredos da organização (`invivio-tech` → Settings → Secrets and variables → Actions)
Crie uma vez como **segredos da organização** (valem para todos os repositórios):

| Segredo | O que é | Como obter |
|---|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` **ou** `ANTHROPIC_API_KEY` | Acesso ao Claude. O token OAuth usa sua assinatura Claude (Pro/Max); a API key cobra por uso. | Token: rode `claude setup-token` no terminal. API key: console.anthropic.com |
| `AGENT_GH_TOKEN` | Token do GitHub usado pelos agentes. **Necessário** porque PRs criados com o token padrão do Actions não disparam os workflows de revisão e segurança. | GitHub → Settings → Developer settings → Fine-grained token, dono `invivio-tech`, acesso aos repositórios, permissões: Contents, Pull requests, Issues, Workflows = Read and write; Actions, Metadata = Read. |

Variáveis opcionais da organização: `CLAUDE_MODEL` (padrão `opus`), `CLAUDE_REVIEW_MODEL` (ex.: `sonnet`, mais barato para revisões/manutenção), `GHAS_ENABLED=true` se tiver GitHub Advanced Security (habilita CodeQL).

## 2. Segredo do repositório
Crie o segredo de repositório `BUILD_ENV` com a configuração **pública** de build (as variáveis `NEXT_PUBLIC_*` de desenvolvimento, ex.: `invivio-velo-dev`), para os agentes conseguirem rodar `npm run build`.

> **Importante:** o `BUILD_ENV` é lido pelos agentes. Nunca coloque nele chaves de produção (Gemini, service account etc.).

Este repositório **não tem ambiente de deploy**: a produção dos clientes é publicada pelo velo-admin (`provision.yml`), como já é hoje.

## 3. Implantação em fases (projeto em produção)

| Fase | O que fazer | Risco para produção |
|---|---|---|
| **0. Instalar** | Numa branch `chore/esteira-agentes` (não na `main`), rode `bash agentes-setup/instalar.sh`, faça commit, push e abra um PR. | Nenhum — os workflows dos agentes não publicam nada. |
| **1. Ensaio dos agentes** | Abra uma issue pequena e inofensiva (ex.: "corrigir texto da página Sobre"). Acompanhe a esteira até o PR. Revise e só então faça merge. | Nenhum — o merge na `main` não chega aos clientes sozinho. |
| **2. Distribuição** | Atualize **um** cliente pela Central de Versões do velo-admin, teste, e só então os demais. | Controlado — você escolhe quem e quando. |

### Rollback
- Firebase Console (projeto `invivio-velo-admin`) → Hosting → site do cliente → histórico de versões → **Reverter** na versão anterior.
- Regras, índices e functions não são publicados pelo `provision.yml` (PRs que mexem nisso vêm com o rótulo `requer-deploy-manual`).

## 4. Primeiras issues sugeridas
1. "Bootstrap de qualidade" — `Executar o roteiro .claude/commands/bootstrap-quality.md`.

## Custos e limites
- Cada entrega usa de dezenas a poucas centenas de turnos do modelo. Use `CLAUDE_REVIEW_MODEL=sonnet` para reduzir custo das revisões.
- Ciclos de correção automática têm limite (3) para evitar loops.
