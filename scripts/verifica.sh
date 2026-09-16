#!/usr/bin/env bash
# Roda eslint e vitest depois de uma edicao.
#
# Ligado ao hook PostToolUse (Edit|Write) em .claude/settings.json.
#
# So roda quando o arquivo editado e codigo. Editar um .md nao precisa
# disparar a suite: hook lento treina todo mundo a ignorar hook.
#
# Saida diferente de zero devolve o erro ao agente, que e o comportamento
# desejado aqui: lint quebrado ou teste vermelho precisa ser visto na hora.

set -uo pipefail

PROJETO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJETO_DIR" || exit 0

ENTRADA=""
if [ ! -t 0 ]; then
  ENTRADA="$(cat 2>/dev/null || true)"
fi

# Caminho do arquivo editado, extraido sem depender de jq.
ARQUIVO="$(printf '%s' "$ENTRADA" \
  | tr ',' '\n' \
  | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -1 \
  | sed 's/.*:[[:space:]]*"//; s/"$//')"

# Sem caminho identificado, nao adivinha: sai quieto.
[ -z "$ARQUIVO" ] && exit 0

case "$ARQUIVO" in
  *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs) ;;
  *) exit 0 ;;
esac

[ -d node_modules ] || exit 0

FALHOU=0

if ! SAIDA_LINT="$(npx --no-install eslint "$ARQUIVO" 2>&1)"; then
  printf 'eslint reprovou %s:\n%s\n' "$ARQUIVO" "$SAIDA_LINT" >&2
  FALHOU=1
fi

if ! SAIDA_TESTE="$(npx --no-install vitest run --silent 2>&1)"; then
  printf 'vitest reprovou:\n%s\n' "$(printf '%s' "$SAIDA_TESTE" | tail -30)" >&2
  FALHOU=1
fi

exit "$FALHOU"
