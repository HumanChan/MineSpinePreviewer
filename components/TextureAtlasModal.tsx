import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface TextureAtlasModalProps {
  isOpen: boolean;
  onClose: () => void;
  textureName: string;
  textureUrl: string;
  width: number;
  height: number;
  // Animation specific info
  currentAnimation: string;
  animDuration: number;
  animFps: number;
  animFrameCount: number;
}

export const TextureAtlasModal: React.FC<TextureAtlasModalProps> = ({
  isOpen,
  onClose,
  textureName,
  textureUrl,
  width,
  height,
  currentAnimation,
  animDuration,
  animFps,
  animFrameCount
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setScale(Math.min(1, 800 / Math.max(width, height))); // Auto fit roughly (adjusted for larger view)
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, width, height]);

  if (!isOpen) return null;

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.min(Math.max(0.1, s * delta), 5));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden w-[96vw] max-w-[95vw] h-[92vh] flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Left: Image Preview Area */}
        <div className="flex-1 bg-zinc-950/50 relative overflow-hidden flex flex-col border-r border-zinc-800">
           {/* Toolbar Overlay */}
           <div className="absolute top-4 left-4 z-10 flex gap-2">
              <button onClick={() => setScale(s => Math.min(5, s * 1.2))} className="p-2 bg-zinc-800/80 rounded hover:bg-zinc-700 text-zinc-300" title="放大">
                 <ZoomIn size={16} />
              </button>
              <button onClick={() => setScale(s => Math.max(0.1, s / 1.2))} className="p-2 bg-zinc-800/80 rounded hover:bg-zinc-700 text-zinc-300" title="缩小">
                 <ZoomOut size={16} />
              </button>
              
              <button 
                onClick={() => { setScale(1); setPosition({x: 0, y: 0}); }} 
                className="px-2 bg-zinc-800/80 rounded hover:bg-zinc-700 text-zinc-300 text-xs font-mono font-bold flex items-center justify-center"
                title="原尺寸 (1:1)"
              >
                1:1
              </button>

              <div className="p-2 bg-zinc-800/80 rounded text-zinc-400 pointer-events-none min-w-[50px] text-center">
                <span className="text-xs font-mono">{Math.round(scale * 100)}%</span>
              </div>
           </div>

           <div 
             className="flex-1 cursor-grab active:cursor-grabbing flex items-center justify-center overflow-hidden w-full h-full"
             onWheel={handleWheel}
             onMouseDown={handleMouseDown}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
           >
             <div style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }} className="transition-transform duration-75 ease-out">
                {textureUrl ? (
                   <img 
                    ref={imgRef}
                    src={textureUrl} 
                    alt={textureName} 
                    draggable={false}
                    className="max-w-none pixelated shadow-2xl bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] bg-zinc-800"
                  />
                ) : (
                  <div className="text-zinc-500">无法加载预览</div>
                )}
             </div>
           </div>
           
           <div className="absolute bottom-4 left-4 text-xs text-zinc-500 pointer-events-none">
             提示: 滚轮缩放，拖拽移动
           </div>
        </div>

        {/* Right: Info Panel */}
        <div className="w-full md:w-96 bg-zinc-900 p-6 flex flex-col gap-6 shrink-0 relative border-l border-zinc-800">
           <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300">
             <X size={20} />
           </button>

           <div>
             <h3 className="text-lg font-bold text-white mb-1 truncate" title={textureName}>{textureName}</h3>
             <p className="text-xs text-zinc-500">纹理图集详情</p>
           </div>

           <div className="space-y-6">
             {/* Texture Stats */}
             <div className="bg-zinc-950/50 p-4 rounded-lg border border-zinc-800">
               <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                 图片信息
               </h4>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <div className="text-[10px] text-zinc-500">尺寸</div>
                   <div className="text-sm font-mono text-zinc-200">{width} x {height}</div>
                 </div>
                 <div>
                   <div className="text-[10px] text-zinc-500">像素数</div>
                   <div className="text-sm font-mono text-zinc-200">{((width * height) / 1000000).toFixed(2)} MP</div>
                 </div>
               </div>
             </div>

             {/* Animation Stats (Contextual) */}
             <div className="bg-zinc-950/50 p-4 rounded-lg border border-zinc-800">
               <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                 当前动画: {currentAnimation || '无'}
               </h4>
               <div className="space-y-3">
                 <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                   <span className="text-xs text-zinc-500">时长</span>
                   <span className="text-sm font-mono text-zinc-200">{animDuration.toFixed(3)}s</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                   <span className="text-xs text-zinc-500">帧率 (FPS)</span>
                   <span className="text-sm font-mono text-zinc-200">{animFps}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-xs text-zinc-500">总帧数</span>
                   <span className="text-sm font-mono text-zinc-200">{animFrameCount}</span>
                 </div>
               </div>
               <p className="text-[10px] text-zinc-600 mt-3 leading-tight">
                 * 帧数基于 FPS x 时长计算。Spine 默认按 30FPS 导出，实际运行取决于渲染引擎。
               </p>
             </div>
           </div>

        </div>
      </div>
    </div>
  );
};