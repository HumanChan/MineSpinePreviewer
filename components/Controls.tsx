import React, { useEffect, useRef } from 'react';
import { Play, Pause, AlertCircle, Layers, RotateCcw, Repeat, Image as ImageIcon, Box } from 'lucide-react';
import { SpineModel } from '../types';

interface ControlsProps {
  // Model selection
  models: SpineModel[];
  selectedModelIndex: number;
  onSelectModel: (index: number) => void;

  animations: string[];
  currentAnimation: string;
  onAnimationChange: (anim: string) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  timeScale: number;
  onTimeScaleChange: (scale: number) => void;
  onResetView: () => void;
  spineModel: SpineModel | null;
}

export const Controls: React.FC<ControlsProps> = ({
  models,
  selectedModelIndex,
  onSelectModel,
  animations,
  currentAnimation,
  onAnimationChange,
  isPlaying,
  onTogglePlay,
  isLooping,
  onToggleLoop,
  timeScale,
  onTimeScaleChange,
  onResetView,
  spineModel
}) => {
  const activeAnimRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to active animation when the list changes or selection changes
  useEffect(() => {
      if (activeAnimRef.current) {
          activeAnimRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
  }, [currentAnimation, selectedModelIndex]); // Run when animation or model changes

  return (
    <div className="w-80 h-full bg-zinc-900 border-l border-zinc-800 flex flex-col shadow-xl z-10 text-sm">
      
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900 space-y-4">
        
        {/* Model Switcher */}
        <div>
           <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
             <Box size={14}/> 模型选择 ({models.length})
           </h2>
           {models.length > 0 ? (
               <select 
                  value={selectedModelIndex}
                  onChange={(e) => onSelectModel(Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
               >
                 {models.map((m, idx) => (
                    <option key={idx} value={idx}>
                      {m.name}
                    </option>
                 ))}
               </select>
           ) : (
               <div className="text-zinc-500 text-sm italic">未加载模型</div>
           )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Animations List */}
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} /> 动作列表 ({animations.length})
                </h3>
            </div>
          
          <div className="space-y-1 max-h-80 overflow-y-auto pr-2 custom-scrollbar bg-zinc-950/30 p-2 rounded-lg border border-zinc-800/50">
            {animations.length === 0 ? (
                <div className="text-zinc-600 italic px-2">未找到动作</div>
            ) : (
                animations.map((anim) => {
                    const isActive = currentAnimation === anim;
                    return (
                        <button
                            key={anim}
                            ref={isActive ? activeAnimRef : null}
                            onClick={() => onAnimationChange(anim)}
                            className={`
                            w-full text-left px-3 py-2 rounded-md transition-all truncate text-xs
                            ${isActive 
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20' 
                                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                            }
                            `}
                            title={anim}
                        >
                            {anim}
                        </button>
                    );
                })
            )}
          </div>
        </div>

        {/* Playback Controls */}
        <div className="space-y-4 pt-4 border-t border-zinc-800">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">播放控制</h3>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={onTogglePlay}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all ${isPlaying ? 'bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
                >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    <span className="font-medium">{isPlaying ? '暂停' : '播放'}</span>
                </button>
                
                <button 
                    onClick={onToggleLoop}
                    className={`w-10 flex items-center justify-center py-2 rounded-md border transition-all ${isLooping ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}
                    title="循环播放"
                >
                    <Repeat size={16} />
                </button>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between text-xs text-zinc-400">
                    <span>速度</span>
                    <span className="font-mono">{timeScale.toFixed(2)}x</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="2.5"
                    step="0.1"
                    value={timeScale}
                    onChange={(e) => onTimeScaleChange(parseFloat(e.target.value))}
                    className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                
                {/* Speed Presets */}
                <div className="flex justify-between gap-2">
                  {[0.5, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => onTimeScaleChange(speed)}
                      className={`flex-1 text-[10px] py-1 rounded border transition-colors
                        ${Math.abs(timeScale - speed) < 0.05 
                          ? 'bg-zinc-700 border-zinc-600 text-white' 
                          : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400'
                        }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
            </div>
        </div>

        {/* View Settings */}
        <div className="space-y-4 pt-4 border-t border-zinc-800">
             <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">视图选项</h3>
             
             <button
                onClick={onResetView}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-zinc-800"
             >
                 <RotateCcw size={14}/> 重置视角
             </button>
        </div>

      </div>

      {/* Footer info */}
      <div className="p-4 border-t border-zinc-800 text-[10px] text-zinc-600 flex items-center gap-2">
          <AlertCircle size={12} />
          <span>支持 Spine 3.8 (.skel 二进制)</span>
      </div>
    </div>
  );
};