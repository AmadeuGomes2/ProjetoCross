#!/usr/bin/env bash
# Roda npm audit depois de uma edicao.
#
# Ligado ao hook PostToolUse (Edit|Write) em .claude/settings.json.
#
# So audita quando o que mudou foi package.json ou o lockfile. Auditar a cada
# edicao de codigo nao muda o resultado e so gasta tempo: a arvore de
# dependencias nao mudou.
#
# Nunca derruba a edicao. Vulnerabilidade vira aviso visivel, para que o agente
# trate, e nao um erro que impede de salvar arquivo.

set -uo pipefail

PROJETO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJETO_DIR" || exit 0

ENTRADA=""
if [ ! -t 0 ]; then
  ENTRADA="$(cat 2>/dev/null || true)"
fi

ARQUIVO="$(printf '%s' "$ENTRADA" \
  | tr ',' '\n' \
  | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -1 \
  | sed 's/.*:[[:space:]]*"//; s/"$//')"

[ -z "$ARQUIVO" ] && exit 0

case "$ARQUIVO" in
  *package.json | *package-lock.json) ;;
  *) exit 0 ;;
esac

[ -d node_modules ] || exit 0

if ! SAIDA="$(npm audit --audit-level=moderate 2>&1)"; then
  {
    printf '\nnpm audit encontrou vulnerabilidade apos mudanca em %s:\n' "$ARQUIVO"
    printf '%s\n' "$SAIDA" | head -40
    printf '\nLembrete: o pacote xlsx do npm e proibido neste projeto\n'
    printf '(CVE-2023-30533). O override de uuid em 11.1.1 precisa continuar\n'
    printf 'no package.json. Ver CLAUDE.md, secao Stack e comandos.\n'
  } >&2
fi

exit 0
