#!/usr/bin/env bash
# Avisa quando um subagente termina.
#
# Ligado ao hook SubagentStop em .claude/settings.json.
# O Claude Code entrega um JSON pela entrada padrao; aqui so precisamos do
# nome do agente, extraido sem depender de jq, que pode nao existir.
#
# Este script NUNCA falha: hook que quebra atrapalha o trabalho em vez de
# ajudar. Todo caminho termina em exit 0.

set -uo pipefail

PROJETO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${PROJETO_DIR}/.claude/subagentes.log"
QUANDO="$(date '+%Y-%m-%d %H:%M:%S')"

# --- entrada -----------------------------------------------------------------
ENTRADA=""
if [ ! -t 0 ]; then
  ENTRADA="$(cat 2>/dev/null || true)"
fi

extrai() {
  # extrai "chave" -> valor da primeira ocorrencia de "chave":"valor"
  printf '%s' "$ENTRADA" \
    | tr ',' '\n' \
    | grep -o "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" \
    | head -1 \
    | sed 's/.*:[[:space:]]*"//; s/"$//'
}

AGENTE="$(extrai subagent_type)"
[ -z "$AGENTE" ] && AGENTE="$(extrai agent_type)"
[ -z "$AGENTE" ] && AGENTE="$(extrai name)"
[ -z "$AGENTE" ] && AGENTE="subagente"

SESSAO="$(extrai session_id)"
[ -n "$SESSAO" ] && SESSAO=" sessao=${SESSAO:0:8}"

MSG="[${QUANDO}] terminou: ${AGENTE}${SESSAO}"

# --- registro ----------------------------------------------------------------
mkdir -p "$(dirname "$LOG")" 2>/dev/null || true
printf '%s\n' "$MSG" >>"$LOG" 2>/dev/null || true

# --- aviso na tela -----------------------------------------------------------
# stderr aparece no terminal sem poluir a saida que o Claude Code interpreta.
printf '\n\033[36m>> %s\033[0m\n' "$MSG" >&2

# --- aviso do sistema operacional --------------------------------------------
# Melhor esforco. Se nao der, segue em frente: o log ja registrou.
notifica_windows() {
  command -v powershell.exe >/dev/null 2>&1 || return 1
  powershell.exe -NoProfile -NonInteractive -Command "
    [console]::beep(880,150)
    try {
      Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
      \$n = New-Object System.Windows.Forms.NotifyIcon
      \$n.Icon = [System.Drawing.SystemIcons]::Information
      \$n.Visible = \$true
      \$n.ShowBalloonTip(4000, 'RDO digital', '${MSG}', 'Info')
      Start-Sleep -Milliseconds 4200
      \$n.Dispose()
    } catch { }
  " >/dev/null 2>&1
}

notifica_mac() {
  command -v osascript >/dev/null 2>&1 || return 1
  osascript -e "display notification \"${MSG}\" with title \"RDO digital\"" >/dev/null 2>&1
}

notifica_linux() {
  command -v notify-send >/dev/null 2>&1 || return 1
  notify-send "RDO digital" "$MSG" >/dev/null 2>&1
}

case "$(uname -s 2>/dev/null || echo desconhecido)" in
  MINGW* | MSYS* | CYGWIN* | Windows_NT) notifica_windows || true ;;
  Darwin) notifica_mac || true ;;
  Linux) notifica_linux || notifica_windows || true ;;
  *) : ;;
esac

exit 0
