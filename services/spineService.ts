import * as PIXI from 'pixi.js';
import { TextureAtlas } from '@pixi-spine/base';
import { Spine, SkeletonBinary, AtlasAttachmentLoader } from '@pixi-spine/runtime-3.8';
import { UploadedFile, SpineModel } from '../types';
import { readFileAsArrayBuffer, readFileAsText } from '../utils/fileHelpers';

export class SpineLoaderService {
  /**
   * Attempts to assemble a Spine model from a collection of raw files.
   * Looks for .skel, .atlas, and matching .png files.
   */
  static async loadSpineFromFiles(files: UploadedFile[]): Promise<SpineModel> {
    // 1. Identify key files
    const skelFile = files.find((f) => f.extension === 'skel');
    const atlasFile = files.find((f) => f.extension === 'atlas');

    if (!skelFile) throw new Error('Missing .skel binary file.');
    if (!atlasFile) throw new Error('Missing .atlas file.');

    // 2. Read Atlas content
    const atlasText = await readFileAsText(atlasFile.file);

    // 3. Pre-load all image files
    // This ensures dimensions are ready before TextureAtlas parses them.
    const imageFiles = files.filter(f => ['png', 'jpg', 'jpeg'].includes(f.extension));
    const loadedImages = new Map<string, HTMLImageElement>();
    const textureInfo: { name: string; width: number; height: number }[] = [];

    await Promise.all(imageFiles.map(imgFile => new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            loadedImages.set(imgFile.name, img);
            textureInfo.push({
                name: imgFile.name,
                width: img.width,
                height: img.height
            });
            resolve();
        };
        img.onerror = () => {
             console.error(`Failed to load image: ${imgFile.name}`);
             reject(new Error(`Failed to load texture image: ${imgFile.name}`));
        };
        img.src = imgFile.url;
    })));

    // 4. Create Texture Atlas
    return new Promise((resolve, reject) => {
      new TextureAtlas(atlasText, (path: string, loaderFunction: (t: any) => void) => {
        // Find the matching pre-loaded image
        // Atlas paths might be relative, e.g., "images/head.png", but our file list might be flat or different.
        // We attempt to match by checking if the file name matches or ends with the path.
        let foundImage: HTMLImageElement | undefined;

        for (const [name, img] of loadedImages.entries()) {
             // 1. Exact match
             if (name === path) {
                 foundImage = img;
                 break;
             }
             // 2. Path ending match (common for folders)
             if (name.endsWith(path) || path.endsWith(name)) {
                 foundImage = img;
                 break;
             }
        }

        if (!foundImage) {
          // Fallback fuzzy search
          for (const [name, img] of loadedImages.entries()) {
              if (name.includes(path)) {
                  foundImage = img;
                  break;
              }
          }
        }

        if (!foundImage) {
          reject(new Error(`Could not find texture image for path: ${path}`));
          return;
        }

        // Create Texture from pre-loaded image (Pixi v8 style)
        // In v8, BaseTexture is removed. Texture.from handles Image/HTMLImageElement directly.
        const texture = PIXI.Texture.from(foundImage);
        loaderFunction(texture);

      }, (atlas: TextureAtlas) => {
        // 5. Atlas loaded, now load Skeleton
        try {
          const atlasLoader = new AtlasAttachmentLoader(atlas);
          const skeletonBinary = new SkeletonBinary(atlasLoader);

          // Need to read the .skel file as ArrayBuffer
          readFileAsArrayBuffer(skelFile.file).then((buffer) => {
            const skeletonData = skeletonBinary.readSkeletonData(new Uint8Array(buffer));
            const spine = new Spine(skeletonData);

            // Extract metadata
            const animations = skeletonData.animations.map(a => a.name);
            const skins = skeletonData.skins.map(s => s.name);

            resolve({
              name: skelFile.name.replace('.skel', ''),
              spine,
              animations,
              skins,
              textureInfo
            });
          }).catch(reject);

        } catch (err) {
          reject(new Error(`Failed to parse Skeleton Data: ${err}`));
        }
      });
    });
  }
}