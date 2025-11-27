import React, { useCallback, useState } from 'react';
import { Upload, FolderInput, FileIcon } from 'lucide-react';
import { processFiles, traverseFileTree } from '../utils/fileHelpers';
import { UploadedFile } from '../types';

interface FileDropZoneProps {
  onFilesLoaded: (files: UploadedFile[]) => void;
  isProcessing: boolean;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({ onFilesLoaded, isProcessing }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    const rawFiles: File[] = [];

    if (items) {
      const promises: Promise<File[]>[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
          promises.push(traverseFileTree(item));
        }
      }
      const results = await Promise.all(promises);
      rawFiles.push(...results.flat());
    } else {
      // Fallback for browsers not supporting webkitGetAsEntry
      rawFiles.push(...Array.from(e.dataTransfer.files));
    }

    if (rawFiles.length > 0) {
      onFilesLoaded(processFiles(rawFiles));
    }
  }, [onFilesLoaded]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      onFilesLoaded(processFiles(files));
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative flex flex-col items-center justify-center w-full h-full p-8 border-2 border-dashed rounded-xl transition-all duration-300
        ${isDragging 
          ? 'border-indigo-500 bg-indigo-500/10' 
          : 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/50'
        }
      `}
    >
      <div className="flex flex-col items-center gap-4 text-zinc-400">
        <div className={`p-4 rounded-full bg-zinc-800 ${isProcessing ? 'animate-pulse' : ''}`}>
          {isProcessing ? (
             <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          ) : (
             <Upload size={40} className="text-indigo-400" />
          )}
        </div>
        
        <div className="text-center">
          <h3 className="text-xl font-bold text-white mb-2">
            {isProcessing ? '处理中...' : '拖放 Spine 文件'}
          </h3>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto">
            将 .skel, .atlas, 和 .png 文件拖到这里。支持直接拖入文件夹。
          </p>
        </div>

        <div className="flex gap-3 mt-4">
          <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 cursor-pointer transition-colors">
            <FileIcon size={16} />
            选择文件
            <input 
              type="file" 
              multiple 
              onChange={handleFileInput} 
              className="hidden" 
              accept=".json,.skel,.atlas,.png,.jpg,.jpeg"
            />
          </label>
           <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-zinc-700 rounded-lg hover:bg-zinc-600 cursor-pointer transition-colors">
            <FolderInput size={16} />
            选择文件夹
            <input 
              type="file" 
              // @ts-expect-error webkitdirectory is non-standard but supported in most modern browsers
              webkitdirectory=""
              directory="" 
              multiple 
              onChange={handleFileInput} 
              className="hidden" 
            />
          </label>
        </div>
        
        <div className="mt-6 text-xs text-zinc-600">
          支持 Spine 3.8 (.skel 二进制)
        </div>
      </div>
    </div>
  );
};