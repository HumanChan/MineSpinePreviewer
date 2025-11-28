import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { Spine, RegionAttachment, MeshAttachment, ClippingAttachment, PathAttachment, BoundingBoxAttachment, Skeleton } from '@pixi-spine/runtime-3.8';
import { SpineModel, SpineDebugConfig } from '../types';
import { RotateCcw } from 'lucide-react';

interface SpineCanvasProps {
  spineModel: SpineModel | null;
  animation: string;
  timeScale: number;
  loop: boolean;
  backgroundColor: string; // Hex string e.g., '#18181b'
  debugConfig: SpineDebugConfig;
}

// Spine 3.8 Blend Mode Enum
// 0: Normal, 1: Additive, 2: Multiply, 3: Screen
enum SpineBlendMode {
    Normal = 0,
    Additive = 1,
    Multiply = 2,
    Screen = 3,
}

// Helper to format bytes
const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const SpineCanvas: React.FC<SpineCanvasProps> = ({ 
  spineModel, 
  animation, 
  timeScale, 
  loop,
  backgroundColor,
  debugConfig
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const spineRef = useRef<Spine | null>(null);
  const mainContainerRef = useRef<PIXI.Container | null>(null);
  const axesContainerRef = useRef<PIXI.Container | null>(null);
  const debugGraphicsRef = useRef<PIXI.Graphics | null>(null);

  // Stats State
  const [stats, setStats] = useState({ 
      // Skeleton
      totalBones: 0,
      totalSlots: 0,
      totalConstraints: 0,
      
      // Attachments (Active)
      activeVertices: 0,
      activeTriangles: 0,
      
      // Features
      features: [] as string[],
      blendModes: [] as string[],
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
    
    // 1. Skeleton Stats
    const totalBones = skeleton.bones.length;
    const totalSlots = skeleton.slots.length;
    // Constraints (IK + Transform + Path)
    const totalConstraints = skeleton.ikConstraints.length + skeleton.transformConstraints.length + skeleton.pathConstraints.length;

    // 2. Attachments & Features
    let activeVertexCount = 0;
    let activeTriangleCount = 0;
    const detectedFeatures = new Set<string>();
    const detectedBlendModes = new Set<string>();

    // Check Data level features
    if (data.ikConstraints.length > 0) detectedFeatures.add('IK 约束');
    if (data.transformConstraints.length > 0) detectedFeatures.add('变换约束');
    if (data.pathConstraints.length > 0) detectedFeatures.add('路径约束');

    // Iterate slots
    for (const slot of skeleton.slots) {
        // Blend Modes
        const bm = slot.data.blendMode;
        const bmVal = bm as unknown as number;

        if (bmVal === SpineBlendMode.Additive) detectedBlendModes.add('叠加 (Additive)');
        else if (bmVal === SpineBlendMode.Multiply) detectedBlendModes.add('正片叠底 (Multiply)');
        else if (bmVal === SpineBlendMode.Screen) detectedBlendModes.add('滤色 (Screen)');

        if (!slot.attachment) continue;
        
        const attachment = slot.attachment;
        if (attachment instanceof RegionAttachment) {
            // Quad: 4 vertices, 2 triangles
            activeVertexCount += 4;
            activeTriangleCount += 2;
        } else if (attachment instanceof MeshAttachment) {
            // Mesh
            activeVertexCount += (attachment.worldVerticesLength >> 1);
            activeTriangleCount += (attachment.triangles.length / 3);
            detectedFeatures.add('网格变形 (Mesh)');
        } else if (attachment instanceof ClippingAttachment) {
            detectedFeatures.add('剪裁 (Clipping)');
        }
    }

    setStats({ 
        totalBones,
        totalSlots,
        totalConstraints,
        activeVertices: activeVertexCount, 
        activeTriangles: Math.floor(activeTriangleCount),
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

  // Custom Debug Renderer
  const renderDebug = (skeleton: Skeleton, graphics: PIXI.Graphics) => {
    graphics.clear();
    const config = debugConfig;
    if (!config) return;

    // 1. Draw Bones
    if (config.bones) {
        const boneColor = 0x00FFFF; // Cyan (Reference Style)
        const boneAlpha = 1;
        const boneFillAlpha = 0.25;
        const boneBaseWidth = 8; // Adjust based on preference

        for (const bone of skeleton.bones) {
            const x = bone.worldX;
            const y = bone.worldY;
            const len = bone.data.length;

            if (len > 0) {
                // Bone with length: Draw Triangle/Cone with pivot circle
                const a = (bone as any).a;
                const c = (bone as any).c;

                // 1. Tip
                const tipX = x + len * a;
                const tipY = y + len * c;

                // 2. Base Width Perpendicular
                const scale = Math.sqrt(a * a + c * c);
                let perX = 0;
                let perY = 0;
                
                if (scale > 0) {
                    const nx = a / scale;
                    const ny = c / scale;
                    perX = -ny * (boneBaseWidth / 2);
                    perY = nx * (boneBaseWidth / 2);
                }

                // Base points
                const b1x = x + perX;
                const b1y = y + perY;
                const b2x = x - perX;
                const b2y = y - perY;

                // Draw Body (Triangle)
                graphics.lineStyle(1.5, boneColor, boneAlpha);
                graphics.beginFill(boneColor, boneFillAlpha);
                graphics.moveTo(b1x, b1y);
                graphics.lineTo(tipX, tipY);
                graphics.lineTo(b2x, b2y);
                graphics.closePath(); // Close base
                graphics.endFill();

                // Draw Center Line (Spine of the bone)
                graphics.lineStyle(1, boneColor, 0.6);
                graphics.moveTo(x, y);
                graphics.lineTo(tipX, tipY);

                // Draw Pivot Joint (Hollow/Dark Circle)
                graphics.lineStyle(1.5, boneColor, boneAlpha);
                graphics.beginFill(0x000000, 0.6); // Dark fill for joint "hole" look
                graphics.drawCircle(x, y, 3);
                graphics.endFill();

            } else {
                // 0-length bone (Control/IK point)
                // Draw Circle with 'X'
                const radius = 5;
                
                graphics.lineStyle(1.5, boneColor, boneAlpha);
                graphics.beginFill(boneColor, 0.1); 
                graphics.drawCircle(x, y, radius);
                graphics.endFill();

                // Draw 'X' inside
                const d = radius * 0.5;
                graphics.moveTo(x - d, y - d);
                graphics.lineTo(x + d, y + d);
                graphics.moveTo(x + d, y - d);
                graphics.lineTo(x - d, y + d);
            }
        }
    }

    // Reuse vertex array to save GC
    const vertices: ArrayLike<number> = [];
    
    // Iterate Slots for Attachments
    for (const slot of skeleton.slots) {
        if (!slot.attachment) continue;
        const attachment = slot.attachment;

        // 2. Region Attachments (Images)
        if (attachment instanceof RegionAttachment) {
            if (config.regions) {
                const worldVertices = new Float32Array(8);
                attachment.computeWorldVertices(slot.bone, worldVertices, 0, 2);
                
                graphics.lineStyle(1.5, 0xFF8800, 0.9); // Orange
                graphics.moveTo(worldVertices[0], worldVertices[1]);
                graphics.lineTo(worldVertices[2], worldVertices[3]);
                graphics.lineTo(worldVertices[4], worldVertices[5]);
                graphics.lineTo(worldVertices[6], worldVertices[7]);
                graphics.lineTo(worldVertices[0], worldVertices[1]);
                graphics.closePath();
            }
        }

        // 3. Mesh Attachments
        else if (attachment instanceof MeshAttachment) {
            const worldVertices = new Float32Array(attachment.worldVerticesLength);
            attachment.computeWorldVertices(slot, 0, attachment.worldVerticesLength, worldVertices, 0, 2);

            // Draw Hull (Contour)
            if (config.meshHull) {
                // hullLength is number of vertices on the hull
                const hullLength = attachment.hullLength;
                
                if (hullLength > 0) {
                    graphics.lineStyle(2, 0xFFFF00, 0.9); // Yellow
                    graphics.beginFill(0xFFFF00, 0.1);
                    
                    // The hull vertices are the first 'hullLength' vertices in the array
                    for (let i = 0; i < hullLength; i++) {
                        const x = worldVertices[i * 2];
                        const y = worldVertices[i * 2 + 1];
                        if (i === 0) graphics.moveTo(x, y);
                        else graphics.lineTo(x, y);
                    }
                    // Close the loop
                    graphics.lineTo(worldVertices[0], worldVertices[1]);
                    graphics.endFill();
                }
            }

            // Draw Triangles (Wireframe)
            if (config.meshTriangles) {
                graphics.lineStyle(1, 0xFF00FF, 0.4); // Magenta, thinner, transparent
                const triangles = attachment.triangles;
                // Draw each triangle side
                for (let i = 0; i < triangles.length; i += 3) {
                    const t1 = triangles[i] * 2;
                    const t2 = triangles[i+1] * 2;
                    const t3 = triangles[i+2] * 2;
                    
                    const x1 = worldVertices[t1], y1 = worldVertices[t1+1];
                    const x2 = worldVertices[t2], y2 = worldVertices[t2+1];
                    const x3 = worldVertices[t3], y3 = worldVertices[t3+1];

                    graphics.moveTo(x1, y1);
                    graphics.lineTo(x2, y2);
                    graphics.lineTo(x3, y3);
                    graphics.lineTo(x1, y1);
                }
            }
        }

        // 4. Clipping Attachments
        else if (attachment instanceof ClippingAttachment) {
            if (config.clipping) {
                 const worldVertices = new Float32Array(attachment.worldVerticesLength);
                 attachment.computeWorldVertices(slot, 0, attachment.worldVerticesLength, worldVertices, 0, 2);
                 
                 graphics.lineStyle(2, 0xCC0000, 1); // Dark Red
                 graphics.beginFill(0xCC0000, 0.1);
                 for (let i = 0; i < worldVertices.length; i += 2) {
                     if (i === 0) graphics.moveTo(worldVertices[i], worldVertices[i+1]);
                     else graphics.lineTo(worldVertices[i], worldVertices[i+1]);
                 }
                 graphics.closePath(); 
                 graphics.endFill();
            }
        }

        // 5. Path Attachments
        else if (attachment instanceof PathAttachment) {
            if (config.paths) {
                 const worldVertices = new Float32Array(attachment.worldVerticesLength);
                 attachment.computeWorldVertices(slot, 0, attachment.worldVerticesLength, worldVertices, 0, 2);
                 
                 graphics.lineStyle(2, 0x0000FF, 1); // Blue
                 // Paths can be open or closed
                 for (let i = 0; i < worldVertices.length; i += 2) {
                     if (i === 0) graphics.moveTo(worldVertices[i], worldVertices[i+1]);
                     else graphics.lineTo(worldVertices[i], worldVertices[i+1]);
                 }
                 if (attachment.closed) graphics.closePath();
                 
                 // Draw control points
                 graphics.lineStyle(0);
                 graphics.beginFill(0x0000FF, 0.8);
                 for (let i = 0; i < worldVertices.length; i += 2) {
                    graphics.drawCircle(worldVertices[i], worldVertices[i+1], 3);
                 }
                 graphics.endFill();
            }
        }

        // 6. Bounding Box Attachments
        else if (attachment instanceof BoundingBoxAttachment) {
            if (config.boundingBoxes) {
                 const worldVertices = new Float32Array(attachment.worldVerticesLength);
                 attachment.computeWorldVertices(slot, 0, attachment.worldVerticesLength, worldVertices, 0, 2);
                 
                 graphics.lineStyle(2, 0x00FF00, 0.8); // Green
                 graphics.beginFill(0x00FF00, 0.1);
                 for (let i = 0; i < worldVertices.length; i += 2) {
                     if (i === 0) graphics.moveTo(worldVertices[i], worldVertices[i+1]);
                     else graphics.lineTo(worldVertices[i], worldVertices[i+1]);
                 }
                 graphics.closePath();
                 graphics.endFill();
            }
        }
    }
  };

  // Handle Spine Model Loading
  useEffect(() => {
    if (!appRef.current || !spineModel || !mainContainerRef.current) return;

    // Clear previous spine and axes
    if (spineRef.current) {
      mainContainerRef.current.removeChild(spineRef.current as any);
      spineRef.current.destroy({ children: true });
      spineRef.current = null;
    }
    if (axesContainerRef.current) {
        mainContainerRef.current.removeChild(axesContainerRef.current);
        axesContainerRef.current.destroy({ children: true });
        axesContainerRef.current = null;
    }
    if (debugGraphicsRef.current) {
        mainContainerRef.current.removeChild(debugGraphicsRef.current);
        debugGraphicsRef.current.destroy();
        debugGraphicsRef.current = null;
    }

    // 1. Create Axes
    const axes = createAxes();
    axesContainerRef.current = axes;
    mainContainerRef.current.addChild(axes);

    // 2. Create Spine
    const spine = new Spine(spineModel.spine.skeleton.data); 
    spineRef.current = spine;

    // 3. Create Debug Graphics (Layered on top of Spine)
    const debugG = new PIXI.Graphics();
    debugGraphicsRef.current = debugG;
    // Add Spine first, then debug graphics
    mainContainerRef.current.addChild(spine as any);
    mainContainerRef.current.addChild(debugG);

    // Apply animation immediately if one is selected
    if (animation) {
        try {
            spine.state.setAnimation(0, animation, loop);
        } catch (e) {
            console.warn("Auto-play: Animation not found:", animation);
        }
    }
    
    // Apply initial timeScale
    spine.state.timeScale = timeScale;

    // Reset Container Position to Center
    const cx = appRef.current.screen.width / 2;
    const cy = appRef.current.screen.height / 2 + 200; 
    
    mainContainerRef.current.x = cx;
    mainContainerRef.current.y = cy;
    mainContainerRef.current.scale.set(1); 
    
    spine.x = 0;
    spine.y = 0;

    // Initial Stats
    updateStats();

  }, [spineModel]); // Only re-run when model object changes

  // Ticker for Debug Rendering
  useEffect(() => {
    if (!appRef.current) return;
    
    const tickerFunc = () => {
        if (spineRef.current && debugGraphicsRef.current) {
            // Only render debug if any flag is true to save perf
            const hasDebug = Object.values(debugConfig).some(v => v);
            if (hasDebug) {
                renderDebug(spineRef.current.skeleton, debugGraphicsRef.current);
            } else {
                debugGraphicsRef.current.clear();
            }
        }
    };

    appRef.current.ticker.add(tickerFunc);
    
    return () => {
        appRef.current?.ticker.remove(tickerFunc);
    };
  }, [debugConfig]);

  // Handle Animation Change (Secondary)
  useEffect(() => {
    if (!spineRef.current || !animation) return;
    try {
        spineRef.current.state.setAnimation(0, animation, loop);
        setTimeout(updateStats, 0);
    } catch (e) {
        console.warn("Animation not found:", animation);
    }
  }, [animation]); 

  // Handle Loop Toggle
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
           appRef.current.stage.hitArea = appRef.current.screen; 
        }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Zoom Handler
  const handleWheel = (e: React.WheelEvent) => {
      if (!mainContainerRef.current) return;
      const zoomSensitivity = 0.001;
      const newScale = Math.max(0.1, mainContainerRef.current.scale.x - e.deltaY * zoomSensitivity);
      mainContainerRef.current.scale.set(newScale);
  };

  const handleResetZoom = () => {
    if (!mainContainerRef.current || !appRef.current) return;
    const cx = appRef.current.screen.width / 2;
    const cy = appRef.current.screen.height / 2 + 200;
    mainContainerRef.current.scale.set(1);
    mainContainerRef.current.position.set(cx, cy);
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
                <div className="bg-zinc-950/80 backdrop-blur-md border border-zinc-700/50 p-5 rounded-xl shadow-2xl min-w-[300px] text-zinc-100 flex flex-col gap-6">
                    
                    {/* Section 1: Skeleton */}
                    <div>
                        <div className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-2 border-b border-indigo-500/20 pb-1">
                            骨架信息 (Skeleton)
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                             <div>
                                <div className="text-[10px] text-zinc-500">骨骼数</div>
                                <div className={`font-mono text-base ${stats.totalBones > 500 ? 'text-red-500 font-bold' : ''}`}>{stats.totalBones}</div>
                             </div>
                             <div>
                                <div className="text-[10px] text-zinc-500">插槽数</div>
                                <div className="font-mono text-base">{stats.totalSlots}</div>
                             </div>
                             <div>
                                <div className="text-[10px] text-zinc-500">约束数</div>
                                <div className="font-mono text-base">{stats.totalConstraints}</div>
                             </div>
                        </div>
                    </div>

                    {/* Section 2: Attachments */}
                    <div>
                        <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-2 border-b border-emerald-500/20 pb-1">
                            附件信息 (Attachments)
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                             <div>
                                <div className="text-[10px] text-zinc-500">渲染顶点数</div>
                                <div className={`font-mono text-base ${stats.activeVertices > 1000 ? 'text-red-500 font-bold' : ''}`}>{stats.activeVertices}</div>
                             </div>
                             <div>
                                <div className="text-[10px] text-zinc-500">渲染三角形</div>
                                <div className="font-mono text-base">{stats.activeTriangles}</div>
                             </div>
                        </div>
                    </div>

                    {/* Section 3: Features */}
                    {(stats.features.length > 0 || stats.blendModes.length > 0) && (
                        <div>
                            <div className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-2 border-b border-amber-500/20 pb-1">
                                特性与模式 (Features)
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {stats.features.map(f => (
                                    <span key={f} className="px-2 py-0.5 bg-red-900/40 text-red-200 font-semibold rounded text-[10px] border border-red-500/40">
                                        {f}
                                    </span>
                                ))}
                                {stats.blendModes.map(f => (
                                    <span key={f} className="px-2 py-0.5 bg-red-900/40 text-red-200 font-semibold rounded text-[10px] border border-red-500/40">
                                        {f}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Section 4: Images */}
                    {spineModel.textureInfo.length > 0 && (
                        <div>
                             <div className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-2 border-b border-blue-500/20 pb-1">
                                图片资源 (Images)
                            </div>
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                {spineModel.textureInfo.map((tex, i) => {
                                    const isLargeDim = tex.width > 1024 || tex.height > 1024;
                                    const isLargeSize = tex.size > 2 * 1024 * 1024; // 2MB
                                    return (
                                        <div key={i} className="flex justify-between items-center text-xs bg-zinc-900/50 p-2 rounded">
                                            <span className="text-zinc-200 truncate max-w-[120px]" title={tex.name}>{tex.name}</span>
                                            <div className="flex gap-2 text-zinc-400 font-mono font-medium">
                                                <span className={isLargeDim ? 'text-red-500 font-bold' : ''}>{tex.width}x{tex.height}</span>
                                                <span className={isLargeSize ? 'text-red-500 font-bold' : ''}>{formatBytes(tex.size)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        )}

        {/* Bottom Left Controls */}
        {spineModel && (
            <div className="absolute bottom-4 left-6 z-20">
                <button
                    onClick={handleResetZoom}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800/80 backdrop-blur border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700 rounded-full shadow-lg transition-all text-xs font-medium"
                >
                    <RotateCcw size={14} /> 重置缩放
                </button>
            </div>
        )}
    </div>
  );
};