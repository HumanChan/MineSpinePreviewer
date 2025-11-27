import React from 'react';
import { Play, Pause, AlertCircle, Layers, Box, RotateCcw, Repeat, Image as ImageIcon } from 'lucide-react';
import { SpineModel } from '../types';

interface ControlsProps {
  animations: string[];
  currentAnimation: string;
  onAnimationChange: (anim: string) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  timeScale: number;
  onTimeScaleChange: (scale: number) => void;
  showDebug: boolean;
  onToggleDebug: () => void;
  onResetView: () => void;
  spineModel: SpineModel | null;
}

export const Controls: React.FC<ControlsProps> = ({
  animations,
  currentAnimation,
  onAnimationChange,
  isPlaying,
  onTogglePlay,
  isLooping,
  onToggleLoop,
  timeScale,
  onTimeScaleChange,
  showDebug,
  onToggleDebug,
  onResetView,
  spineModel
}) => {
  return (
    <div className="w-80 h-full bg-zinc-900 border-l border-zinc-800 flex flex-col shadow-xl z-10 text-sm">
      
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Model</h2>
        <div className="text-white font-medium truncate" title={spineModel?.name || "No model loaded"}>
          {spineModel?.name || "No model loaded"}
        </div>
        
        {/* Texture Info */}
        {spineModel && spineModel.textureInfo.length > 0 && (
          <div className="mt-2 space-y-1">
             {spineModel.textureInfo.map((tex, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-zinc-500">
                  <ImageIcon size={12} />
                  <span className="truncate max-w-[150px]">{tex.name}</span>
                  <span className="text-zinc-400">({tex.width} x {tex.height})</span>
                </div>
             ))}
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Animations List */}
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} /> Animations ({animations.length})
                </h3>
            </div>
          
          <div className="space-y-1 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {animations.length === 0 ? (
                <div className="text-zinc-600 italic px-2">No animations found</div>
            ) : (
                animations.map((anim) => (
                <button
                    key={anim}
                    onClick={() => onAnimationChange(anim)}
                    className={`
                    w-full text-left px-3 py-2 rounded-md transition-all truncate
                    ${currentAnimation === anim 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20' 
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }
                    `}
                    title={anim}
                >
                    {anim}
                </button>
                ))
            )}
          </div>
        </div>

        {/* Playback Controls */}
        <div className="space-y-4 pt-4 border-t border-zinc-800">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Playback</h3>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={onTogglePlay}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all ${isPlaying ? 'bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
                >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    <span className="font-medium">{isPlaying ? 'Pause' : 'Play'}</span>
                </button>
                
                <button 
                    onClick={onToggleLoop}
                    className={`w-10 flex items-center justify-center py-2 rounded-md border transition-all ${isLooping ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}
                    title="Toggle Loop"
                >
                    <Repeat size={16} />
                </button>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between text-xs text-zinc-400">
                    <span>Speed</span>
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
             <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">View Options</h3>
             
             <button
                onClick={onToggleDebug}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors border border-zinc-700 ${showDebug ? 'bg-indigo-900/30 border-indigo-500/50 text-indigo-300' : 'text-zinc-400 hover:bg-zinc-800'}`}
             >
                 <span className="flex items-center gap-2"><Box size={14}/> Debug Bones</span>
                 <div className={`w-2 h-2 rounded-full ${showDebug ? 'bg-indigo-500' : 'bg-zinc-600'}`}></div>
             </button>

             <button
                onClick={onResetView}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-zinc-800"
             >
                 <RotateCcw size={14}/> Reset Camera
             </button>
        </div>

      </div>

      {/* Footer info */}
      <div className="p-4 border-t border-zinc-800 text-[10px] text-zinc-600 flex items-center gap-2">
          <AlertCircle size={12} />
          <span>Supports Spine 3.8 (.skel)</span>
      </div>
    </div>
  );
};