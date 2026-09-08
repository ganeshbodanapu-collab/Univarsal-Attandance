import React, { useRef, useState, useEffect } from 'react';
import { Eraser, PenTool, CheckCircle2 } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  signeeName?: string;
  roleDescription?: string;
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  required?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  label,
  signeeName = 'Signee',
  roleDescription,
  value,
  onChange,
  required = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(Boolean(value));

  useEffect(() => {
    if (value) {
      setHasSignature(true);
    }
  }, [value]);

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e293b'; // slate-800
    setIsDrawing(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setHasSignature(false);
    onChange(null);
  };

  const handleDigitalSign = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background decorative seal line
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(15, canvas.height - 25);
    ctx.lineTo(canvas.width - 15, canvas.height - 25);
    ctx.stroke();

    // Draw stylized handwritten signature text
    ctx.font = 'italic 600 24px "Caveat", "Brush Script MT", "Segoe Script", cursive, sans-serif';
    ctx.fillStyle = '#1e3a8a'; // blue-900 ink
    ctx.textAlign = 'center';
    ctx.fillText(signeeName || 'Authorized Signatory', canvas.width / 2, canvas.height / 2 + 5);

    // Timestamp subtitle
    ctx.font = '10px "Inter", -apple-system, sans-serif';
    ctx.fillStyle = '#64748b';
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    ctx.fillText(`Digitally verified: ${dateStr}`, canvas.width / 2, canvas.height - 10);

    setHasSignature(true);
    onChange(canvas.toDataURL('image/png'));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
          {roleDescription && <span className="text-[11px] font-normal text-gray-500 ml-1.5">({roleDescription})</span>}
        </label>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleDigitalSign}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center space-x-1"
          >
            <PenTool className="h-3 w-3" />
            <span>Digital Stamp</span>
          </button>
          {hasSignature && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline inline-flex items-center space-x-0.5"
            >
              <Eraser className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      <div className="relative border-2 border-dashed border-gray-300 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors overflow-hidden">
        <canvas
          ref={canvasRef}
          width={360}
          height={100}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          className="w-full h-[100px] touch-none cursor-crosshair block"
        />

        {!hasSignature && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-gray-400">
            <PenTool className="h-5 w-5 mb-1 stroke-1" />
            <span className="text-xs">Draw signature with finger / mouse or click Digital Stamp</span>
          </div>
        )}

        {hasSignature && (
          <div className="absolute top-2 right-2 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200 flex items-center space-x-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>Signed</span>
          </div>
        )}
      </div>
    </div>
  );
};
