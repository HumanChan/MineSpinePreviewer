import { UploadedFile } from '../types';

export const getExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

export const processFiles = (files: File[]): UploadedFile[] => {
  return files.map((file) => ({
    name: file.name,
    url: URL.createObjectURL(file),
    file,
    extension: getExtension(file.name),
  }));
};

// Recursively traverse a directory entry
export const traverseFileTree = async (item: FileSystemEntry): Promise<File[]> => {
  return new Promise((resolve) => {
    if (item.isFile) {
      (item as FileSystemFileEntry).file((file) => resolve([file]));
    } else if (item.isDirectory) {
      const dirReader = (item as FileSystemDirectoryEntry).createReader();
      dirReader.readEntries(async (entries) => {
        const promises = entries.map((entry) => traverseFileTree(entry));
        const results = await Promise.all(promises);
        resolve(results.flat());
      });
    } else {
      resolve([]);
    }
  });
};

export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'));
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as Text'));
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};
