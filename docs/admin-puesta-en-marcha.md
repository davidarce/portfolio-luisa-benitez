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

**Tampoco puede subir fotos.** Las imágenes del sitio pasan por
`scripts/optimize-gallery.mjs`, que las convierte a webp de 2048px. Una foto
subida desde el CMS entraría cruda de cámara y dispararía el peso del sitio, que
ya roza el límite de tiempo de despliegue. Añadir material sigue siendo tarea de
David con el script.

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

## Lo que falta para ponerlo en marcha

### 1. El servicio de autenticación

Sveltia CMS necesita un intermediario que haga el baile de OAuth con GitHub. Hay
uno oficial listo para Cloudflare Workers, que ya usáis para el dominio:

<https://github.com/sveltia/sveltia-cms-auth>

Pasos, todos en cuentas de David:

1. Crear una **OAuth App** en GitHub (Settings → Developer settings → OAuth Apps).
   La URL de callback es la del Worker, `https://<worker>.workers.dev/callback`.
2. Desplegar el Worker con `GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET` como
   variables de entorno.
3. Añadir a `public/admin/config.yml`, dentro de `backend`:

   ```yaml
   base_url: https://<worker>.workers.dev
   ```

### 2. Quién entra

Solo pueden guardar las cuentas con permiso de escritura en el repositorio.

Lo recomendable es **invitar a Luisa como colaboradora** con una cuenta suya
gratuita: los cambios quedan a su nombre y el acceso se revoca en un clic sin
tocar nada más.

Si en su lugar usa la cuenta de David, funciona igual, pero conviene saber que
eso le da acceso a **toda** la cuenta de GitHub, no solo a este repositorio, y
que los commits saldrán firmados por David.

### 3. Publicación

`publish_mode: editorial_workflow` está activado: cada cambio abre una rama y una
propuesta en vez de publicar directo. Luisa trabaja a su ritmo y se publica
cuando alguien lo ha revisado.

No es solo prudencia: cada publicación dispara un despliegue de más de diez
minutos, y GitHub Pages limita cuántos admite por hora. Publicar en cada guardado
reventaría el despliegue en una tarde de ajustes.

## Probarlo en local, sin autenticación

Con `local_backend: true` en la configuración, el CMS puede leer y escribir los
ficheros del repositorio en la máquina de desarrollo:

```
pnpm dlx decap-server     # deja un proxy escuchando en el puerto 8081
pnpm dev                  # y el sitio en el 4321
```

Después, `http://localhost:4321/admin/`. Sveltia pedirá elegir la carpeta del
repositorio; Decap se conecta al proxy directamente.
