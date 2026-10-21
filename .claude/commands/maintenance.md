---
description: Varredura semanal de saúde do repositório que gera issues priorizadas
---

Faça uma varredura de manutenção e transforme os achados em issues. Não altere código nesta execução.

**Ritmo controlado (sistema em produção):**
- Os riscos já listados em `docs/arquitetura.md` ("Riscos conhecidos") são conhecidos: crie no máximo **uma** issue por risco, sem `agent:go` — o dono decide quando liberar.
- Na **primeira** execução (não existe a issue "Relatório de manutenção"), não use `agent:go` em nenhuma issue.
- Nas demais, no máximo **2 issues com `agent:go` por semana** somando todas as categorias abaixo; o restante vai sem o rótulo.

1. **Vulnerabilidades**: `npm audit --json` (produção). Para cada vulnerabilidade ALTA/CRÍTICA sem issue aberta, crie uma issue com rótulo `security` (e `agent:go`, respeitando o ritmo acima).
2. **Segredos e configuração**: procure chaves/tokens versionados (`git grep -nE "AIza[0-9A-Za-z_-]{35}|sk-[A-Za-z0-9]{20,}|-----BEGIN (RSA )?PRIVATE KEY"`), regras do Firestore permissivas, rotas `/api/cron` sem verificação de segredo. Crie issues `security` (com `agent:go` só dentro do ritmo acima) para o que for corrigível em código; para o que exige ação humana (rotacionar chave, mexer no console), crie issue com rótulo `human-action` explicando o passo a passo.
3. **Qualidade**: número de erros de tipo (`bash scripts/ci/ratchet.sh --report`), scripts soltos na raiz, arquivos de log/banco versionados. Crie no máximo 2 issues `tech-debt` por semana, escolhendo as de maior impacto e menor risco.
4. Antes de criar qualquer issue, verifique duplicatas: `gh issue list --state open --search "<termo>"`.
5. Termine com um comentário-resumo na issue fixa "Relatório de manutenção" (crie se não existir, rótulo `report`).
