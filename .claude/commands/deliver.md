---
description: Pipeline completo de uma issue — requisitos → arquitetura → código → testes → segurança → revisão → PR
argument-hint: <número da issue>
---

Você é o **ORQUESTRADOR** da esteira de desenvolvimento autônoma deste repositório. Entregue a issue #$ARGUMENTS como um Pull Request pronto para o dono do projeto apenas revisar e aprovar.

Branch base: `main`. Branch de trabalho: `agent/issue-$ARGUMENTS-<slug-curto>`.

## Princípios
- **Autonomia total**: não faça perguntas ao humano. Decida, registre premissas e siga. A única exceção é BLOQUEIO real (ver requirements-analyst).
- **Delegue** cada fase ao subagente especializado (ferramenta Task/Agent) e passe para ele o número da issue, o caminho da spec e a branch base.
- **Gates**: não avance de fase com gate vermelho. Ciclos de correção têm limite de 3 voltas por gate; se estourar, abra o PR como *draft* explicando o que falta.

## Fases
0. **Preparação**
   - `gh issue view $ARGUMENTS --comments`
   - `gh issue edit $ARGUMENTS --add-label agent:working --remove-label agent:go`
   - `git fetch origin && git checkout -B agent/issue-$ARGUMENTS-<slug> origin/main`
   - Se já existir PR aberto para esta issue, continue nele em vez de criar outro (`gh pr list --head agent/issue-$ARGUMENTS`).
1. **Requisitos** → subagente `requirements-analyst`. Gate: `docs/specs/$ARGUMENTS-*.md` com `STATUS: PRONTO`.
   - Se `STATUS: BLOQUEADO`: comente a pergunta na issue (`gh issue comment`), troque o rótulo para `agent:blocked`, faça commit+push da spec e PARE.
2. **Arquitetura** → subagente `architect`. Gate: seção "Plano técnico" completa.
   - Commit: `docs(spec): especificação e plano da #$ARGUMENTS`.
3. **Implementação** → subagente `developer`.
4. **Testes** → subagente `test-engineer`. Bugs encontrados voltam para `developer`.
5. **Verificação local** (você mesmo roda):
   - `npm ci` (se ainda não rodou), `bash scripts/ci/ratchet.sh`, `npm test --if-present`, `npm run build`.
   - Falhou → `developer`/`test-engineer` corrigem → repita.
6. **Revisão** → rode **em paralelo** `security-reviewer` e `code-reviewer` sobre `origin/main...HEAD`.
   - Bloqueantes → `developer` corrige → nova revisão (máx. 3 voltas).
7. **Pull Request**
   - `git push -u origin HEAD`
   - Crie o PR para `main` com `gh pr create` usando o corpo abaixo, rótulo `agent:pr` e `Closes #$ARGUMENTS`.
   - Se o PR toca `docs/contrato-admin-studio.md` (ou o que ele descreve): `gh label create contrato --color 5319E7 --force` e adicione o rótulo `contrato`. Se o próprio arquivo do contrato mudou, abra uma issue no outro repositório (`gh issue create -R invivio-tech/<outro-repo>`, rótulo `contrato`, **sem** `agent:go`) descrevendo a parte do outro lado e cite-a no PR.
   - Troque o rótulo da issue para `agent:pr` e comente o link do PR na issue.

## Corpo do PR
```markdown
Closes #<n>

## O que muda (linguagem de negócio)
<2–5 linhas para o dono do produto>

## Spec
docs/specs/<arquivo>.md

## Critérios de aceite
- [x] CA1 — <nome> — coberto por `<arquivo de teste>`

## Premissas assumidas pelos agentes
<copie da spec; o revisor humano deve conferir estas>

## Segurança
<veredito + tabela do security-reviewer>

## Qualidade
- Tipos (catraca): <antes → depois>
- Testes: <n passaram>
- Build: OK

## Riscos e rollback
<do plano técnico>

## 🔗 Mudança coordenada
<somente se toca o contrato admin ↔ studio: o que muda, o que o outro repositório precisa fazer (link da issue) e a ordem de publicação segura; senão remova esta seção>

## ⚠️ Deploy manual necessário
<somente se o PR altera firestore.rules, firestore.indexes.json, storage.rules ou functions/: o que acontece na publicação conforme a seção de deploy do CLAUDE.md e o comando exato; senão remova esta seção>
```

Ao final, responda com um resumo curto: link do PR, premissas mais importantes e qualquer ponto que exija atenção humana.
