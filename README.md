# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## SEO setup for Google indexing

This project now auto-generates `public/sitemap.xml` and `public/robots.txt` on every build.

### Environment variables

Set these variables in Vercel Project Settings:

- `VITE_SITE_URL` -> your production domain, e.g. `https://fioealma.pt`
- `VITE_GOOGLE_SITE_VERIFICATION` -> value provided by Google Search Console
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`) -> used to include live categories/products in sitemap

### Google Search Console checklist

1. Add and verify your domain property in Google Search Console.
2. Deploy the latest version to Vercel.
3. Open `https://YOUR_DOMAIN/sitemap.xml` and confirm it loads.
4. In Search Console, submit `https://YOUR_DOMAIN/sitemap.xml`.
5. Use URL Inspection for key pages (`/`, `/products`, category and product URLs).
6. Monitor Indexing and Page Experience reports for crawl/indexing errors.

## Migracao Supabase -> Firebase (tabelas sem auth antigo)

Este repositorio ja tem base para:

1. Login/Admin pelo Firebase Auth.
2. Importar CSV das tabelas para Firestore.
3. Definir claim de admin no Firebase.

### 1) Configurar variaveis de ambiente

- Copia `.env.example` para `.env`.
- Preenche todos os campos `VITE_FIREBASE_*`.
- Define `VITE_FIREBASE_ADMIN_UID=5efzvBMxHXOBkQMU8VcVLXBX8QS2`.

### 2) Exportar tabelas no Supabase

- Supabase -> Table Editor -> Export CSV para cada tabela.
- Coloca os ficheiros em `migration-csv/` com nome da colecao desejada:

Exemplo:

- `migration-csv/produtos.csv`
- `migration-csv/categorias.csv`
- `migration-csv/encomendas.csv`

### 3) Remover dados sensiveis antes da importacao

- Remove colunas como email/password/senha se nao quiseres migrar auth.
- O script tambem remove por defeito: `email`, `password`, `senha`, `hashed_password`, `encrypted_password`.

### 4) Importar para Firestore

Precisas de um ficheiro de service account do Firebase (JSON).

Comando:

```sh
npm run migrate:firestore -- --credentials=./firebase-service-account.json --csvDir=./migration-csv
```

Teste sem gravar dados:

```sh
npm run migrate:firestore -- --credentials=./firebase-service-account.json --csvDir=./migration-csv --dryRun
```

### 5) Definir admin no Firebase Auth

```sh
npm run set:firebase-admin-claim -- --credentials=./firebase-service-account.json --uid=5efzvBMxHXOBkQMU8VcVLXBX8QS2
```

Depois pede ao admin para terminar sessao e voltar a entrar para renovar token com a claim.

### 6) Publicar regras do Firestore

As regras estao em `firestore.rules`.

Publica com Firebase CLI:

```sh
firebase deploy --only firestore:rules
```

### 7) Remover Supabase por completo

Quando confirmares que os dados e fluxos do app estao 100% em Firebase:

1. Elimina chamadas restantes ao Supabase no frontend.
2. Remove variaveis `VITE_SUPABASE_*`.
3. Remove dependencia `@supabase/supabase-js`.
4. So depois apaga o projeto no Supabase.
