import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { Spine, RegionAttachment, MeshAttachment, ClippingAttachment } from '@pixi-spine/runtime-3.8';
import { SpineModel } from '../types';

interface SpineCanvasProps {
  spineModel: SpineModel | null;
  animation: string;
  timeScale: number;
  loop: boolean;
  backgroundColor: string; // Hex string e.g., '#18181b'
}

// Spine 3.8 Blend Mode Enum
// 0: Normal, 1: Additive, 2: Multiply, 3: Screen
enum SpineBlendMode {
    Normal = 0,
    Additive = 1,
    Multiply = 2,
    Screen = 3,
}

export const SpineCanvas: React.FC<SpineCanvasProps> = ({ 
  spineModel, 
  animation, 
  timeScale, 
  loop,
  backgroundColor 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const spineRef = useRef<Spine | null>(null);
  const mainContainerRef = useRef<PIXI.Container | null>(null);
  const axesContainerRef = useRef<PIXI.Container | null>(null);

  // Stats State
  const [stats, setStats] = useState({ 
      totalBones: 0,
      activeBones: 0,
      totalVertices: 0,
      activeVertices: 0,
      features: [] as string[],
      blendModes: [] as string[]
  });

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

  // Helper to calculate stats
  const updateStats = () => {
    if (!spineRef.current) return;
    const skeleton = spineRef.current.skeleton;
    const data = skeleton.data;
    
    // 1. Bones
    const totalBones = data.bones.length;
    const activeBones = skeleton.bones.length;

    // 2. Vertices (Active)
    let activeVertexCount = 0;
    const detectedFeatures = new Set<string>();
    const detectedBlendModes = new Set<string>();

    // Check Data level features
    if (data.ikConstraints.length > 0) detectedFeatures.add('IK 约束');
    if (data.transformConstraints.length > 0) detectedFeatures.add('变换约束');
    if (data.pathConstraints.length > 0) detectedFeatures.add('路径约束');

    // Iterate slots to find active attachments, vertex count, and blend modes
    for (const slot of skeleton.slots) {
        // Blend Modes
        const bm = slot.data.blendMode;
        // Cast to number to avoid type mismatch between Pixi BLEND_MODES and local SpineBlendMode enum
        const bmVal = bm as unknown as number;

        if (bmVal === SpineBlendMode.Additive) detectedBlendModes.add('叠加 (Additive)');
        else if (bmVal === SpineBlendMode.Multiply) detectedBlendModes.add('正片叠底 (Multiply)');
        else if (bmVal === SpineBlendMode.Screen) detectedBlendModes.add('滤色 (Screen)');

        if (!slot.attachment) continue;
        
        const attachment = slot.attachment;
        if (attachment instanceof RegionAttachment) {
            // Standard region attachment is a quad (4 vertices)
            activeVertexCount += 4;
        } else if (attachment instanceof MeshAttachment) {
            // Mesh attachment
            activeVertexCount += (attachment.worldVerticesLength >> 1);
            detectedFeatures.add('网格变形');
        } else if (attachment instanceof ClippingAttachment) {
            detectedFeatures.add('剪裁');
        }
    }

    // 3. Total Vertices (Approximate based on current Skin)
    // Counting all potential vertices in the active skin
    let totalVertexCount = 0;
    const skin = skeleton.skin || data.defaultSkin;
    
    // Better approximation: Sum of all attachments in data (if no skin) or current skin
    if (skin && (skin as any).attachments) {
         const attachments = (skin as any).attachments;
         // attachments is a Map-like object in 3.8 JS
         for (const key in attachments) {
             const att = attachments[key];
             if (att instanceof RegionAttachment) totalVertexCount += 4;
             else if (att instanceof MeshAttachment) totalVertexCount += (att.worldVerticesLength >> 1);
         }
    }

    setStats({ 
        totalBones,
        activeBones,
        totalVertices: totalVertexCount > 0 ? totalVertexCount : activeVertexCount, // Fallback if calculation fails
        activeVertices: activeVertexCount, 
        features: Array.from(detectedFeatures),
        blendModes: Array.from(detectedBlendModes)
    });
  };

  // Create Axes Helper
  const createAxes = () => {
      const container = new PIXI.Container();
      const graphics = new PIXI.Graphics();
      container.addChild(graphics);

      const axisLength = 2000;
      const tickSizeSmall = 6;
      const tickSizeLarge = 12;
      const stepSmall = 50;
      const stepLarge = 100;

      // X Axis (Red)
      graphics.lineStyle(2, 0xEF4444, 0.8);
      graphics.moveTo(-axisLength, 0);
      graphics.lineTo(axisLength, 0);
      
      // Y Axis (Green)
      graphics.lineStyle(2, 0x10B981, 0.8);
      graphics.moveTo(0, -axisLength);
      graphics.lineTo(0, axisLength);

      // Ticks & Labels
      const style = new PIXI.TextStyle({
          fontFamily: 'Arial',
          fontSize: 10,
          fill: 0xaaaaaa,
      });

      // Draw X Ticks
      for (let x = -axisLength; x <= axisLength; x += stepSmall) {
          if (x === 0) continue;
          const isLarge = x % stepLarge === 0;
          const size = isLarge ? tickSizeLarge : tickSizeSmall;
          
          graphics.lineStyle(1, 0xEF4444, 0.5);
          graphics.moveTo(x, -size);
          graphics.lineTo(x, size);

          if (isLarge) {
              const text = new PIXI.Text(x.toString(), style);
              text.anchor.set(0.5, 0);
              text.position.set(x, size + 2);
              container.addChild(text);
          }
      }

      // Draw Y Ticks
      for (let y = -axisLength; y <= axisLength; y += stepSmall) {
          if (y === 0) continue;
          const isLarge = y % stepLarge === 0;
          const size = isLarge ? tickSizeLarge : tickSizeSmall;

          graphics.lineStyle(1, 0x10B981, 0.5);
          graphics.moveTo(-size, y);
          graphics.lineTo(size, y);

          if (isLarge) {
              // Note: Y axis in Pixi goes down. Negative is up.
              // We display the raw coordinate value (so negative is up).
              const text = new PIXI.Text(y.toString(), style);
              text.anchor.set(1, 0.5);
              text.position.set(-size - 4, y);
              container.addChild(text);
          }
      }

      // Add center text
      const centerText = new PIXI.Text("(0,0)", { ...style, fill: 0xffffff, fontWeight: 'bold' });
      centerText.position.set(5, 5);
      container.addChild(centerText);

      return container;
  };

  // Handle Spine Model Loading
  useEffect(() => {
    if (!appRef.current || !spineModel || !mainContainerRef.current) return;

    // Clear previous spine and axes
    if (spineRef.current) {
      // Remove spine
      mainContainerRef.current.removeChild(spineRef.current as any);
      spineRef.current.destroy({ children: true });
      spineRef.current = null;
    }
    if (axesContainerRef.current) {
        mainContainerRef.current.removeChild(axesContainerRef.current);
        axesContainerRef.current.destroy({ children: true });
        axesContainerRef.current = null;
    }

    // 1. Create Axes
    const axes = createAxes();
    axesContainerRef.current = axes;
    mainContainerRef.current.addChild(axes);

    // 2. Create Spine
    const spine = new Spine(spineModel.spine.skeleton.data); // Create new instance from data
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
    // REMOVED explicit scaling to 0.5 to ensure 1:1 pixel match with ruler
    // spine.scale.set(0.5); 
    
    // Add Spine ON TOP of axes
    mainContainerRef.current.addChild(spine as any);

    // Default animation
    if (spineModel.animations.length > 0) {
        const initialAnim = spineModel.animations.find(a => a.toLowerCase().includes('idle')) || spineModel.animations[0];
        spine.state.setAnimation(0, initialAnim, loop);
    }

    // Initial Stats
    updateStats();

  }, [spineModel]);

  // Handle Animation Change
  useEffect(() => {
    if (!spineRef.current || !animation) return;
    try {
        // Start animation with current loop state
        spineRef.current.state.setAnimation(0, animation, loop);
        
        // Update stats after animation change (as attachments might change)
        setTimeout(updateStats, 0);

    } catch (e) {
        console.warn("Animation not found:", animation);
    }
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
                <p>等待模型加载...</p>
             </div>
        )}

        {/* Stats Panel */}
        {spineModel && (
            <div className="absolute top-20 left-6 z-20 pointer-events-none select-none">
                <div className="bg-zinc-950/80 backdrop-blur-md border border-zinc-700/50 p-6 rounded-xl shadow-2xl space-y-6 min-w-[320px] text-zinc-100">
                    
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-x-10 gap-y-6 pb-4 border-b border-zinc-700/50">
                        <div className="flex flex-col">
                            <span className="text-sm text-zinc-500 uppercase tracking-wider font-semibold">总骨骼数</span>
                            <span className="font-mono text-xl text-indigo-300">{stats.totalBones}</span>
                        </div>
                         <div className="flex flex-col">
                            <span className="text-sm text-zinc-500 uppercase tracking-wider font-semibold">骨骼变换数</span>
                            <span className="font-mono text-xl text-emerald-300">{stats.activeBones}</span>
                        </div>
                         <div className="flex flex-col">
                            <span className="text-sm text-zinc-500 uppercase tracking-wider font-semibold">总顶点数</span>
                            <span className="font-mono text-xl text-indigo-300">{stats.totalVertices}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm text-zinc-500 uppercase tracking-wider font-semibold">顶点变换数</span>
                            <span className="font-mono text-xl text-emerald-300">{stats.activeVertices}</span>
                        </div>
                    </div>
                    
                    {/* Features & Blend Modes */}
                    {(stats.features.length > 0 || stats.blendModes.length > 0) && (
                        <div className="space-y-4">
                             {stats.features.length > 0 && (
                                 <div>
                                    <span className="text-sm text-zinc-500 uppercase tracking-wider block mb-2 font-semibold">高级特性</span>
                                    <div className="flex flex-wrap gap-2">
                                        {stats.features.map(f => (
                                            <span key={f} className="px-3 py-1 bg-indigo-500/20 text-indigo-200 rounded text-sm border border-indigo-500/30 shadow-sm">
                                                {f}
                                            </span>
                                        ))}
                                    </div>
                                 </div>
                             )}

                             {stats.blendModes.length > 0 && (
                                 <div>
                                    <span className="text-sm text-zinc-500 uppercase tracking-wider block mb-2 font-semibold">叠加模式</span>
                                    <div className="flex flex-wrap gap-2">
                                        {stats.blendModes.map(f => (
                                            <span key={f} className="px-3 py-1 bg-purple-500/20 text-purple-200 rounded text-sm border border-purple-500/30 shadow-sm">
                                                {f}
                                            </span>
                                        ))}
                                    </div>
                                 </div>
                             )}
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};
