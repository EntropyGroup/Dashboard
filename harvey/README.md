# Harvey da Entropy

Agente de vendas que roda sozinho no PC do estúdio e escreve no entropydash. Inspirado no
[Harvey](https://github.com/ethanplusai/harvey) (MIT), adaptado ao funil da Entropy.

A cada ciclo (15 min por padrão) ele acorda, confere pausa, horário de silêncio e limites, e faz
o que mais precisa ser feito, nesta ordem:

1. **Respostas:** quando vocês colam no painel a mensagem de um lead que respondeu, ele prepara a resposta.
2. **Follow-ups:** prepara o próximo toque de quem não respondeu (D+3, D+7, D+14, encerramento).
3. **1º contato:** diagnostica os leads mapeados (site e Instagram públicos) e escreve a abordagem.
4. **Prospecção:** quando o funil está baixo, procura empresas novas nas cidades e segmentos configurados.
5. **Analista (opcional):** toda segunda, busca as métricas dos posts no Metricool e calcula a nota de cada um.

**Nada é enviado sozinho.** Toda mensagem cai na **fila de aprovação** (Vendas → Hoje). Vocês revisam,
tocam em "Abrir no WhatsApp/Instagram", enviam do próprio celular e marcam como enviada. O Harvey
agenda o próximo passo.

Pausar, mudar cidades, segmentos e limites: **Vendas → Harvey** no painel. Vale a partir do próximo ciclo.

## O que o PC precisa

- **Node.js 22.18 ou mais novo** (`node --version`).
- **Claude Code** instalado e logado com a conta da assinatura: `npm install -g @anthropic-ai/claude-code`
  e depois `claude` uma vez para fazer login. O Harvey usa a assinatura, sem chave de API.
- Internet e o PC ligado. Ele roda com pouca memória (o trabalho pesado é do Claude).

## Instalação (uma vez)

```bash
git clone https://github.com/EntropyGroup/dashboard.git
cd dashboard
npm ci
cp .env.example .env
```

No `.env`, preencha a conta de serviço do Firebase: a mesma `FIREBASE_SERVICE_ACCOUNT` da
sincronização bancária (JSON numa linha), ou `HARVEY_SERVICE_ACCOUNT_FILE` com o caminho do
arquivo `.json` baixado em Firebase → Configurações do projeto → Contas de serviço. Ajuste
`HARVEY_REMETENTE` (quem assina as mensagens).

Teste um ciclo:

```bash
npm run harvey:teste
```

Se aparecer "Harvey online" e o painel (Vendas → Harvey) mostrar o último sinal, está funcionando.

### Importar o que estava no painel do Claude (uma vez)

```bash
npm run importar:painel -- caminho/para/painel-claude.json
```

O arquivo `painel-claude.json` é enviado separadamente (não fica no repositório, que é público).

## Deixar rodando sempre

### Linux (systemd)

```bash
sudo tee /etc/systemd/system/harvey.service >/dev/null <<EOF
[Unit]
Description=Harvey da Entropy
After=network-online.target

[Service]
User=$USER
WorkingDirectory=$PWD
ExecStart=$(which npm) run harvey
Restart=always
RestartSec=60
Environment=PATH=$PATH

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload && sudo systemctl enable --now harvey
journalctl -u harvey -f     # ver o que ele está fazendo
```

O `claude` precisa estar logado com o **mesmo usuário** do serviço (`User=`).

### Windows

Com o [pm2](https://pm2.keymetrics.io/), que reinicia sozinho se cair:

```powershell
npm install -g pm2 pm2-windows-startup
pm2 start npm --name harvey -- run harvey
pm2 save
pm2-startup install
pm2 logs harvey            # ver o que ele está fazendo
```

Desative a suspensão do PC (Configurações → Energia → Suspender: Nunca).

## Analista do Instagram (opcional)

O analista lê o Metricool pelo Claude Code. Adicione o servidor MCP do Metricool ao Claude Code
do PC (`claude mcp add ...`, conforme a documentação do Metricool), confira o nome com
`claude mcp list` e coloque esse nome em `HARVEY_METRICOOL_MCP` no `.env`.

## Limites e segurança

- `HARVEY_CHAMADAS_DIA` (padrão 60) limita as chamadas ao Claude por dia, para sobrar cota para vocês.
- Cada chamada roda numa pasta temporária vazia: o Claude não vê arquivos do PC. Só as ferramentas
  de busca e leitura de páginas (WebSearch, WebFetch) são liberadas, e só na prospecção e no diagnóstico.
- Ele só usa dados públicos de empresas e nunca envia mensagem, e-mail ou DM.
- O log das ações fica em Vendas → Harvey; os 300 registros mais recentes são mantidos.
