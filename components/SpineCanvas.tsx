import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { Spine } from '@pixi-spine/runtime-3.8';
import { SpineModel } from '../types';

interface SpineCanvasProps {
  spineModel: SpineModel | null;
  animation: string;
  timeScale: number;
  loop: boolean;
  showDebug: boolean;
  backgroundColor: string; // Hex string e.g., '#18181b'
}

export const SpineCanvas: React.FC<SpineCanvasProps> = ({ 
  spineModel, 
  animation, 
  timeScale, 
  loop,
  showDebug,
  backgroundColor 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const spineRef = useRef<Spine | null>(null);
  const mainContainerRef = useRef<PIXI.Container | null>(null);

  // Initialize Pixi App (v7)
  useEffect(() => {
    if (!containerRef.current) return;

    const app = new PIXI.Application({
        resizeTo: containerRef.current,
        backgroundAlpha: 0, 
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
    });
    
    containerRef.current.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;

    // Create a main container for panning
    const mainContainer = new PIXI.Container();
    app.stage.addChild(mainContainer);
    mainContainerRef.current = mainContainer;

    // Enable interaction on the stage for "Canvas Dragging"
    app.stage.interactive = true;
    app.stage.hitArea = app.screen; 

    // Panning Logic
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let containerStartX = 0;
    let containerStartY = 0;

    app.stage.on('pointerdown', (e) => {
        isDragging = true;
        startX = e.global.x;
        startY = e.global.y;
        containerStartX = mainContainer.x;
        containerStartY = mainContainer.y;
        if (app.view.style) app.view.style.cursor = 'grabbing';
    });

    const onDragEnd = () => {
        isDragging = false;
        if(app.view.style) app.view.style.cursor = 'grab';
    };

    app.stage.on('pointerup', onDragEnd);
    app.stage.on('pointerupoutside', onDragEnd);

    app.stage.on('pointermove', (e) => {
        if (isDragging) {
            const dx = e.global.x - startX;
            const dy = e.global.y - startY;
            mainContainer.x = containerStartX + dx;
            mainContainer.y = containerStartY + dy;
        }
    });

    // Default cursor
    if(app.view.style) app.view.style.cursor = 'grab';

    return () => {
      app.destroy(true, { children: true, texture: true });
      appRef.current = null;
    };
  }, []);

  // Update Background
  useEffect(() => {
    if(containerRef.current) {
      containerRef.current.style.backgroundColor = backgroundColor;
    }
  }, [backgroundColor]);

  // Handle Spine Model Loading
  useEffect(() => {
    if (!appRef.current || !spineModel || !mainContainerRef.current) return;

    // Clear previous spine
    if (spineRef.current) {
      mainContainerRef.current.removeChild(spineRef.current as any);
      spineRef.current.destroy({ children: true });
      spineRef.current = null;
    }

    const spine = spineModel.spine;
    spineRef.current = spine;

    // Reset Container Position to Center
    const cx = appRef.current.screen.width / 2;
    const cy = appRef.current.screen.height / 2 + 200; 
    
    mainContainerRef.current.x = cx;
    mainContainerRef.current.y = cy;
    mainContainerRef.current.scale.set(1); // Reset zoom
    
    spine.x = 0;
    spine.y = 0;
    
    // Initial Scale 
    spine.scale.set(0.5);

    mainContainerRef.current.addChild(spine as any);

    // Default animation
    if (spineModel.animations.length > 0) {
        const initialAnim = spineModel.animations.find(a => a.toLowerCase().includes('idle')) || spineModel.animations[0];
        spine.state.setAnimation(0, initialAnim, loop);
    }
  }, [spineModel]);

  // Handle Animation Change
  useEffect(() => {
    if (!spineRef.current || !animation) return;
    try {
        // Start animation with current loop state
        const trackEntry = spineRef.current.state.setAnimation(0, animation, loop);
    } catch (e) {
        console.warn("Animation not found:", animation);
    }
    // We intentionally exclude 'loop' from dependencies here.
    // Changing 'loop' shouldn't restart the animation, it should just update the property (handled below).
  }, [animation]); 

  // Handle Loop Toggle independently
  useEffect(() => {
    if (!spineRef.current) return;
    const currentTrack = spineRef.current.state.getCurrent(0);
    if (currentTrack) {
        currentTrack.loop = loop;
    }
  }, [loop]);

  // Handle Time Scale
  useEffect(() => {
    if (!spineRef.current) return;
    spineRef.current.state.timeScale = timeScale;
  }, [timeScale]);

  // Handle Debug Mode
  useEffect(() => {
    if (!spineRef.current) return;
    (spineRef.current as any).debug = showDebug ? { 
        bones: true, 
        regions: true, 
        boxes: true, 
        meshHull: true, 
        meshTriangles: false, 
        paths: true, 
        clipping: true 
    } : null;
  }, [showDebug]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
        if (appRef.current && mainContainerRef.current) {
           appRef.current.resize();
           appRef.current.stage.hitArea = appRef.current.screen; // Update hit area
        }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Zoom Handler (Zooms the Container)
  const handleWheel = (e: React.WheelEvent) => {
      if (!mainContainerRef.current) return;
      const zoomSensitivity = 0.001;
      const newScale = Math.max(0.1, mainContainerRef.current.scale.x - e.deltaY * zoomSensitivity);
      mainContainerRef.current.scale.set(newScale);
  };

  return (
    <div 
        ref={containerRef} 
        onWheel={handleWheel}
        className="w-full h-full overflow-hidden relative"
        style={{
            backgroundImage: backgroundColor === 'transparent' ? 
                'conic-gradient(#333 90deg, #444 90deg 180deg, #333 180deg 270deg, #444 270deg)' : 'none',
            backgroundSize: '20px 20px'
        }}
    >
        {!spineModel && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-600">
                <p>Waiting for model...</p>
             </div>
        )}
    </div>
  );
};