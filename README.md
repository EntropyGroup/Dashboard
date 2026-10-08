# Entropy — Painel interno

Painel interno da Entropy (estúdio digital fundado por Daniel e Guilherme), com os mesmos módulos
funcionais do dashboard da DMG Dev Group que serviu de referência, reconstruídos do zero com a
identidade visual da Entropy (preto piano, prata fria, tipografia Inter).

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4 (tokens do design system Entropy em `src/index.css`)
- React Router
- Firebase (Auth + Firestore) — opcional, ver abaixo
- Recharts, Radix UI, Lucide icons

## Rodando localmente

```bash
npm install
npm run dev        # usa o Firebase do .env
npm run dev:demo   # porta 5174, sem Firebase, com dados de exemplo
```

## Firebase (opcional)

Sem credenciais, o app roda em **modo de demonstração local**: login aceita qualquer email/senha
e os dados ficam em memória (com alguns registros de exemplo), então tudo funciona normalmente
sem servidor nenhum.

Para ligar dados reais:

1. Crie um projeto em [console.firebase.google.com](https://console.firebase.google.com).
2. Ative **Authentication → Email/senha** e **Firestore Database**.
3. Copie `.env.example` para `.env` e preencha com as credenciais do app web do projeto.
4. Reinicie `npm run dev`. O app passa a usar Firebase automaticamente (detecta pela presença das
   variáveis de ambiente).
5. Publique as regras de [`firestore.rules`](firestore.rules) em **Firestore → Regras**, com os
   emails do time na lista.

## Sincronização bancária (Pluggy / MeuPluggy)

O workflow [`sync-banco.yml`](.github/workflows/sync-banco.yml) roda
[`scripts/sync-pluggy.mjs`](scripts/sync-pluggy.mjs) às 9h e às 21h (Brasília) e grava as
transações do banco em `lancamentos` com origem `banco`. As chaves da Pluggy e do Firebase Admin
ficam só nos secrets do GitHub, nunca no navegador.

- **Corte de data**: nada anterior à variável `PLUGGY_SINCE` (yyyy-mm-dd) é sincronizado nem removido —
  usado porque a conta tinha movimentação pessoal antes de virar a conta do estúdio.
- **Direção**: o campo `type` da Pluggy (DEBIT = saída, CREDIT = entrada); o valor é sempre positivo.
- **Sem contagem dupla**: pagamento de fatura (na conta e no cartão) e transferência entre contas
  próprias são ignorados, porque as compras já vêm do cartão. Para ignorar mais descrições, use
  o secret opcional `PLUGGY_SKIP_REGEX`.
- **Edições do time valem**: descrição, categoria e projeto de um lançamento do banco podem ser
  editados e a sincronização não sobrescreve. Valor, data e tipo são do banco.
- **Ocultar em vez de excluir**: um lançamento do banco ocultado continua no Firestore marcado
  `oculto: true`, para não voltar na próxima sincronização.
- **Pendentes**: transações `PENDING` que o banco descartar somem na sincronização seguinte.
- **Status**: o card "Banco" no Financeiro mostra a última execução (documento `sync/pluggy`).

Secrets do repositório (Settings → Secrets and variables → Actions → Secrets): `PLUGGY_CLIENT_ID`,
`PLUGGY_CLIENT_SECRET`, `PLUGGY_ITEM_IDS` (ids separados por vírgula) e `FIREBASE_SERVICE_ACCOUNT`
(o JSON inteiro da conta de serviço). `PLUGGY_SINCE` fica em **Variables** (não é sensível, então
não precisa ser secret). Para rodar localmente, as mesmas chaves no `.env` e `npm run sync:banco`.

## Módulos

- **Dashboard** — KPIs do mês, receita dos últimos 6 meses, atividade recente, projetos em andamento.
- **Analytics** — placeholder com dados de exemplo (visitas, fontes de tráfego).
- **Atividades** — log de auditoria de todas as ações do time.
- **Financeiro** — lançamentos manuais e do banco (Pluggy), saídas por categoria, vínculo com projeto.
- **Clientes** — cadastro com projetos vinculados.
- **Leads** — funil simples com conversão em cliente + projeto.
- **Projetos** / **Projeto (detalhe)** — status, progresso via checklist, financeiro vinculado.
- **Projetos pessoais** — mesmo padrão, privado por usuário.
- **Calendário** — grid mensal com eventos arrastáveis.
- **Notas** — quadro da equipe + notas pessoais (markdown + checklist).
- **Equipe** — cartões dos fundadores.
- **Infraestrutura** / **Segurança** — placeholders para funcionalidades futuras.
- **Configurações** — perfil e segurança da conta.

## Estrutura

```
scripts/         sync-pluggy.mjs (sincronização bancária, roda no GitHub Actions)
src/
  components/    ui/ (primitivos), layout/ (header, bottom bar), brand/, shared/
  features/auth/ AuthProvider + tela de login
  lib/           firebase.ts, store/ (dados), utils.ts, navItems.ts
  pages/         um arquivo por módulo/rota
```

## Trevor — assistente do dashboard

O Trevor usa a **API do Gemini diretamente**, por um serviço Node em `server/`. Não usa Firebase AI Logic. O Firebase existente continua responsável pelo login e pelas permissões de leitura/escrita dos dados. A chave do Gemini permanece no servidor.

No menu **Trevor** e no botão do cabeçalho:

- Conversa com Gemini e propostas de ações que só são executadas após confirmação.
- Resumo financeiro do mês e revisão dos registros/checklists de projetos.
- Criação de eventos, tarefas, leads, clientes, projetos, lançamentos manuais e notas; alteração de status/URL de produção e exclusão de eventos.
- Conversão de lead em cliente ao criar um projeto a partir do lead.
- Avisos sobre eventos de hoje/amanhã, leads não vistos, projetos sem atualização, URL de produção ausente e falha de sincronização bancária.
- Pedidos rápidos para eventos, tarefas e avisos, disponíveis mesmo sem Gemini.

Avisos automáticos são calculados enquanto o dashboard está aberto. Avisos manuais e marcações de leitura ficam no navegador, por conta. Não há envio de email/WhatsApp nem execução em segundo plano com o dashboard fechado. A conversa permanece em memória durante a sessão e a navegação; recarregar a página limpa a conversa.

### Configuração local

Use **Node 22.18+**. Instale com `npm ci`, copie `.env.example` para `.env` e configure:

1. `GEMINI_API_KEY`: chave criada no [Google AI Studio](https://aistudio.google.com/apikey). **Não use `VITE_` nessa variável e não cole a chave na interface.**
2. `GEMINI_MODEL`: padrão `gemini-3.5-flash-lite`, configurável no servidor.
3. `FIREBASE_SERVICE_ACCOUNT`: JSON da conta de serviço do projeto do login, já usado pelo sincronismo bancário; ou credenciais padrão do Google por `GOOGLE_APPLICATION_CREDENTIALS`/ADC.
4. `FIREBASE_PROJECT_ID`: projeto do login (`entropydash` por padrão no exemplo).
5. `TREVOR_ALLOWED_EMAILS`: mesmos emails autorizados nas regras do dashboard.

Rode em dois terminais:

```bash
npm run dev:trevor
npm run dev
```

O Vite encaminha `/api/trevor` ao servidor na porta 8787. `npm run dev:demo` habilita apenas o modo local, sem chamada ao Gemini nem bypass do login no backend. Sem chave/servidor, os resumos locais, avisos e pedidos rápidos continuam funcionando. Após configurar o backend, use **Verificar conexão do Trevor** na página.

Antes de enviar dados ao Gemini, o usuário ativa **Compartilhar contexto**. O contexto inclui totais financeiros e registros limitados de projetos/agenda; não envia contatos, notas pessoais, detalhes bancários ou código-fonte. O texto que o usuário digita na conversa é enviado à API. No [plano gratuito do Gemini](https://ai.google.dev/gemini-api/docs/pricing), conteúdo pode ser usado pelo Google para melhorar os produtos; evite informações confidenciais. Usar Gemini diretamente não torna a API ilimitada ou garante gratuidade: depende do plano/modelo da chave.

### Produção

Na Vercel, o frontend e as funções `api/trevor.js` e `api/trevor/health.js` são publicados juntos, no mesmo domínio. O backend é compilado explicitamente com `npm run build:trevor` na instalação e no build; as funções importam somente arquivos JavaScript gerados em `server/.compiled`. O `vercel.json` preserva as rotas da API e o acesso direto às páginas do dashboard.

1. Em **Settings → Environment Variables**, configure `GEMINI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT` (JSON completo, sem as aspas simples usadas no `.env`), `FIREBASE_PROJECT_ID`, `TREVOR_ALLOWED_EMAILS` e `TREVOR_ALLOWED_ORIGINS=https://entropydash.vercel.app`. Configure também `GEMINI_MODEL` se quiser mudar o modelo padrão.
2. Deixe `VITE_TREVOR_API_URL` vazio para usar o mesmo domínio. As variáveis `VITE_FIREBASE_*` do frontend continuam necessárias.
3. Publique o código atualizado e faça um novo deploy. Não é necessário executar `npm run start:trevor` na Vercel.
4. Confira `/api/trevor/health`, entre com uma conta autorizada e envie uma mensagem na página Trevor. A rota de saúde confirma a presença da chave; uma conversa real valida as credenciais, o modelo e o acesso ao Gemini.

Os limites em memória são por instância da função; não constituem uma cota global entre instâncias.

Para Firebase Hosting ou outro host estático, hospede o serviço Node separadamente em um ambiente com suporte a Node 22.18+:

- Instalação: `npm ci --omit=dev`. Inicialização: `npm run start:trevor`.
- Configure os segredos acima no servidor, `PORT` conforme o host e `TREVOR_HOST=0.0.0.0` quando necessário para o host receber conexões.
- Configure `TREVOR_ALLOWED_ORIGINS` com as origens HTTPS exatas do dashboard, separadas por vírgula.
- Configure `VITE_TREVOR_API_URL=https://URL-DO-SERVIDOR` no build do frontend, sem `/api/trevor` no fim. Alternativamente, encaminhe `/api/trevor` e `/api/trevor/health` por proxy na mesma origem.
- Publique o build atualizado do frontend separadamente. Nenhum servidor, plano pago ou serviço externo é criado automaticamente por esta implementação.

O backend verifica tokens Firebase e a lista da equipe, restringe CORS e aceita até 12 pedidos por minuto por usuário (limite em memória por processo). Se escalar para múltiplas instâncias, configure também um limite compartilhado no gateway. As propostas são validadas no backend e no frontend; as gravações usam o SDK já existente e continuam sujeitas às regras do Firestore. O backend não usa Firebase Admin para escrever dados.

### Validação

```bash
npm run build
npx tsc -p server/tsconfig.json
npm run lint
npm run test:trevor
```

Os testes cobrem validação de ações, datas no fuso local, exclusão de lançamentos ocultos dos totais, autenticação/CORS/limites do backend, erros de geração e execução idempotente de tarefas/notas. As chamadas ao Gemini são simuladas nos testes; não consomem cota.


A Vercel usa Node 22.x, definido em `package.json`. O override de `jose` para 5.10.0 é restrito à dependência de `jwks-rsa`: evita `ERR_REQUIRE_ESM` nos runtimes que não permitem `require()` de módulos ESM. O teste de inicialização desativa explicitamente esse recurso do Node para reproduzir a restrição do deploy.
