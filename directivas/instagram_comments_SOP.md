# SOP: Automatización de Comentarios y DMs de Instagram

## Objetivo
Sistema para recibir comentarios y mensajes directos (DMs) de Instagram en tiempo real vía webhooks y responderlos desde una interfaz React, almacenando todo en Firebase Firestore.

---

## Arquitectura del Sistema

```
[Instagram API v24.0] → [Webhook Vercel] → [Firebase Firestore] ← [React Frontend]
                              ↓                    ↓
               Notificación comment/DM     Almacena/Lee datos
                              ↓                    ↓
               Trigger respuesta         Dashboard con tabs
```

---

## Componentes

### 1. Webhook (Vercel - Node.js/Express)
- **Ruta GET `/api/instagram`**: Verificación del webhook (hub.verify_token)
- **Ruta POST `/api/instagram`**: Recibe eventos de comentarios
- Guarda comentarios en Firestore
- Notifica al frontend (opcional: Firestore listeners)

### 2. Frontend (React)
- Lista de comentarios recibidos en tiempo real
- Formulario para responder comentarios
- Llamada a API para enviar respuestas
- Filtros por post/fecha/estado de respuesta

### 3. Firebase Firestore
- **Colección `instagram_comments`**: Almacena comentarios entrantes
- **Colección `instagram_responses`**: Almacena respuestas enviadas
- **Colección `instagram_posts`**: Metadata de posts monitoreados

---

## Requisitos Previos (Meta Developer)

1. **App de Facebook** con permisos:
   - `instagram_basic`
   - `instagram_manage_comments`
   - `pages_manage_engagement`
   - `pages_read_engagement`

2. **Cuenta Instagram Business/Creator** vinculada a Facebook Page

3. **Webhook configurado** en App Dashboard:
   - Campo suscrito: `comments`
   - URL del webhook: `https://tu-proyecto.vercel.app/api/instagram`

4. **Access Token de larga duración** con permisos necesarios

---

## Restricciones y Casos Borde Conocidos

> **IMPORTANTE**: Estas limitaciones vienen de la documentación oficial de Meta.

1. **Solo cuentas Business/Creator** - Cuentas personales NO tienen acceso a API
2. **Reels NO soportados** - Los webhooks de comentarios no funcionan en Reels
3. **Cuentas privadas excluidas** - No se reciben notificaciones de comentarios en media privada
4. **Albums sin ID directo** - El album ID no viene en el webhook, hay que consultarlo por Comment ID
5. **Live comments** - Solo se envían durante la transmisión en vivo
6. **Advanced Access requerido** - Necesita pasar App Review para recibir webhooks de comments

---

## Variables de Entorno Requeridas

```env
# Meta/Instagram
META_ACCESS_TOKEN=           # Token de acceso de larga duración
META_APP_SECRET=             # App Secret para verificar signature
INSTAGRAM_ACCOUNT_ID=        # ID de la cuenta de Instagram Business
VERIFY_TOKEN=                # Token personalizado para webhook verification

# Firebase (Server-side)
FIREBASE_PROJECT_ID=chatmulticanal
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Firebase (Client-side - ya proporcionado)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyB02LqVRfCslDa7ZjXHyrs0jNfZk4Ojjtk
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=chatmulticanal.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=chatmulticanal
```

---

## Estructura de Datos Firestore

### Colección: `instagram_comments`
```javascript
{
  id: "comment_id_from_instagram",
  mediaId: "media_id",
  text: "Contenido del comentario",
  from: {
    id: "user_ig_scoped_id",
    username: "username"
  },
  timestamp: Timestamp,
  replied: false,
  parentId: null | "parent_comment_id", // si es respuesta a otro
  createdAt: Timestamp
}
```

### Colección: `instagram_responses`
```javascript
{
  commentId: "original_comment_id",
  responseText: "Nuestra respuesta",
  sentAt: Timestamp,
  sentBy: "user_id_dashboard",
  success: true,
  igResponseId: "response_comment_id_from_ig"
}
```

---

## Endpoints de Instagram Graph API

### Responder a un comentario
```
POST https://graph.facebook.com/v21.0/{comment-id}/replies
?message={texto_respuesta}
&access_token={token}
```

### Obtener comentarios de un media
```
GET https://graph.facebook.com/v21.0/{media-id}/comments
?access_token={token}
```

---

## Flujo de Operación

1. Usuario comenta en post de Instagram
2. Meta envía POST al webhook con datos del comentario
3. Webhook valida signature y guarda en Firestore
4. Frontend escucha cambios en Firestore (onSnapshot)
5. Operador ve comentario y escribe respuesta
6. Frontend envía respuesta a API
7. API hace POST a Graph API para responder
8. Se guarda registro de respuesta en Firestore
9. Se actualiza comentario original como `replied: true`

---

## Notas de Desarrollo

- Usar `firebase-admin` en el servidor (Vercel)
- Usar SDK de Firebase Web en el frontend
- Implementar verificación de signature en webhook
- Manejar rate limits de Instagram API (200 calls/hour por usuario)
