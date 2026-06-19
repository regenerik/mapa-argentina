# Mapa Argentina

Aplicación interactiva construida con Next.js App Router, React y TypeScript. Se exporta como sitio completamente estático; Google Apps Script funciona como backend gratuito para Google Sheets y para las operaciones privadas de Cloudinary.

## Desarrollo local

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

Crear `.env.local` con:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=drlqmol4c
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=mapa_argentina_2026_x7k9p
NEXT_PUBLIC_GOOGLE_SHEETS_WEB_APP_URL=https://script.google.com/macros/s/ID_DE_IMPLEMENTACION/exec
```

La subida de imágenes usa el preset unsigned directamente desde el navegador. El preset define la carpeta; el frontend no envía `folder`.

## Configurar Google Sheets y Apps Script

### 1. Reemplazar el código

1. Abrir la planilla de Google Sheets.
2. Ir a **Extensiones > Apps Script**.
3. Abrir el archivo `Código.gs`.
4. Borrar su contenido.
5. Pegar completo el contenido de `docs/google-apps-script.js`.
6. Guardar el proyecto.

No hace falta modificar la pestaña `points`. El script conserva las columnas existentes:

```text
id | title | description | longitude | latitude | thumbnailUrl | images | updatedAt
```

### 2. Configurar propiedades privadas

En Apps Script abrir **Configuración del proyecto > Propiedades de la secuencia de comandos** y crear exactamente estas propiedades:

```text
API_TOKEN                       = una_clave_administrativa_larga
CLOUDINARY_CLOUD_NAME           = drlqmol4c
CLOUDINARY_API_KEY              = API key de Cloudinary
CLOUDINARY_API_SECRET           = API secret de Cloudinary
CLOUDINARY_ALLOWED_FOLDERS      = mapa-argentina-v2/uploads,mapa-argentina
```

Notas importantes:

- No agregar comillas alrededor de los valores.
- `API_TOKEN` es la clave que se ingresa al abrir `/edicion`.
- `CLOUDINARY_API_SECRET` queda solamente en Apps Script.
- La lectura del mapa es pública; crear, modificar y eliminar requiere `API_TOKEN`.
- Las imágenes reemplazadas y las de un punto eliminado se borran desde Apps Script.

### 3. Actualizar la implementación

Si ya existe una implementación:

1. Presionar **Implementar > Administrar implementaciones**.
2. Abrir la implementación existente con el ícono del lápiz.
3. En **Versión**, elegir **Nueva versión**.
4. En **Ejecutar como**, elegir **Yo**.
5. En **Quién tiene acceso**, elegir **Cualquier persona**.
6. Presionar **Implementar**.
7. Autorizar el acceso a Google Sheets y las conexiones externas de `UrlFetchApp`.
8. Copiar la URL que termina en `/exec`.

Al actualizar la implementación existente, la URL normalmente permanece igual. No usar la URL de prueba terminada en `/dev`.

### 4. Probar Apps Script

Abrir la URL `/exec` en el navegador. Debe responder algo similar a:

```json
{"ok":true,"service":"mapa-argentina"}
```

Después abrir `/edicion` en la app e ingresar el valor de `API_TOKEN`. La clave se conserva únicamente en `sessionStorage`, por lo que vuelve a pedirse al cerrar la pestaña.

## Configurar Render como Static Site

Usar estos valores:

```text
Branch:             main
Root Directory:     vacío
Build Command:      npm ci && npm run build
Publish Directory:  out
```

Eliminar la variable `PORT` y agregar solamente:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=drlqmol4c
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=mapa_argentina_2026_x7k9p
NEXT_PUBLIC_GOOGLE_SHEETS_WEB_APP_URL=https://script.google.com/macros/s/ID_DE_IMPLEMENTACION/exec
```

No cargar en Render `API_TOKEN`, `CLOUDINARY_API_KEY` ni `CLOUDINARY_API_SECRET`. Esos valores privados pertenecen a Script Properties de Apps Script.

## Arquitectura

```text
Render Static Site -> Google Apps Script -> Google Sheets
Render Static Site -> Cloudinary unsigned upload
Google Apps Script -> Cloudinary signed destroy
```

`localStorage` continúa funcionando como respaldo si Google Apps Script no responde temporalmente.
