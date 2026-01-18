# Documentación del Sistema: Automático de Instagram (Comentarios y DMs)

Este sistema permite recibir, visualizar y responder comentarios y mensajes directos (DMs) de Instagram en tiempo real a través de un Dashboard personalizado.

## 🚀 Arquitectura del Sistema

El sistema se basa en 4 componentes principales:

1.  **Meta Webhooks (Instagram API v21.0):** Envía notificaciones en tiempo real a Vercel cuando ocurre un evento (nuevo comentario o DM).
2.  **Backend (Vercel Edge Functions):** Procesa las notificaciones, valida la seguridad y guarda la información en la base de datos.
3.  **Firebase Firestore:** Base de datos en tiempo real donde se almacenan comentarios, mensajes y conversaciones.
4.  **Frontend (React + Vite):** Dashboard que escucha los cambios en Firestore y permite al usuario responder.

---

## 🔄 Flujo de Datos

### 1. Recepción de Eventos (API -> Webhook)
Cuando alguien comenta o envía un DM:
- Instagram envía un `POST` a `/api/instagram`.
- El servidor recibe el JSON, identifica si es un `comment` o un `messaging` (DM).
- **Idempotencia:** Antes de guardar, el código verifica si el `ID` del mensaje ya existe para no duplicar datos.
- Se guarda el documento en las colecciones `instagram_comments` o `instagram_messages`.

### 2. Sincronización en Tiempo Real (Firestore -> Dashboard)
- El Dashboard usa la función `onSnapshot` de Firebase.
- Tan pronto como el webhook guarda un dato, el Dashboard se actualiza **sin necesidad de recargar la página**.

### 3. Respuesta (Dashboard -> API)
Cuando respondes desde el Dashboard:
- Se envía un `POST` a `/api/instagram/reply` (para comentarios) o `/api/instagram/dm` (para mensajes).
- El backend limpia el `META_ACCESS_TOKEN` (removiendo comillas o espacios accidentales de Vercel).
- Se envía la respuesta a `graph.instagram.com/v21.0/me/messages` usando autenticación **Bearer**.
- El sistema marca el comentario original como `replied: true` en Firestore para que desaparezca de la lista de "Pendientes".

---

## 🛠️ Configuración de Variables de Entorno (Vercel)

Para que el sistema funcione, estas variables deben estar configuradas correctamente:

| Variable | Descripción |
| :--- | :--- |
| `META_ACCESS_TOKEN` | Token de acceso de larga duración (página/instagram). |
| `META_APP_SECRET` | Secreto de la App en Meta for Developers. |
| `VERIFY_TOKEN` | Token configurado en el Webhook de Meta (`tokentoken`). |
| `FIREBASE_PROJECT_ID` | Nombre del proyecto en Firebase (`chatmulticanal`). |
| `FIREBASE_CLIENT_EMAIL` | Email de la cuenta de servicio de Firebase Admin. |
| `FIREBASE_PRIVATE_KEY` | Key privada completa (debe incluir `-----BEGIN PRIVATE KEY-----`). |

---

## ⚠️ Notas Técnicas Importantes (Lecciones Aprendidas)

-   **Formato de Key en Vercel:** Las claves privadas de Firebase suelen dar error en Vercel. El sistema actual incluye un código de "limpieza" que remueve `\n` y comillas dobles automáticamente.
-   **Endpoint de Respuesta:** Para DMs, es fundamental usar `graph.instagram.com` en lugar de `graph.facebook.com`.
-   **Índices Compuestos:** Firestore requiere un índice manual para filtrar por `replied` y ordenar por `createdAt` simultáneamente.

---

## 📁 Estructura de Archivos Clave

-   `api/instagram.js`: El receptor principal de todos los mensajes.
-   `api/instagram/reply.js`: Lógica para responder comentarios.
-   `api/instagram/dm.js`: Lógica para enviar mensajes directos.
-   `lib/firebase-admin.js`: Configuración segura de Firebase para el servidor.
-   `src/pages/Dashboard.jsx`: Interfaz visual principal.
