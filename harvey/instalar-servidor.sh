#!/usr/bin/env bash
# Instala o Harvey num PC Linux que vai ficar ligado como servidor.
# Funciona em Ubuntu Server / Debian e em Arch. Rode como o usuário que vai operar o Harvey
# (não como root):  bash harvey/instalar-servidor.sh
set -euo pipefail

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

if [ "$(id -u)" = 0 ]; then echo "Rode como seu usuário normal (o script usa sudo quando precisa)."; exit 1; fi

say "Node.js 22+"
if ! node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=18)?0:1)' 2>/dev/null; then
  if command -v pacman >/dev/null; then
    sudo pacman -Syu --needed --noconfirm nodejs npm git
  elif command -v apt-get >/dev/null; then
    sudo apt-get update && sudo apt-get install -y ca-certificates curl git
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
  else
    echo "Instale Node.js 22.18+ e git manualmente e rode de novo."; exit 1
  fi
fi
node --version

say "Claude Code"
if ! command -v claude >/dev/null; then
  mkdir -p "$HOME/.npm-global" && npm config set prefix "$HOME/.npm-global"
  grep -q npm-global "$HOME/.bashrc" 2>/dev/null || echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> "$HOME/.bashrc"
  export PATH="$HOME/.npm-global/bin:$PATH"
  npm install -g @anthropic-ai/claude-code
fi
echo "Se ainda não fez login, rode 'claude' agora em outro terminal e entre com a conta da assinatura."
read -rp "Login do Claude feito? [Enter para continuar] " _

say "Código do dashboard"
DIR="$HOME/entropy-dashboard"
if [ ! -d "$DIR/.git" ]; then git clone https://github.com/EntropyGroup/Dashboard.git "$DIR"; fi
cd "$DIR" && git pull --ff-only && npm ci --omit=dev
[ -f .env ] || cp .env.example .env
echo "Edite $DIR/.env: FIREBASE_SERVICE_ACCOUNT (ou HARVEY_SERVICE_ACCOUNT_FILE) e HARVEY_REMETENTE."
read -rp "Arquivo .env pronto? [Enter para testar um ciclo] " _
npm run harvey:teste

say "Serviço (liga sozinho com o PC e reinicia se cair)"
NPM_BIN="$(command -v npm)"
sudo tee /etc/systemd/system/harvey.service >/dev/null <<EOF
[Unit]
Description=Harvey da Entropy
After=network-online.target
Wants=network-online.target

[Service]
User=$USER
WorkingDirectory=$DIR
ExecStart=$NPM_BIN run harvey
Restart=always
RestartSec=60
Environment=PATH=$HOME/.npm-global/bin:/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now harvey
say "Pronto. Acompanhe com: journalctl -u harvey -f"
