# 🔥 Guia de Correção — Firebase Rules

## O que foi corrigido e porquê

---

## Problema 1 — Chat não funciona

**Causa:** As regras antigas só verificavam `customer_id` ou `customerId`.
Se o teu código guarda o utilizador como `userId` ou `user_id`, a regra bloqueava tudo.

**Correção aplicada:**
As novas regras aceitam TODOS os nomes de campo possíveis:
- `customer_id`
- `customerId`
- `userId`
- `user_id`

O admin consegue ler TODAS as conversas sem restrição.

---

## Problema 2 — Pedidos não aparecem após compra

**Causa:** As regras de `read` bloqueavam o utilizador se o campo
fosse `userId` mas a regra só verificava `user_id` (ou vice-versa).

**Correção aplicada:**
As novas regras de `read` verificam ambos os campos:
```
isDocOwner("userId") || isDocOwner("user_id")
```

**⚠️ Verifica também no teu código:**
Quando crias uma encomenda, confirma que o documento tem o campo
`userId` OU `user_id` com o UID do utilizador autenticado.

Exemplo correto:
```javascript
await addDoc(collection(db, 'orders'), {
  userId: auth.currentUser.uid,   // <-- obrigatório!
  items: [...],
  total: 49.99,
  status: 'pending',
  createdAt: serverTimestamp()
});
```

---

## Problema 3 — Admin não consegue carregar imagens (Storage)

**Causa:** Não tinhas regras de Firebase Storage definidas!
O Firestore e o Storage são serviços separados com ficheiros
de regras separados.

**Solução:**
Usa o ficheiro `storage.rules` fornecido.

**Como fazer deploy das regras de Storage:**

**Opção A — Firebase Console:**
1. Acede a https://console.firebase.google.com
2. Clica no teu projeto
3. Vai a **Storage** → aba **Rules**
4. Cola o conteúdo do ficheiro `storage.rules`
5. Clica **Publish**

**Opção B — Firebase CLI:**
```bash
firebase deploy --only storage
```

---

## Como fazer deploy das regras Firestore

**Opção A — Firebase Console:**
1. Acede a https://console.firebase.google.com
2. Clica no teu projeto
3. Vai a **Firestore Database** → aba **Rules**
4. Cola o conteúdo do ficheiro `firestore.rules`
5. Clica **Publish**

**Opção B — Firebase CLI:**
```bash
firebase deploy --only firestore:rules
```

---

## Estrutura de pastas no Storage recomendada

```
/produtos/{productId}/imagem.jpg        ← imagens de produtos
/banners/banner-principal.jpg           ← banners do site
/avatars/{userId}/foto.jpg              ← fotos de perfil
/chat-images/{conversaId}/foto.jpg      ← imagens enviadas no chat
/categorias/{categoriaId}/capa.jpg      ← imagens de categorias
```

---

## UID do Admin

O teu UID de admin está hardcoded nas regras:
`5efzvBMxHXOBkQMU8VcVLXBX8QS2`

Para adicionar mais admins, podes:
1. Usar Firebase Custom Claims (recomendado para produção)
2. Adicionar mais UIDs à condição `isAdmin()`

Para definir um utilizador como admin via Custom Claims:
```javascript
// Executar apenas no servidor (Cloud Functions ou Admin SDK)
admin.auth().setCustomUserClaims(uid, { admin: true });
```
