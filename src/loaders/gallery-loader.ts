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
  video?: string;
  cardSize: string;
  aspectRatio: string;
  objectPosition?: string;
  images: string[];
  gallery?: GalleryMediaItem[];
  hasGallery: boolean;
  order: number;
  featured?: boolean;
  pin?: 'first' | 'last';
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
    const { baseDir, jsonPath, jsonKey, hasSubfolders = true, basePath = '' } = config;

    // Leer datos del JSON
    const jsonContent = readFileSync(jsonPath, 'utf-8');
    const jsonData = jsonKey ? JSON.parse(jsonContent)[jsonKey] : JSON.parse(jsonContent);

    if (!existsSync(baseDir)) {
      console.warn(`Directory ${baseDir} does not exist`);
      return [];
    }

    // Caso: Con subcarpetas de galerías (celebrities, editorials)
    const dirs = readdirSync(baseDir, { withFileTypes: true })
      .filter(d => d.isDirectory());

    return dirs.map(dir => {
      const slug = dir.name;
      const imagesDir = join(baseDir, slug);

      // Helper to prepend base path
      const getPath = (path: string) => {
        const relativePath = `/assets/${baseDir.split('/assets/')[1]}/${slug}/${path}`;
        return basePath ? `${basePath}${relativePath}` : relativePath;
      };

      const allFiles = readdirSync(imagesDir);

      // Buscar info en el JSON
      const info = Array.isArray(jsonData)
        ? jsonData.find(item => item.id === slug || item.img?.includes(slug))
        : jsonData[slug]?.[0];

      // La lista de fotos es un dato explícito del JSON (orden + visibilidad),
      // pensado para que un CMS la edite sin tocar el sistema de ficheros.
      // Si un proyecto no la tiene todavía, se sigue leyendo el directorio.
      // `file` ya guarda la ruta pública completa (la resuelve el CMS al
      // guardar), así que aquí se usa tal cual sin volver a anteponer nada.
      const gallery: GalleryMediaItem[] | undefined = info?.gallery;
      const images = gallery
        ? gallery.filter(item => !item.hidden).map(item => item.file)
        : allFiles
            .filter(f => /\.(jpg|jpeg|png|webp|mp4|webm|mov)$/i.test(f) && !f.startsWith('index.'))
            // Orden natural (1, 2, ..., 10, 11) en vez de lexicográfico ('1', '10', '11', '2', ...):
            // las galerías de más de 9 fotos numeradas como 1.webp, 2.webp... quedarían desordenadas
            // con un .sort() por defecto, que compara los nombres carácter a carácter.
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
            .map(f => getPath(f));

      // La portada es un dato explícito (`cover: true` en `gallery`), buscado en
      // toda la lista y no solo en las visibles: ocultar una foto no le quita
      // el derecho a seguir siendo portada. Los 36 proyectos la tienen marcada;
      // si alguno nuevo no la marca, cae a la primera imagen visible.
      const coverItem = gallery?.find(item => item.cover);
      const img = coverItem ? coverItem.file : images[0];

      // Buscar video
      const videoFile = allFiles.find(f => /\.(mp4|webm|mov)$/i.test(f));
      const video = videoFile ? getPath(videoFile) : undefined;

      // `> 0` y no `> 1`: un proyecto de un solo vídeo también tiene ficha, que
      // es donde viven los créditos. Con `> 1` esas seis tarjetas no enlazaban.
      const hasGallery = images.length > 0;

      return {
        id: slug,
        title: info?.title || slug,
        description: info?.description || '',
        img: img || '',
        img_alt: info?.img_alt || info?.title || slug,
        video,
        cardSize: info?.cardSize || 'normal',
        aspectRatio: info?.aspectRatio || '3 / 4',
        objectPosition: info?.objectPosition,
        images,
        gallery,
        hasGallery,
        order: info?.order || 0,
        featured: info?.featured,
        pin: info?.pin,
        role: info?.role,
        roleDetail: info?.roleDetail,
        leadStylist: info?.leadStylist,
        year: info?.year,
        season: info?.season,
        client: info?.client,
        publication: info?.publication,
        format: info?.format,
        credits: info?.credits,
      };
    }).filter(entry => entry.img || entry.video);
  };
}
