import React, { useState, useCallback } from 'react';
import { SpineLoaderService } from './services/spineService';
import { SpineCanvas } from './components/SpineCanvas';
import { Controls } from './components/Controls';
import { FileDropZone } from './components/FileDropZone';
import { SpineModel, UploadedFile, SpineLoadError } from './types';
import { AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [spineModel, setSpineModel] = useState<SpineModel | null>(null);
  const [currentAnimation, setCurrentAnimation] = useState<string>('');
  const [timeScale, setTimeScale] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<SpineLoadError | null>(null);
  const [bgColor, setBgColor] = useState<string>('#18181b'); // Default zinc-900

  const handleFilesLoaded = useCallback(async (files: UploadedFile[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const model = await SpineLoaderService.loadSpineFromFiles(files);
      setSpineModel(model);
      
      // Set default animation
      if (model.animations.length > 0) {
        // Prefer 'idle' or 'run' if available, else first
        const defaultAnim = model.animations.find(a => a.toLowerCase().includes('idle')) || model.animations[0];
        setCurrentAnimation(defaultAnim);
      } else {
          setCurrentAnimation('');
      }

    } catch (err: any) {
      console.error(err);
      setError({
        message: 'Failed to load Spine model',
        details: err.message || 'Ensure you have a valid .skel, .atlas, and .png file matching version 3.8.'
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleResetView = () => {
      // Force a re-mount of canvas to reset camera/pan/zoom
      if (spineModel) {
        setSpineModel({ ...spineModel });
      }
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      
      {/* Main Canvas Area */}
      <div className="flex-1 relative flex flex-col">
        
        {/* Top Bar / Toolbar */}
        <div className="h-14 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-between px-6 absolute top-0 left-0 right-0 z-10 pointer-events-none">
            {/* Pointer events none allows clicking through to canvas if needed, but buttons need pointer-events-auto */}
            <div className="flex items-center gap-3 pointer-events-auto">
                <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Spine Previewer</span>
                <span className="px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-400 border border-zinc-700">v3.8</span>
            </div>
            
            <div className="flex items-center gap-4 pointer-events-auto">
                {/* Background Color Picker */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 uppercase font-medium">BG</span>
                    <button onClick={() => setBgColor('#18181b')} className={`w-5 h-5 rounded-full border border-zinc-600 bg-zinc-900 ${bgColor === '#18181b' ? 'ring-2 ring-indigo-500' : ''}`} />
                    <button onClick={() => setBgColor('#71717a')} className={`w-5 h-5 rounded-full border border-zinc-600 bg-zinc-500 ${bgColor === '#71717a' ? 'ring-2 ring-indigo-500' : ''}`} />
                    <button onClick={() => setBgColor('#e4e4e7')} className={`w-5 h-5 rounded-full border border-zinc-600 bg-zinc-200 ${bgColor === '#e4e4e7' ? 'ring-2 ring-indigo-500' : ''}`} />
                    <button onClick={() => setBgColor('transparent')} className={`w-5 h-5 rounded-full border border-zinc-600 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] bg-zinc-800 relative overflow-hidden ${bgColor === 'transparent' ? 'ring-2 ring-indigo-500' : ''}`}>
                         <div className="absolute inset-0 bg-white/10" style={{backgroundImage: 'conic-gradient(#eee 90deg, transparent 90deg)'}}></div>
                    </button>
                </div>
                
                {spineModel && (
                  <button 
                    onClick={() => setSpineModel(null)}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors bg-red-900/20 px-2 py-1 rounded border border-red-900/50"
                  >
                    Close File
                  </button>
                )}
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative">
          {spineModel ? (
            <SpineCanvas 
              spineModel={spineModel}
              animation={currentAnimation}
              timeScale={isPlaying ? timeScale : 0}
              loop={isLooping}
              showDebug={showDebug}
              backgroundColor={bgColor}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-8 z-20">
                <div className="w-full max-w-2xl h-96">
                    <FileDropZone 
                        onFilesLoaded={handleFilesLoaded}
                        isProcessing={isLoading}
                    />
                </div>
            </div>
          )}

          {/* Error Toast */}
          {error && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-700 text-red-100 px-6 py-4 rounded-lg shadow-xl flex items-start gap-4 max-w-md animate-in slide-in-from-bottom-5 z-50">
                <AlertTriangle className="shrink-0 text-red-400" />
                <div>
                    <h4 className="font-semibold">{error.message}</h4>
                    <p className="text-sm text-red-200 mt-1">{error.details}</p>
                    <button 
                        onClick={() => setError(null)}
                        className="text-xs mt-3 underline hover:text-white"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Controls */}
      <Controls 
        animations={spineModel?.animations || []}
        currentAnimation={currentAnimation}
        onAnimationChange={setCurrentAnimation}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        isLooping={isLooping}
        onToggleLoop={() => setIsLooping(!isLooping)}
        timeScale={timeScale}
        onTimeScaleChange={setTimeScale}
        showDebug={showDebug}
        onToggleDebug={() => setShowDebug(!showDebug)}
        onResetView={handleResetView}
        spineModel={spineModel}
      />

    </div>
  );
};

export default App;