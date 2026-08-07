# Modo edición del portfolio

Página en `/admin` para que Luisa reordene proyectos y fotos, elija portadas y
oculte lo que no quiera enseñar, sin tocar código ni ficheros.

## Qué puede hacer y qué no

**Puede**: reordenar proyectos, reordenar las fotos de cada proyecto, marcar una
foto como portada, ocultar fotos, destacar un proyecto en la home, fijar un
proyecto al principio o al final de su listado, y corregir título y descripción.

**No puede**: cambiar el rol, la estilista principal ni los créditos. Esos campos
están declarados pero ocultos en la configuración, así que se conservan intactos
y no aparecen en pantalla. La atribución de cada trabajo se decide fuera del CMS.

**No debería subir fotos nuevas, aunque el CMS lo permite.** El campo de foto es
un `widget: image` normal, así que técnicamente sí se puede subir una imagen
desde ahí; es una convención, no una restricción del propio CMS. Las imágenes
del sitio pasan por `scripts/optimize-gallery.mjs`, que las convierte a webp de
2048px, y una foto subida directamente desde el CMS entraría cruda de cámara
(sin optimizar, mucho más pesada) y quedaría así en el repositorio, empujando el
peso del sitio hacia el límite de tiempo de despliegue. Añadir material sigue
siendo tarea de David con el script.

## Cómo funciona por dentro

Cada proyecto lleva en su JSON una lista `gallery` de objetos:

```json
{ "file": "/assets/editorials/artego-color-pop-garden/1.webp", "cover": true }
```

- **El orden del array es el orden de la galería.** Ya no se deduce del nombre
  del fichero, que era lo que obligaba a renombrar en cadena para reordenar.
- **`cover: true`** marca la portada. Antes la portada era un fichero llamado
  `index.webp` que había que copiar encima de otro.
- **`hidden: true`** la saca del portfolio **sin borrar nada**. Es reversible.

La ruta se guarda completa, no solo el nombre, porque si no el CMS no sabe dónde
está la imagen y la muestra como texto en vez de como miniatura.

## Cómo se publica

**El CMS escribe en la rama `contenido`, no en `main`.** Sveltia todavía no
soporta el flujo editorial de Decap, así que sin esto cada guardado iría directo
a producción y dispararía un despliegue de más de diez minutos, con el límite de
despliegues por hora de GitHub Pages de por medio.

Con la rama aparte:

1. Luisa guarda tantos cambios como quiera. **No se despliega nada**, porque el
   workflow solo se dispara con `main`.
2. Cuando está conforme, David abre un PR de `contenido` a `main`, lo revisa y lo
   mergea. Ahí se publica todo junto, en un solo despliegue.
3. Después conviene poner `contenido` al día con `main`, para que no se separen.

## Cómo entra Luisa

**No hace falta ni OAuth App ni Worker.** Sveltia permite entrar con un token
personal, y para una sola usuaria es el camino corto.

1. Luisa se crea una cuenta de GitHub gratuita.
2. David la invita como colaboradora del repositorio. En repositorios personales
   no hay selector de permisos: un colaborador tiene escritura por defecto.
3. Ella genera el token en **Settings → Developer settings → Personal access
   tokens → Tokens (classic)**, con el permiso `repo` marcado.

   Tiene que ser un token **clásico**: GitHub no admite los nuevos de permisos
   finos para colaboradores de repositorios ajenos. El token se muestra una sola
   vez, así que hay que guardarlo al crearlo.
4. En `luisabenitez.es/admin`, botón **Sign In with Token**, y pegarlo.

Si algún día son varias personas y pegar el token molesta, el
[autenticador oficial](https://github.com/sveltia/sveltia-cms-auth) se despliega
en Cloudflare Workers y solo hay que añadir `base_url` a la configuración. Para
una sola usuaria es montar un servicio para nada, y además quedará obsoleto
cuando GitHub publique el estándar que tiene en preparación.

## Probarlo en local

Sveltia no usa proxy: ignora la opción `local_backend`. Se abre
`http://localhost:4321/admin/` y se pulsa **Work with Local Repository**, que
pide elegir la carpeta del repositorio. Necesita un navegador basado en Chromium.
