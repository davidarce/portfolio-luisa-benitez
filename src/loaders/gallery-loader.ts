import { readdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface GalleryConfig {
  baseDir: string;
  jsonPath: string;
  jsonKey?: string;
  hasSubfolders?: boolean;
  basePath?: string;
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
  hasGallery: boolean;
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

      // Obtener todas las imágenes y videos excepto index.*
      const allFiles = readdirSync(imagesDir);
      const images = allFiles
        .filter(f => /\.(jpg|jpeg|png|webp|mp4|webm|mov)$/i.test(f) && !f.startsWith('index.'))
        .sort()
        .map(f => getPath(f));

      // Buscar imagen index
      const indexImage = allFiles.find(f => f.startsWith('index.'));
      const img = indexImage ? getPath(indexImage) : images[0];

      // Buscar video
      const videoFile = allFiles.find(f => /\.(mp4|webm|mov)$/i.test(f));
      const video = videoFile ? getPath(videoFile) : undefined;

      // Buscar info en el JSON
      const info = Array.isArray(jsonData)
        ? jsonData.find(item => item.id === slug || item.img?.includes(slug))
        : jsonData[slug]?.[0];

      // Determine if it has a gallery (more than 1 item or 1 item that is not the main video/img)
      // If it has only 1 video and that video is the main preview, then no gallery.
      // Actually, if it has > 1 items in 'images', it's a gallery.
      // If it has 1 item and that item is used as the preview video, then it's just that video.
      const hasGallery = images.length > 1;

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
        hasGallery,
        order: info?.order || 0,
      };
    }).filter(entry => entry.img || entry.video);
  };
}
