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
npm run dev
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

## Módulos

- **Dashboard** — KPIs do mês, receita dos últimos 6 meses, atividade recente, projetos em andamento.
- **Analytics** — placeholder com dados de exemplo (visitas, fontes de tráfego).
- **Atividades** — log de auditoria de todas as ações do time.
- **Financeiro** — lançamentos de entrada/saída, filtro por origem, CRUD.
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
src/
  components/    ui/ (primitivos), layout/ (sidebar, shell), brand/, shared/
  features/auth/ AuthProvider + tela de login
  lib/           firebase.ts, store/ (dados), utils.ts, navItems.ts
  pages/         um arquivo por módulo/rota
```
