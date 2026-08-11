#!/usr/bin/env bash

# Nora TrimTex — reliable macOS production launcher.
# Builds in an isolated directory, switches localhost:4000 only after success,
# then opens a Cloudflare Quick Tunnel and prints the public URL.

set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
RUN_DIR="$PROJECT_DIR/.run"
BUILD_DIR="$PROJECT_DIR/.next-build"
LIVE_DIR="$PROJECT_DIR/.next-live"
BACKUP_DIR="$PROJECT_DIR/.next-backup"
BUILD_LOG="$RUN_DIR/build.log"
APP_LOG="$RUN_DIR/site.log"
TUNNEL_LOG="$RUN_DIR/cloudflared.log"
PORT=4000

NODE_BIN=""
CLOUDFLARED_BIN=""
CURL_BIN=""
APP_PID=""
TUNNEL_PID=""
OWNS_RUNTIME=0

green='\033[0;32m'
yellow='\033[0;33m'
red='\033[0;31m'
bold='\033[1m'
reset='\033[0m'

say() {
  printf "%b\n" "$1"
}

die() {
  say "${red}Ошибка: $1${reset}" >&2
  exit 1
}

stop_pid() {
  local pid="${1:-}"
  [ -n "$pid" ] || return 0
  kill -0 "$pid" 2>/dev/null || return 0
  kill "$pid" 2>/dev/null || true
  local attempt
  for attempt in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
    kill -0 "$pid" 2>/dev/null || return 0
    sleep 0.1
  done
  kill -9 "$pid" 2>/dev/null || true
}

remove_own_pid_file() {
  local file="$1"
  local expected="$2"
  [ -f "$file" ] || return 0
  [ "$(cat "$file" 2>/dev/null || true)" = "$expected" ] && rm -f "$file"
}

cleanup() {
  local status=$?
  trap - EXIT INT TERM
  if [ "$OWNS_RUNTIME" -eq 1 ]; then
    say "\n${yellow}Останавливаю сайт и туннель...${reset}"
    stop_pid "$TUNNEL_PID"
    stop_pid "$APP_PID"
    remove_own_pid_file "$RUN_DIR/cloudflared.pid" "$TUNNEL_PID"
    remove_own_pid_file "$RUN_DIR/site.pid" "$APP_PID"
  fi
  exit "$status"
}
trap cleanup EXIT INT TERM

find_node() {
  local bundled="/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
  if [ -x "$bundled" ]; then
    printf '%s\n' "$bundled"
  elif command -v node >/dev/null 2>&1; then
    command -v node
  else
    die "Node.js не найден. Установите Node.js 22 LTS или запустите скрипт из Codex."
  fi
}

find_cloudflared() {
  if [ -n "${CLOUDFLARED_BIN:-}" ] && [ -x "${CLOUDFLARED_BIN:-}" ]; then
    printf '%s\n' "$CLOUDFLARED_BIN"
    return
  fi
  if command -v cloudflared >/dev/null 2>&1; then
    command -v cloudflared
    return
  fi

  local tools_dir="$PROJECT_DIR/.tools"
  local binary="$tools_dir/cloudflared"
  if [ ! -x "$binary" ]; then
    [ -x "$CURL_BIN" ] || die "curl не найден"
    mkdir -p "$tools_dir"
    local arch
    case "$(uname -m)" in
      arm64) arch="arm64" ;;
      x86_64) arch="amd64" ;;
      *) die "Неподдерживаемая архитектура Mac: $(uname -m)" ;;
    esac
    say "${yellow}Загружаю официальный Cloudflared...${reset}" >&2
    "$CURL_BIN" -fL --retry 3 \
      "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-${arch}.tgz" \
      -o "$tools_dir/cloudflared.tgz"
    tar -xzf "$tools_dir/cloudflared.tgz" -C "$tools_dir"
    rm -f "$tools_dir/cloudflared.tgz"
    chmod +x "$binary"
  fi
  printf '%s\n' "$binary"
}

