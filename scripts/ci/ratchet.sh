#!/usr/bin/env bash
# Catraca de qualidade: o número de erros de TypeScript (e de ESLint, se configurado)
# nunca pode AUMENTAR em relação a .quality/baseline.json. Quando diminuir, a linha
# de base é atualizada (rode com --update e faça commit).
#   bash scripts/ci/ratchet.sh            -> verifica (falha se piorou)
#   bash scripts/ci/ratchet.sh --update   -> grava a linha de base atual
#   bash scripts/ci/ratchet.sh --report   -> só imprime os números
set -uo pipefail
MODE="${1:-check}"
BASELINE=".quality/baseline.json"
mkdir -p .quality

ts_errors=$(npx --no-install tsc --noEmit --pretty false 2>/dev/null | grep -c "error TS" || true)

eslint_errors=0
if ls eslint.config.* .eslintrc* >/dev/null 2>&1 && [ -x node_modules/.bin/eslint ]; then
  eslint_errors=$(npx --no-install eslint . --format json 2>/dev/null \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).reduce((a,f)=>a+f.errorCount,0))}catch{console.log(0)}})')
fi

echo "TypeScript: $ts_errors erro(s) | ESLint: $eslint_errors erro(s)"
[ -n "${GITHUB_STEP_SUMMARY:-}" ] && echo "**Catraca** — TypeScript: $ts_errors · ESLint: $eslint_errors" >> "$GITHUB_STEP_SUMMARY"

write_baseline() { printf '{\n  "typescriptErrors": %s,\n  "eslintErrors": %s\n}\n' "$ts_errors" "$eslint_errors" > "$BASELINE"; echo "Linha de base gravada em $BASELINE"; }

case "$MODE" in
  --report) exit 0 ;;
  --update) write_baseline; exit 0 ;;
esac

if [ ! -f "$BASELINE" ]; then
  echo "Sem linha de base; criando agora (rode com --update e faça commit para fixá-la)."
  write_baseline; exit 0
fi

base_ts=$(node -p "require('./$BASELINE').typescriptErrors ?? 0")
base_es=$(node -p "require('./$BASELINE').eslintErrors ?? 0")
status=0
if [ "$ts_errors" -gt "$base_ts" ]; then echo "::error::Erros de TypeScript aumentaram: $base_ts -> $ts_errors"; status=1; fi
if [ "$eslint_errors" -gt "$base_es" ]; then echo "::error::Erros de ESLint aumentaram: $base_es -> $eslint_errors"; status=1; fi
if [ $status -eq 0 ] && { [ "$ts_errors" -lt "$base_ts" ] || [ "$eslint_errors" -lt "$base_es" ]; }; then
  echo "::notice::Qualidade melhorou ($base_ts -> $ts_errors TS). Rode 'bash scripts/ci/ratchet.sh --update' e faça commit."
fi
exit $status
