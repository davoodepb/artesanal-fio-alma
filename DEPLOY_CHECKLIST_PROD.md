# Deploy Checklist Producao (Firebase + Hosting)

Projeto Firebase: vercel-artesanal-fio-e-alma
Repositorio: artesanal-fio-alma

## 1) Preparacao local

1. Confirmar branch e pull final:
   - git checkout main
   - git pull origin main
2. Instalar dependencias:
   - npm install
3. Build de producao:
   - npm run build
4. (Opcional) testes:
   - npm run test

## 2) Login e selecao do projeto Firebase

1. Login Firebase CLI:
   - firebase login
2. Confirmar projeto alvo:
   - firebase use vercel-artesanal-fio-e-alma
3. Verificar .firebaserc aponta para o projeto correto.

## 3) Deploy de regras (obrigatorio)

1. Firestore rules:
   - firebase deploy --only firestore:rules
2. Storage rules:
   - firebase deploy --only storage

## 4) Deploy do Hosting (PWA)

1. Confirmar firebase.json com secao hosting configurada.
2. Deploy hosting:
   - firebase deploy --only hosting

## 5) Validacao rapida em producao

1. PWA:
   - Abrir site em mobile e desktop.
   - Verificar manifest e install prompt.
   - Confirmar service worker ativo.
2. Upload admin:
   - Testar upload de imagem em Produtos/Banners.
   - Se falhar, usar painel de diagnostico e copiar erro.
3. Pedidos:
   - Criar pedido de teste no checkout.
   - Confirmar documento em orders e itens em order_items.
   - Confirmar visibilidade no Admin > Pedidos.
4. Chat:
   - Enviar mensagem cliente/admin.
   - Confirmar mensagens em chat_messages e imagens em chat-images.

## 6) Comandos de deploy em sequencia (atalho)

Executar no diretorio do projeto:

- firebase deploy --only firestore:rules
- firebase deploy --only storage
- firebase deploy --only hosting

## 7) Rollback rapido (se necessario)

1. Reverter para commit anterior estavel:
   - git log --oneline
   - git checkout <commit_estavel>
2. Re-deploy das regras/hosting:
   - firebase deploy --only firestore:rules,storage,hosting

## 8) Itens criticos para nao esquecer

1. Nunca deployar rules de teste abertas em producao.
2. Confirmar auth admin ativo antes de testar uploads no painel.
3. Verificar bucket Firebase correto em variaveis de ambiente.
4. Confirmar dominio HTTPS ativo (PWA e service worker exigem HTTPS).