hydrate_macos_files() {
  local critical_file
  for critical_file in \
    "$PROJECT_DIR/package.json" \
    "$PROJECT_DIR/node_modules/next/package.json" \
    "$PROJECT_DIR/node_modules/next/dist/bin/next"; do
    [ -f "$critical_file" ] || die "Не найден файл зависимости: $critical_file. Выполните pnpm install."
    /usr/bin/head -c 1 "$critical_file" >/dev/null \
      || die "Не удалось прочитать зависимости. Проверьте синхронизацию iCloud и повторите запуск."
  done

  [ "$(uname -s)" = "Darwin" ] || return 0
  command -v brctl >/dev/null 2>&1 || return 0

  local remaining
  remaining="$(find "$PROJECT_DIR/node_modules" -flags +dataless -type f 2>/dev/null | wc -l | tr -d ' ')"
  [ "${remaining:-0}" -gt 0 ] || return 0

  say "${yellow}iCloud выгрузила ${remaining} файлов зависимостей. Возвращаю их на диск...${reset}"
  find "$PROJECT_DIR/node_modules" -flags +dataless -type f -exec brctl download {} + || true

  local attempt
  for attempt in {1..120}; do
    remaining="$(find "$PROJECT_DIR/node_modules" -flags +dataless -type f 2>/dev/null | wc -l | tr -d ' ')"
    [ "${remaining:-0}" -eq 0 ] && return 0
    if [ $((attempt % 4)) -eq 0 ]; then
      say "${yellow}Осталось загрузить из iCloud: ${remaining}${reset}"
    fi
    sleep 2.5
  done

  die "iCloud не вернула ${remaining} файлов за 5 минут. Освободите место на диске и повторите запуск."
}

build_once() {
  rm -rf "$BUILD_DIR"
  : > "$BUILD_LOG"
  set +e
  NEXT_DIST_DIR=".next-build" \
  NEXT_TELEMETRY_DISABLED=1 \
  NODE_ENV=production \
  "$NODE_BIN" "$PROJECT_DIR/node_modules/next/dist/bin/next" build --turbopack \
    2>&1 | /usr/bin/tee "$BUILD_LOG"
  local result=${PIPESTATUS[0]}
  set -e
  return "$result"
}

build_site() {
  local attempt=1
  while [ "$attempt" -le 2 ]; do
    if build_once; then
      return 0
    fi
    if [ "$attempt" -eq 1 ] && grep -Eq 'Expected workStore|workUnitAsyncStorage|/_global-error|/_not-found' "$BUILD_LOG"; then
      say "${yellow}Next.js сообщил внутреннюю ошибку prerender. Повторяю из полностью чистой изолированной папки...${reset}"
      attempt=$((attempt + 1))
      continue
    fi
    return 1
  done
  return 1
}

stop_previous_runtime() {
  local pid_file old_pid
  for pid_file in "$RUN_DIR/cloudflared.pid" "$RUN_DIR/site.pid"; do
    if [ -f "$pid_file" ]; then
      old_pid="$(cat "$pid_file" 2>/dev/null || true)"
      if [ -n "$old_pid" ]; then
        say "${yellow}Останавливаю предыдущий процесс проекта (PID ${old_pid})...${reset}"
        stop_pid "$old_pid"
      fi
      rm -f "$pid_file"
    fi
  done

  if command -v lsof >/dev/null 2>&1; then
    local pid
    for pid in $(lsof -tiTCP:${PORT} -sTCP:LISTEN 2>/dev/null || true); do
      say "${yellow}Освобождаю порт ${PORT} (PID ${pid})...${reset}"
      stop_pid "$pid"
    done
  fi
}

wait_for_site() {
  local path="${1:-/ru}"
  local attempt
  for attempt in {1..80}; do
    if ! kill -0 "$APP_PID" 2>/dev/null; then
      tail -80 "$APP_LOG" >&2 || true
      return 1
    fi
    if "$CURL_BIN" -fsS "http://127.0.0.1:${PORT}${path}" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.5
  done
  tail -80 "$APP_LOG" >&2 || true
  return 1
}

prepare_standalone() {
  local standalone="$BUILD_DIR/standalone"
  [ -f "$standalone/server.js" ] || die "Next.js не создал standalone-сервер"
  mkdir -p "$standalone/.next-build"
  ln -sfn ../../static "$standalone/.next-build/static"
  rm -rf "$standalone/public"
  ln -s "$PROJECT_DIR/public" "$standalone/public"
}

