---
description: Prepara o repositório para a esteira autônoma (testes, lint, tipos, higiene)
---

Esta é a primeira entrega da esteira neste repositório. Execute como uma issue normal (siga o fluxo de /deliver), com este escopo:

1. **Testes**: configure Vitest (ou mantenha o runner existente) com script `test`, e Playwright com script `test:e2e` rodando contra os emuladores de Auth/Firestore, com semeadura de um tenant de teste (ver `test-engineer`) e um teste de fumaça que abre a página inicial/login. Adicione `firebase.json` → `emulators` se não existir. Crie 3–5 testes unitários das regras de negócio mais críticas que você encontrar (ex.: carência/suspensão, consumo de créditos, cálculo de horários livres) — todos com mocks dos serviços externos.
2. **Lint**: se não houver config de ESLint, crie `eslint.config.mjs` (flat config, `eslint-config-next`) e o script `lint` como `eslint .` — o `next lint` foi descontinuado. Não corrija todos os avisos agora.
3. **Tipos**: rode `bash scripts/ci/ratchet.sh --update` para registrar a linha de base de erros de TypeScript em `.quality/baseline.json`.
4. **Higiene**: mova scripts soltos **versionados** da raiz (`patch_*.js`, `check_*.js`, `fix-*.mjs`, `list-*.mjs`, `query*.js`, `test-*.js`, logs `.log`, bancos `.db`) — o que for útil vai para `scripts/legacy/` com um README avisando que acessam produção e não devem ser executados por agentes; o que for lixo de depuração é removido do git. Não toque em arquivos não versionados. Atualize `.gitignore` (`*.log`, `*.db`, `scratch/`, `service-account*.json`, `.env*`).
5. **Segredos**: procure segredos versionados (`git grep -nE "AIza[0-9A-Za-z_-]{35}"`, workflows, configs, inclusive chaves "ofuscadas" em partes). Não altere o `provision.yml` (contrato com o admin). Para cada achado, abra uma issue `human-action` pedindo a rotação e descrevendo onde a chave está.
6. Atualize o `CLAUDE.md` com os comandos reais de teste/lint.
