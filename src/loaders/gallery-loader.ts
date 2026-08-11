import { readdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface GalleryConfig {
  baseDir: string;
  jsonPath: string;
  jsonKey?: string;
  hasSubfolders?: boolean;
  basePath?: string;
}

interface GalleryMediaItem {
  file: string;
  hidden?: boolean;
  cover?: boolean;
}

interface GalleryEntry {
  id: string;
  title: string;
  description: string;
  img: string;
  img_alt: string;
  cardSize: string;
  aspectRatio: string;
  objectPosition?: string;
  images: string[];
  gallery?: GalleryMediaItem[];
  hasGallery: boolean;
  featured?: boolean;
  role?: string;
  roleDetail?: string;
  leadStylist?: string;
  year?: number;
  season?: string;
  client?: string;
  publication?: string;
  format?: string;
  credits?: Record<string, string>;
}

export function createGalleryLoader(config: GalleryConfig) {
  return async (): Promise<GalleryEntry[]> => {
    const { baseDir, jsonPath, jsonKey } = config;

    // Leer datos del JSON
    const jsonContent = readFileSync(jsonPath, 'utf-8');
    const jsonData = jsonKey ? JSON.parse(jsonContent)[jsonKey] : JSON.parse(jsonContent);

    if (!existsSync(baseDir)) {
      console.warn(`Directory ${baseDir} does not exist`);
      return [];
    }

    // Se itera el JSON, no el directorio: **el orden del array es el orden de la
    // página**, que es lo que Luisa arrastra en /admin/ordenar. Leyendo el
    // directorio salía orden alfabético de carpeta y hacía falta reordenar
    // después con reglas que ella no podía ver ni cambiar.
    const entradas: any[] = Array.isArray(jsonData) ? jsonData : Object.values(jsonData).flat();

    // Una carpeta de fotos sin entrada en el JSON no se publica: borrar la fila
    // desde el CMS saca el proyecto del portfolio y el directorio se queda en
    // disco. Se avisa porque es la diferencia entre "lo quité" y "se perdió".
    const conEntrada = new Set(entradas.map(e => e.id));
    for (const dir of readdirSync(baseDir, { withFileTypes: true })) {
      if (dir.isDirectory() && !conEntrada.has(dir.name)) {
        console.warn(
          `[gallery-loader] "${dir.name}" en ${baseDir} no tiene entrada en ${jsonPath}: se omite del portfolio.`,
        );
      }
    }

    return entradas
      .map(info => {
        const slug = info.id;

        if (!existsSync(join(baseDir, slug))) {
          console.warn(
            `[gallery-loader] "${slug}" está en ${jsonPath} pero no existe ${baseDir}/${slug}: se omite.`,
          );
          return null;
        }

        // La lista de fotos es la única fuente de verdad de orden y visibilidad,
        // pensada para que el CMS la edite sin tocar el sistema de ficheros. Ya
        // no hay camino de respaldo que lea el directorio: daba un resultado
        // distinto (resucitaba fotos ocultas, excluía `index.*` que en 12
        // proyectos era la portada, y reordenaba por nombre), y un respaldo que
        // publica otro portfolio no es un respaldo.
        const gallery: GalleryMediaItem[] | undefined = info.gallery;
        if (!gallery) {
          console.warn(`[gallery-loader] "${slug}" no tiene "gallery" en ${jsonPath}: no se publican fotos.`);
        }
        const images = gallery ? gallery.filter(item => !item.hidden).map(item => item.file) : [];

        // La portada es un dato explícito (`cover: true` en `gallery`), buscado en
        // toda la lista y no solo en las visibles: ocultar una foto no le quita
        // el derecho a seguir siendo portada. Los 36 proyectos la tienen marcada;
        // si alguno nuevo no la marca, cae a la primera imagen visible.
        const coverItem = gallery?.find(item => item.cover);
        const img = coverItem ? coverItem.file : images[0];

        // `> 0` y no `> 1`: un proyecto de un solo vídeo también tiene ficha, que
        // es donde viven los créditos. Con `> 1` esas seis tarjetas no enlazaban.
        const hasGallery = images.length > 0;

        return {
          id: slug,
          title: info.title || slug,
          description: info.description || '',
          img: img || '',
          img_alt: info.img_alt || info.title || slug,
          cardSize: info.cardSize || 'normal',
          aspectRatio: info.aspectRatio || '3 / 4',
          objectPosition: info.objectPosition,
          images,
          gallery,
          hasGallery,
          order: info.order || 0,
          featured: info.featured,
          pin: info.pin,
          role: info.role,
          roleDetail: info.roleDetail,
          leadStylist: info.leadStylist,
          year: info.year,
          season: info.season,
          client: info.client,
          publication: info.publication,
          format: info.format,
          credits: info.credits,
        };
      })
      .filter((entry): entry is GalleryEntry => entry !== null && Boolean(entry.img));
  };
}
