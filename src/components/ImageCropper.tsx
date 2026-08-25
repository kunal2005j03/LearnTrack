import React, { useState, useRef, useEffect } from 'react';
import { X, Crop, Check, RotateCcw } from 'lucide-react';

interface ImageCropperProps {
  imageUrl: string;
  onExtract: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ imageUrl, onExtract, onCancel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Crop state relative to image rendered size
  const [crop, setCrop] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragType, setDragType] = useState<'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | null>(null);

  // Quick initial center crop
  useEffect(() => {
    if (imageRef.current) {
      const { clientWidth, clientHeight } = imageRef.current;
      setCrop({
        x: clientWidth * 0.1,
        y: clientHeight * 0.1,
        width: clientWidth * 0.8,
        height: clientHeight * 0.8
      });
    }
  }, [imageUrl]);

  const handlePointerDown = (e: React.PointerEvent, type: typeof dragType) => {
    e.preventDefault();
    setIsDragging(true);
    setDragType(type);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !imageRef.current) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });

    const { clientWidth, clientHeight } = imageRef.current;

    setCrop(prev => {
      let { x, y, width, height } = prev;

      if (dragType === 'move') {
        x += dx;
        y += dy;
      } else if (dragType === 'resize-nw') {
        x += dx;
        y += dy;
        width -= dx;
        height -= dy;
      } else if (dragType === 'resize-ne') {
        y += dy;
        width += dx;
        height -= dy;
      } else if (dragType === 'resize-sw') {
        x += dx;
        width -= dx;
        height += dy;
      } else if (dragType === 'resize-se') {
        width += dx;
        height += dy;
      }

      // Constraints
      if (width < 30) width = 30;
      if (height < 30) height = 30;
      if (x < 0) x = 0;
      if (y < 0) y = 0;
      if (x + width > clientWidth) width = clientWidth - x;
      if (y + height > clientHeight) height = clientHeight - y;

      return { x, y, width, height };
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setDragType(null);
  };

  const handleReset = () => {
    if (imageRef.current) {
      const { clientWidth, clientHeight } = imageRef.current;
      setCrop({
        x: clientWidth * 0.1,
        y: clientHeight * 0.1,
        width: clientWidth * 0.8,
        height: clientHeight * 0.8
      });
    }
  };

  const handleExtract = () => {
    if (!imageRef.current) return;
    
    const img = imageRef.current;
    
    // Calculate scale between rendered image and natural image
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;

    const canvas = document.createElement('canvas');
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(
      img,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );
    
    onExtract(canvas.toDataURL('image/jpeg', 0.9));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center animate-in fade-in duration-200">
      <div className="relative flex flex-col max-w-5xl w-full h-full p-4">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="text-white space-y-1">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Crop className="w-5 h-5 text-purple-400" />
              Extract Code
            </h2>
            <p className="text-sm text-zinc-400">Select the code you want to extract.</p>
          </div>
          <button onClick={onCancel} className="p-2 rounded-full hover:bg-white/10 text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="relative flex-1 min-h-0 bg-[#18181b] rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center p-4">
          <div 
            ref={containerRef}
            className="relative"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <img 
              ref={imageRef} 
              src={imageUrl} 
              alt="Crop target" 
              className="max-w-full max-h-[70vh] object-contain select-none"
              draggable={false}
              onLoad={handleReset}
            />
            
            {/* Crop Overlay */}
            <div className="absolute inset-0 bg-black/50 pointer-events-none" />
            
            <div 
              className="absolute border-2 border-purple-500 bg-white/10 touch-none"
              style={{
                left: crop.x,
                top: crop.y,
                width: crop.width,
                height: crop.height,
              }}
              onPointerDown={(e) => handlePointerDown(e, 'move')}
            >
              {/* Handles */}
              <div 
                className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-purple-500 rounded-full cursor-nwse-resize"
                onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'resize-nw'); }}
              />
              <div 
                className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-purple-500 rounded-full cursor-nesw-resize"
                onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'resize-ne'); }}
              />
              <div 
                className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-purple-500 rounded-full cursor-nesw-resize"
                onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'resize-sw'); }}
              />
              <div 
                className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-purple-500 rounded-full cursor-nwse-resize"
                onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'resize-se'); }}
              />
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-end gap-3 shrink-0">
          <button 
            type="button" 
            onClick={handleReset}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button 
            type="button" 
            onClick={handleExtract}
            className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Extract Code
          </button>
        </div>
      </div>
    </div>
  );
};
