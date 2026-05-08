#!/usr/bin/env bash

_mysterygame_codex_route() {
  local workspace_root="/home/yusin/mysteryGame/app/agents"
  local target_codex_home=""
  local sentinel="__MYSTERYGAME_CODEX_HOME_WAS_UNSET__"

  case "$PWD/" in
    "$workspace_root/agent-1-platform-backend/"* )
      target_codex_home="/home/yusin/.codex-agent-homes/mysteryGame-agent1"
      ;;
    "$workspace_root/agent-2-gameplay-frontend/"* )
      target_codex_home="/home/yusin/.codex-agent-homes/mysteryGame-agent2"
      ;;
    "$workspace_root/agent-3-ai-admin-content/"* )
      target_codex_home="/home/yusin/.codex-agent-homes/mysteryGame-agent3"
      ;;
  esac

  if [ -n "$target_codex_home" ]; then
    if [ "${_MYSTERYGAME_CODEX_MANAGED:-0}" != "1" ]; then
      export _MYSTERYGAME_ORIGINAL_CODEX_HOME="${CODEX_HOME-$sentinel}"
    fi

    export CODEX_HOME="$target_codex_home"
    export _MYSTERYGAME_CODEX_MANAGED="1"
    return
  fi

  if [ "${_MYSTERYGAME_CODEX_MANAGED:-0}" = "1" ]; then
    if [ "${_MYSTERYGAME_ORIGINAL_CODEX_HOME:-$sentinel}" = "$sentinel" ]; then
      unset CODEX_HOME
    else
      export CODEX_HOME="$_MYSTERYGAME_ORIGINAL_CODEX_HOME"
    fi

    unset _MYSTERYGAME_ORIGINAL_CODEX_HOME
    unset _MYSTERYGAME_CODEX_MANAGED
  fi
}

_mysterygame_codex_args() {
  local workspace_root="/home/yusin/mysteryGame/app/agents"

  case "$PWD/" in
    "$workspace_root/agent-1-platform-backend/"* | \
    "$workspace_root/agent-2-gameplay-frontend/"* | \
    "$workspace_root/agent-3-ai-admin-content/"* )
      printf '%s\n' "-c" 'cli_auth_credentials_store="file"'
      ;;
  esac
}

case ";${PROMPT_COMMAND:-};" in
  *";_mysterygame_codex_route;"* )
    ;;
  * )
    if [ -n "${PROMPT_COMMAND:-}" ]; then
      PROMPT_COMMAND="_mysterygame_codex_route;$PROMPT_COMMAND"
    else
      PROMPT_COMMAND="_mysterygame_codex_route"
    fi
    export PROMPT_COMMAND
    ;;
esac

_mysterygame_codex_route

codex() {
  local extra_args=()

  _mysterygame_codex_route
  while IFS= read -r line; do
    extra_args+=("$line")
  done < <(_mysterygame_codex_args)

  command codex "${extra_args[@]}" "$@"
}