activate_build() {
  stop_previous_runtime
  rm -rf "$BACKUP_DIR"
  if [ -d "$LIVE_DIR" ]; then
    mv "$LIVE_DIR" "$BACKUP_DIR"
  fi
  mv "$BUILD_DIR" "$LIVE_DIR"

  : > "$APP_LOG"
  PORT="$PORT" HOSTNAME="127.0.0.1" \
    "$NODE_BIN" "$LIVE_DIR/standalone/server.js" >"$APP_LOG" 2>&1 &
  APP_PID=$!
  OWNS_RUNTIME=1
  printf '%s\n' "$APP_PID" > "$RUN_DIR/site.pid"

  if ! wait_for_site "/ru" \
    || ! "$CURL_BIN" -fsS "http://127.0.0.1:${PORT}/ru/catalog" >/dev/null; then
    stop_pid "$APP_PID"
    rm -rf "$LIVE_DIR"
    if [ -d "$BACKUP_DIR" ]; then
      mv "$BACKUP_DIR" "$LIVE_DIR"
      PORT="$PORT" HOSTNAME="127.0.0.1" \
        "$NODE_BIN" "$LIVE_DIR/standalone/server.js" >"$APP_LOG" 2>&1 &
      APP_PID=$!
      printf '%s\n' "$APP_PID" > "$RUN_DIR/site.pid"
      if wait_for_site "/ru"; then
        # Leave the restored localhost running when this invocation exits.
        OWNS_RUNTIME=0
      fi
    fi
    die "новая сборка не запустилась; предыдущая версия восстановлена"
  fi

  rm -rf "$BACKUP_DIR"
}

start_tunnel() {
  : > "$TUNNEL_LOG"
  "$CLOUDFLARED_BIN" tunnel --url "http://127.0.0.1:${PORT}" --no-autoupdate \
    >"$TUNNEL_LOG" 2>&1 &
  TUNNEL_PID=$!
  printf '%s\n' "$TUNNEL_PID" > "$RUN_DIR/cloudflared.pid"

  local public_url=""
  local attempt
  for attempt in {1..90}; do
    if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
      tail -80 "$TUNNEL_LOG" >&2 || true
      die "Cloudflare Tunnel завершился во время запуска"
    fi
    public_url="$(grep -aEo 'https://[a-z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" | tail -1 || true)"
    [ -n "$public_url" ] && break
    sleep 1
  done
  [ -n "$public_url" ] || die "Cloudflare не выдал публичную ссылку"

  for attempt in {1..60}; do
    grep -aq 'Registered tunnel connection' "$TUNNEL_LOG" && break
    kill -0 "$TUNNEL_PID" 2>/dev/null || die "Cloudflare Tunnel остановился до регистрации"
    sleep 0.5
  done
  grep -aq 'Registered tunnel connection' "$TUNNEL_LOG" \
    || die "Cloudflare выдал адрес, но не зарегистрировал соединение"

  printf '%s/ru\n' "$public_url" > "$RUN_DIR/public-url.txt"
  say "\n${green}${bold}============================================================${reset}"
  say "${green}${bold}  САЙТ ДОСТУПЕН: ${public_url}/ru${reset}"
  say "${green}${bold}============================================================${reset}"
  say "${yellow}Не закрывайте окно. Для остановки нажмите Ctrl+C.${reset}"
  say "Локально: http://localhost:${PORT}/ru"
  say "Логи: $BUILD_LOG, $APP_LOG, $TUNNEL_LOG\n"
}

cd "$PROJECT_DIR"
mkdir -p "$RUN_DIR"
NODE_BIN="$(find_node)"
CURL_BIN="$(command -v curl 2>/dev/null || true)"
[ -x "$CURL_BIN" ] || CURL_BIN="/usr/bin/curl"
CLOUDFLARED_BIN="$(find_cloudflared)"
[ -f "$PROJECT_DIR/node_modules/next/dist/bin/next" ] \
  || die "Зависимости не установлены"

say "${bold}1/4  Проверяю локальные зависимости...${reset}"
hydrate_macos_files

say "${bold}2/4  Собираю новую версию отдельно от работающего сайта...${reset}"
say "Node.js: $("$NODE_BIN" --version)"
say "Next.js: Turbopack, изолированная production-сборка"
unset CATALOG_API_URL NEXT_PUBLIC_API_URL CATALOG_FALLBACK
unset NODE_OPTIONS NEXT_RUNTIME NEXT_PHASE TURBOPACK TURBO FORCE_COLOR CI
build_site || die "production-сборка не удалась; работающая версия сайта не затронута"
prepare_standalone

if [ -f "$PROJECT_DIR/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_DIR/.env.local"
  set +a
fi

say "${bold}3/4  Переключаю проверенную сборку на порт ${PORT}...${reset}"
activate_build
say "${green}Сайт проверен: http://localhost:${PORT}/ru${reset}"

say "${bold}4/4  Запускаю Cloudflare Quick Tunnel...${reset}"
start_tunnel
wait "$TUNNEL_PID"
