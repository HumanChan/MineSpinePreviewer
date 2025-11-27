import { SkeletonData } from '@pixi-spine/runtime-3.8';

export interface SpineModel {
  name: string;
  skeletonData: SkeletonData;
  animations: string[];
  skins: string[];
  textureInfo: {
    name: string;
    width: number;
    height: number;
  }[];
}

export interface UploadedFile {
  name: string;
  url: string; // Blob URL
  file: File;
  extension: string;
}

export interface SpineLoadError {
  message: string;
  details?: string;
}

export type ScaleMode = 'fit' | 'fill' | '1x';