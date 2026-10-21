# Esteira de desenvolvimento por agentes

Este repositório é evoluído por uma equipe de agentes de IA (Claude Code) rodando no GitHub Actions.
**Seu papel: escrever o que você quer numa issue e aprovar o PR.** O resto é automático.

```
Issue (rótulo agent:go)
   │
   ▼
┌─────────────── agent-deliver.yml (orquestrador: .claude/commands/deliver.md) ───────────────┐
│ requirements-analyst → architect → developer → test-engineer → [build/testes/catraca]       │
│        → security-reviewer ∥ code-reviewer → (correções, até 3 voltas) → abre PR             │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
   │
   ▼  PR aberto
Segurança (gitleaks, Semgrep, npm audit) + agent-review.yml (2ª opinião)
   ▼
VOCÊ revisa e faz o merge na main   ← único ponto humano
   │
   ▼
VOCÊ atualiza os clientes no velo-admin (Central de Versões: main → client/<slug> + provision.yml)
```

Este repositório **não tem CI nem deploy pela esteira**: build, testes e catraca rodam dentro do `agent-deliver.yml`, antes de o PR ser aberto.

## Como usar no dia a dia
| Quero… | Faça |
|---|---|
| Nova funcionalidade ou bug | Abra uma issue pelo modelo (já vem com `agent:go`). Pode ser curta. |
| Ajustar um PR dos agentes | Comente no PR: `@claude troque X por Y`. |
| Re-tentar uma issue que falhou | Comente `/agente` na issue. |
| Pergunta ou análise sem código | Comente `@claude <pergunta>` numa issue. |
| Liberar para produção | Faça o merge do PR na `main` e atualize os clientes pela Central de Versões do velo-admin (pode começar por um cliente só). |

### Rótulos
- `agent:go` — inicia a esteira · `agent:working` — em andamento · `agent:pr` — PR aberto
- `agent:blocked` — precisa de você (o motivo está no último comentário)
- `human-action` — tarefa que só um humano pode fazer (ex.: rotacionar chave no console)
- `agent:review` — força nova revisão automática de um PR

### Quando os agentes vão te chamar
Só quando for **impossível** decidir sozinho: falta credencial, decisão de negócio irreversível, ou 3 tentativas de correção falharam.
Nos demais casos eles decidem e registram as **premissas** no PR — confira-as na revisão.

## Garantias de qualidade (gates)
- **Catraca de tipos/lint** (`scripts/ci/ratchet.sh`): o número de erros nunca pode aumentar; cada PR pode baixar.
- **Testes**: cada critério de aceite da spec tem teste automatizado.
- **Segurança**: nenhum segredo, nenhuma vulnerabilidade alta/crítica nova, nenhum achado Semgrep novo de severidade ERROR; revisão AppSec com veredito.
- Agentes **não podem**: fazer deploy manual, fazer merge, aprovar PR, `push --force`, ler `.env`/service accounts.

## Configuração (uma vez por organização/repositório)
Ver `docs/AGENTES-SETUP.md`.

## Arquivos
- `CLAUDE.md` — contexto do projeto que todo agente lê.
- `.claude/agents/` — definição de cada agente.
- `.claude/commands/` — roteiros (deliver, review-pr, maintenance, bootstrap-quality). Também funcionam localmente: `claude` → `/deliver 42`.
- `docs/specs/` — specs geradas (memória do projeto).
