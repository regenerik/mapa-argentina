# Mapa Argentina

Aplicación interactiva construida con Next.js App Router, React y TypeScript.

## Desarrollo

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Cloudinary

La carga usa unsigned upload directamente desde el navegador. Las variables públicas son:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=drlqmol4c
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=mapa_argentina_2026_x7k9p
```

El preset `mapa_argentina_2026_x7k9p` debe estar habilitado como **Unsigned** en Cloudinary y define la carpeta de destino. El frontend no envía `folder`.

Para eliminar imágenes abandonadas, reemplazadas o asociadas a puntos borrados, el servidor usa:

```env
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_ALLOWED_FOLDERS=mapa-argentina-v2/uploads,mapa-argentina
```

Estas variables son privadas y nunca deben llevar el prefijo `NEXT_PUBLIC_`.

## Persistencia

La aplicación sincroniza con Google Sheets cuando está configurado y usa `localStorage` como fallback offline. El navegador nunca recibe el token privado de la hoja: las operaciones pasan por `/api/map-points` en el servidor Next.js.

## Configurar Google Sheets

1. Crear un Google Sheet nuevo. No hace falta agregar columnas manualmente.
2. Abrir **Extensiones > Apps Script**.
3. Borrar el contenido inicial y pegar completo `docs/google-apps-script.js`.
4. Abrir **Configuración del proyecto > Propiedades de la secuencia de comandos**.
5. Crear una propiedad llamada `API_TOKEN` con un valor largo y aleatorio.
6. Presionar **Implementar > Nueva implementación**.
7. Elegir **Aplicación web**.
8. En **Ejecutar como**, elegir tu cuenta.
9. En **Quién tiene acceso**, elegir **Cualquier persona**. La escritura sigue protegida por `API_TOKEN` y la hoja permanece privada.
10. Autorizar el script y copiar la URL final que termina en `/exec`.
11. Agregar a `.env.local`:

```env
GOOGLE_SHEETS_WEB_APP_URL=https://script.google.com/macros/s/ID_DE_IMPLEMENTACION/exec
GOOGLE_SHEETS_API_TOKEN=EL_MISMO_TOKEN_DE_APPS_SCRIPT
```

12. Reiniciar `npm run dev` para que Next.js lea las variables.

El script crea automáticamente una pestaña `points` con las columnas `id`, `title`, `description`, `longitude`, `latitude`, `thumbnailUrl`, `images` y `updatedAt`. La columna `images` guarda un JSON con las URLs de Cloudinary y sus días.

### Datos necesarios para finalizar la conexión

- La URL `/exec` de la implementación de Apps Script.
- Confirmación de que agregaste `API_TOKEN` a las propiedades del script.
- El mismo token dentro de `GOOGLE_SHEETS_API_TOKEN` en el servidor donde se ejecute Next.js.

No envíes ese token en código cliente ni lo nombres con el prefijo `NEXT_PUBLIC_`.
