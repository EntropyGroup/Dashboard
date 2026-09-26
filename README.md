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

Secrets do repositório (Settings → Secrets and variables → Actions): `PLUGGY_CLIENT_ID`,
`PLUGGY_CLIENT_SECRET`, `PLUGGY_ITEM_IDS` (ids separados por vírgula) e `FIREBASE_SERVICE_ACCOUNT`
(o JSON inteiro da conta de serviço). Para rodar localmente, as mesmas variáveis no `.env` e
`npm run sync:banco`.

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
