import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Play, Pause, AlertCircle, Layers, Repeat, Box, Search, X, Bug } from 'lucide-react';
import { SpineModel, SpineDebugConfig } from '../types';

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
  spineModel: SpineModel | null;

  // Debug
  debugConfig: SpineDebugConfig;
  onDebugConfigChange: (config: SpineDebugConfig) => void;
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
  spineModel,
  debugConfig,
  onDebugConfigChange
}) => {
  const activeAnimRef = useRef<HTMLButtonElement>(null);
  const [modelSearch, setModelSearch] = useState('');

  // Auto-scroll to active animation when the list changes or selection changes
  useEffect(() => {
      if (activeAnimRef.current) {
          activeAnimRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
  }, [currentAnimation, selectedModelIndex]);

  // Filter models based on search, preserving original index
  const filteredModels = useMemo(() => {
    return models
      .map((model, index) => ({ model, index }))
      .filter(item => item.model.name.toLowerCase().includes(modelSearch.toLowerCase()));
  }, [models, modelSearch]);

  const toggleDebug = (key: keyof SpineDebugConfig) => {
    onDebugConfigChange({
        ...debugConfig,
        [key]: !debugConfig[key]
    });
  };

  return (
    <div className="w-80 h-full bg-zinc-900 border-l border-zinc-800 flex flex-col shadow-xl z-10 text-sm">
      
      {/* Header & Model Switcher */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900 space-y-3 flex-shrink-0">
        
        {/* Model Switcher List */}
        <div>
           <div className="flex items-center justify-between mb-2">
               <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                 <Box size={14}/> 模型列表 ({models.length})
               </h2>
           </div>

           {/* Search Input */}
           {models.length > 5 && (
             <div className="relative mb-2">
               <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                 <Search size={12} className="text-zinc-500" />
               </div>
               <input 
                  type="text" 
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder="搜索模型..."
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-md py-1.5 pl-8 pr-8 focus:outline-none focus:border-indigo-500 transition-colors placeholder-zinc-600"
               />
               {modelSearch && (
                 <button 
                   onClick={() => setModelSearch('')}
                   className="absolute inset-y-0 right-0 pr-2 flex items-center text-zinc-500 hover:text-zinc-300"
                 >
                   <X size={12} />
                 </button>
               )}
             </div>
           )}

           {models.length > 0 ? (
               <div className="bg-zinc-950/30 rounded-lg border border-zinc-800/50 p-1 space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                 {filteredModels.length > 0 ? (
                    filteredModels.map(({ model, index }) => {
                        const isActive = selectedModelIndex === index;
                        return (
                            <button 
                                key={index} 
                                onClick={() => onSelectModel(index)}
                                className={`w-full text-left px-3 py-2.5 rounded-md transition-all text-xs flex justify-between items-center group
                                    ${isActive
                                        ? 'bg-zinc-800 text-white border border-zinc-700/50 shadow-sm' 
                                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent'
                                    }
                                `}
                            >
                            <div className="flex flex-col overflow-hidden">
                                <span className="truncate font-medium">{model.name}</span>
                                <span className="text-[10px] text-zinc-600 truncate">
                                    {model.animations.length} 动作 • {model.skins.length} 皮肤
                                </span>
                            </div>
                            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_5px_rgba(99,102,241,0.5)] flex-shrink-0 ml-2"></div>}
                            </button>
                        );
                    })
                 ) : (
                    <div className="text-zinc-500 text-xs text-center py-2">无匹配模型</div>
                 )}
               </div>
           ) : (
               <div className="text-zinc-500 text-sm italic px-1">未加载模型</div>
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
          
          <div className="space-y-1 max-h-80 overflow-y-auto pr-2 custom-scrollbar bg-zinc-950/30 p-2 rounded-lg border border-zinc-800/50 min-h-[100px]">
            {animations.length === 0 ? (
                <div className="text-zinc-600 italic px-2 py-2 text-xs">该模型没有动作数据</div>
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

        {/* Debug Controls */}
        <div className="space-y-3 pt-4 border-t border-zinc-800">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Bug size={14} /> 调试视图 (Debug)
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 cursor-pointer">
                    <input type="checkbox" checked={debugConfig.bones} onChange={() => toggleDebug('bones')} className="rounded bg-zinc-800 border-zinc-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900" />
                    显示骨骼 (Bones)
                </label>
                <label className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 cursor-pointer">
                    <input type="checkbox" checked={debugConfig.regions} onChange={() => toggleDebug('regions')} className="rounded bg-zinc-800 border-zinc-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900" />
                    区域附件 (Region)
                </label>
                <label className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 cursor-pointer">
                    <input type="checkbox" checked={debugConfig.meshHull} onChange={() => toggleDebug('meshHull')} className="rounded bg-zinc-800 border-zinc-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900" />
                    网格轮廓 (Hull)
                </label>
                <label className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 cursor-pointer">
                    <input type="checkbox" checked={debugConfig.meshTriangles} onChange={() => toggleDebug('meshTriangles')} className="rounded bg-zinc-800 border-zinc-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900" />
                    网格三角形 (Tris)
                </label>
                <label className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 cursor-pointer">
                    <input type="checkbox" checked={debugConfig.clipping} onChange={() => toggleDebug('clipping')} className="rounded bg-zinc-800 border-zinc-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900" />
                    剪裁 (Clipping)
                </label>
                <label className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 cursor-pointer">
                    <input type="checkbox" checked={debugConfig.paths} onChange={() => toggleDebug('paths')} className="rounded bg-zinc-800 border-zinc-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900" />
                    路径 (Paths)
                </label>
                <label className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 cursor-pointer">
                    <input type="checkbox" checked={debugConfig.boundingBoxes} onChange={() => toggleDebug('boundingBoxes')} className="rounded bg-zinc-800 border-zinc-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900" />
                    包围盒 (Bounds)
                </label>
            </div>
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