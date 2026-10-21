---
description: Revisão independente de um PR (código + segurança) com comentário consolidado
argument-hint: <número do PR>
---

Revise o PR #$ARGUMENTS.

1. `gh pr view $ARGUMENTS` e `gh pr diff $ARGUMENTS`. Identifique a branch base do PR.
2. Rode em paralelo os subagentes `security-reviewer` e `code-reviewer` sobre o diff do PR.
3. Se o PR referencia uma spec em `docs/specs/`, confira se cada critério de aceite tem teste correspondente.
4. Publique UM comentário consolidado no PR (`gh pr comment $ARGUMENTS --body-file ...`) com:
   - Veredito geral: ✅ Pronto para merge | ⚠️ Mudanças necessárias
   - As duas tabelas/listas dos revisores
   - Checklist de critérios de aceite × testes
5. Se houver bloqueantes **e** a branch do PR começar com `agent/`, corrija-os você mesmo (subagente `developer`), rode os testes e o build, faça commit `fix(review): ... [review-fix]` e push. Faça no máximo 1 rodada de correção automática por execução.
6. Não aprove nem faça merge do PR — isso é do humano.
