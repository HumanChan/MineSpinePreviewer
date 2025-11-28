import { Spine } from '@pixi-spine/runtime-3.8';

export interface SpineModel {
  name: string;
  spine: Spine;
  animations: string[];
  skins: string[];
  textureInfo: {
    name: string;
    width: number;
    height: number;
    size: number; // File size in bytes
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