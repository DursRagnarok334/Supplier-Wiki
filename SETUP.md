# Wiki Suppliers — Guía de puesta en marcha

Este proyecto son **3 archivos**, sin build, sin `npm install`:

- `index.html` — la wiki completa (todo el front-end en un solo archivo)
- `groq-proxy-worker.js` — proxy gratuito que oculta tu API key de Groq
- `SETUP.md` — esta guía

---

## 1. Publicar en GitHub Pages (gratis)

1. Crea un repositorio nuevo en GitHub (puede ser privado si solo lo usa tu equipo, pero GitHub Pages gratis en repos privados requiere plan Pro; si el repo es público, cualquiera con el link puede ver la wiki — no pongas datos sensibles reales de proveedores en el HTML).
2. Sube `index.html` a la raíz del repositorio.
3. Ve a **Settings → Pages** → en "Source" elige la rama `main` y carpeta `/root`.
4. En 1-2 minutos tu wiki estará en `https://tu-usuario.github.io/nombre-repo/`.

Cada vez que edites `index.html` y hagas `git push`, la wiki se actualiza sola.

---

## 2. Firebase (almacenamiento en la nube, sincronizado entre el equipo)

Sin esto, la wiki funciona igual pero cada persona ve solo sus propios datos guardados en su navegador (localStorage).

1. Ve a https://console.firebase.google.com → **Crear proyecto** (gratis, plan Spark).
2. Dentro del proyecto: **Compilación → Firestore Database → Crear base de datos** → modo producción, la región más cercana.
3. En **Reglas** de Firestore, pon algo simple para empezar (luego se puede restringir con autenticación):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /wiki_suppliers/{doc} {
         allow read, write: if true; // ⚠️ solo para pruebas — restringe esto después
       }
     }
   }
   ```
4. Ve a **Configuración del proyecto (⚙️) → General → Tus apps → Web (</>)**. Registra la app y copia el objeto `firebaseConfig`.
5. Pega esos valores en `CONFIG.firebase` dentro de `index.html`.

> Las claves de Firebase Web **no son secretas** — están pensadas para ir en el cliente. La seguridad real la dan las reglas de Firestore del paso 3, que deberías ajustar antes de usar datos reales (por ejemplo, exigiendo login con Google mediante Firebase Auth, restringido a tu dominio @juniper.com).

---

## 3. Groq como IA de apoyo (búsqueda, análisis, refinamiento)

Un HTML estático en GitHub Pages **no puede ocultar una API key** — cualquiera puede abrir el código fuente y verla. Por eso el asistente pasa por un proxy intermedio que sí guarda la clave en secreto:

1. Crea tu key gratis en https://console.groq.com/keys
2. Sigue las instrucciones dentro de `groq-proxy-worker.js` para desplegarlo en **Cloudflare Workers** (plan gratuito: 100.000 peticiones/día).
3. Copia la URL del Worker en `CONFIG.groqProxyUrl` dentro de `index.html`.

Con esto, el botón **"Asistente IA"** de la wiki queda funcional: responde preguntas basándose en el contenido de las páginas, proveedores y cajones de tickets.

---

## 4. Google Drive (opcional, para adjuntar/almacenar documentos)

Ahora mismo los archivos adjuntos que suben en "Static Data" se guardan como `base64` dentro de Firestore/localStorage — funciona pero no es ideal para archivos grandes (PDFs pesados, etc.).

Para usar Google Drive como almacenamiento real de esos documentos:

1. Ve a https://console.cloud.google.com/apis/credentials
2. Crea un proyecto → habilita **Google Drive API** y **Google Picker API**.
3. Crea credenciales **OAuth 2.0 Client ID** (tipo "Aplicación web"), añade tu dominio de GitHub Pages en "Orígenes de JavaScript autorizados".
4. Crea también una **API key** (restringida a Drive API y Picker API).
5. Pega ambos valores en `CONFIG.googleDrive` dentro de `index.html`.

Esta parte (selector de archivos de Drive + subida real) es la más compleja de las cuatro porque involucra el flujo de login OAuth de Google. Te recomiendo dejarla para una segunda fase, una vez que Firebase y Groq ya estén funcionando — dime cuando quieras y te preparo el código del selector de Drive (Google Picker) integrado con los botones de "Archivos adjuntos" que ya existen en Static Data.

---

## Orden recomendado para no bloquearte

1. **Ahora**: publica `index.html` tal cual en GitHub Pages — ya es una wiki funcional (con localStorage) que puedes enseñar al equipo.
2. **Firebase**: para que los cambios de un compañero los vea todo el equipo en tiempo real.
3. **Groq**: para el asistente de búsqueda/análisis.
4. **Google Drive**: cuando quieras mover el almacenamiento de archivos fuera de Firestore.
