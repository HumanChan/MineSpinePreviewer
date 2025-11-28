import * as PIXI from 'pixi.js';
import { TextureAtlas } from '@pixi-spine/base';
import { Spine, SkeletonBinary, AtlasAttachmentLoader } from '@pixi-spine/runtime-3.8';
import { UploadedFile, SpineModel } from '../types';
import { readFileAsArrayBuffer, readFileAsText } from '../utils/fileHelpers';

export class SpineLoaderService {
  /**
   * Attempts to assemble Spine models from a collection of raw files.
   * Looks for all .skel files and pairs them with matching .atlas files.
   * Returns an array of successfully loaded models.
   */
  static async loadSpineFromFiles(files: UploadedFile[]): Promise<SpineModel[]> {
    // 1. Identify all skel files
    const skelFiles = files.filter((f) => f.extension === 'skel');
    if (skelFiles.length === 0) {
      throw new Error('未找到 .skel 二进制文件。请确保上传了 Spine 3.8 格式的导出文件。');
    }

    // 2. Pre-load all image files once
    // This creates a pool of textures that any atlas can reference.
    const imageFiles = files.filter(f => ['png', 'jpg', 'jpeg'].includes(f.extension));
    const loadedImages = new Map<string, { img: HTMLImageElement, size: number }>();
    
    await Promise.all(imageFiles.map(imgFile => new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            loadedImages.set(imgFile.name, { img, size: imgFile.file.size });
            resolve();
        };
        img.onerror = () => {
             console.warn(`Failed to load image: ${imgFile.name}`);
             // Don't reject entire batch just for one bad image, but log it.
             resolve(); 
        };
        img.src = imgFile.url;
    })));

    const loadedModels: SpineModel[] = [];
    const errors: string[] = [];

    // 3. Process each skeleton file
    for (const skelFile of skelFiles) {
      const baseName = skelFile.name.replace(/\.skel$/, '');
      // Try to find matching atlas: "name.atlas"
      const atlasFile = files.find(f => f.extension === 'atlas' && f.name.replace(/\.atlas$/, '') === baseName);

      if (!atlasFile) {
        errors.push(`找不到与 ${skelFile.name} 匹配的 .atlas 文件`);
        continue;
      }

      try {
        const model = await this.loadSingleSpine(skelFile, atlasFile, loadedImages);
        loadedModels.push(model);
      } catch (err: any) {
        errors.push(`加载模型 ${baseName} 失败: ${err.message}`);
      }
    }

    if (loadedModels.length === 0) {
      throw new Error(errors.join('\n') || '无法加载任何模型。');
    }

    return loadedModels;
  }

  private static async loadSingleSpine(
    skelFile: UploadedFile, 
    atlasFile: UploadedFile, 
    loadedImages: Map<string, { img: HTMLImageElement, size: number }>
  ): Promise<SpineModel> {
    
    // Read Atlas content
    const atlasText = await readFileAsText(atlasFile.file);

    // Create Texture Atlas
    return new Promise((resolve, reject) => {
      new TextureAtlas(atlasText, (path: string, loaderFunction: (t: any) => void) => {
        // Find the matching pre-loaded image
        let foundData: { img: HTMLImageElement, size: number } | undefined;

        for (const [name, data] of loadedImages.entries()) {
             // 1. Exact match
             if (name === path) {
                 foundData = data;
                 break;
             }
             // 2. Path ending match (common for folders where path is "images/abc.png" but file is "abc.png")
             if (name.endsWith(path) || path.endsWith(name)) {
                 foundData = data;
                 break;
             }
        }

        if (!foundData) {
          // Fallback fuzzy search (contains)
          for (const [name, data] of loadedImages.entries()) {
              if (name.includes(path)) {
                  foundData = data;
                  break;
              }
          }
        }

        if (!foundData) {
          reject(new Error(`无法找到纹理图片: ${path}`));
          return;
        }

        // Create Texture from pre-loaded image
        const texture = PIXI.Texture.from(foundData.img);
        loaderFunction(texture);

      }, (atlas: TextureAtlas) => {
        // Atlas loaded, now load Skeleton
        try {
          const atlasLoader = new AtlasAttachmentLoader(atlas);
          const skeletonBinary = new SkeletonBinary(atlasLoader);

          readFileAsArrayBuffer(skelFile.file).then((buffer) => {
            const skeletonData = skeletonBinary.readSkeletonData(new Uint8Array(buffer));
            const spine = new Spine(skeletonData);

            // Extract metadata
            const animations = skeletonData.animations.map(a => a.name);
            const skins = skeletonData.skins.map(s => s.name);
            
            // Extract Texture Info for UI
            const textureInfo: { name: string; width: number; height: number; size: number }[] = [];
            
            // We need to look up sizes again based on atlas pages
            for (const page of atlas.pages) {
                if (page.baseTexture && page.baseTexture.resource && (page.baseTexture.resource as any).source) {
                    const source = (page.baseTexture.resource as any).source as HTMLImageElement;
                    
                    // Try to find the original size we stored
                    let size = 0;
                    // Reverse lookup by object reference would be ideal, but map iteration is fast enough here
                    for(const val of loadedImages.values()) {
                        if(val.img === source) {
                            size = val.size;
                            break;
                        }
                    }

                    textureInfo.push({
                        name: page.name,
                        width: source.width,
                        height: source.height,
                        size: size
                    });
                }
            }

            resolve({
              name: skelFile.name.replace('.skel', ''),
              spine,
              animations,
              skins,
              textureInfo
            });
          }).catch(reject);

        } catch (err) {
          reject(new Error(`解析 Skeleton Data 失败: ${err}`));
        }
      });
    });
  }
}