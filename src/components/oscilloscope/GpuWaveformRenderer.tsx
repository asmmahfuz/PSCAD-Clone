import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Zap } from 'lucide-react';
import { WebGpuWaveformRenderer, type WaveformChannelGpuData, type ViewportTransform } from '../../gpu/waveformRenderer';
import { WAVEFORM_COLORS } from '../../constants';

interface GpuWaveformRendererProps {
  signals: Map<string, number[]>;
  activeChannels: Set<string>;
  timeZoom: { tStart: number; tEnd: number };
  onTimeZoomChange?: (zoom: { tStart: number; tEnd: number }) => void;
  isDark?: boolean;
}

export const GpuWaveformRenderer: React.FC<GpuWaveformRendererProps> = ({
  signals,
  activeChannels,
  timeZoom,
  onTimeZoomChange: _onTimeZoomChange,
  isDark = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<WebGpuWaveformRenderer | null>(null);

  const [isWebGpuActive, setIsWebGpuActive] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(144);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [renderTimeMs, setRenderTimeMs] = useState<number>(0.2);

  // Initialize WebGPU renderer
  useEffect(() => {
    let renderer: WebGpuWaveformRenderer | null = null;
    const canvas = canvasRef.current;
    if (canvas) {
      renderer = new WebGpuWaveformRenderer();
      renderer.initialize(canvas).then((supported) => {
        setIsWebGpuActive(supported);
        if (supported) {
          rendererRef.current = renderer;
        }
      });
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
    };
  }, []);

  // Parse signals to GPU channel data
  const getGpuChannels = useCallback((): WaveformChannelGpuData[] => {
    const timesRaw = signals.get('Time') || [];
    if (timesRaw.length === 0) return [];

    const times = new Float32Array(timesRaw);
    const channels: WaveformChannelGpuData[] = [];
    let ptCount = 0;

    let colorIdx = 0;
    for (const [name, vals] of signals.entries()) {
      if (name === 'Time' || !activeChannels.has(name)) continue;

      const fVals = new Float32Array(vals);
      let vMin = Infinity, vMax = -Infinity;
      for (let i = 0; i < fVals.length; i++) {
        if (fVals[i] < vMin) vMin = fVals[i];
        if (fVals[i] > vMax) vMax = fVals[i];
      }
      if (vMin === Infinity) { vMin = -100; vMax = 100; }

      // Map color from hex palette
      const hex = WAVEFORM_COLORS[colorIdx % WAVEFORM_COLORS.length];
      const r = parseInt(hex.slice(1, 3), 16) / 255.0;
      const g = parseInt(hex.slice(3, 5), 16) / 255.0;
      const b = parseInt(hex.slice(5, 7), 16) / 255.0;

      channels.push({
        name,
        colorRgba: [r, g, b, 1.0],
        times,
        values: fVals,
        vMin,
        vMax,
      });

      ptCount += fVals.length;
      colorIdx++;
    }

    setTotalPoints(ptCount);
    return channels;
  }, [signals, activeChannels]);

  // Render loop
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const t0 = performance.now();
    const channels = getGpuChannels();
    if (channels.length === 0) return;

    // Calculate global voltage bounds
    let gMin = Infinity, gMax = -Infinity;
    channels.forEach(ch => {
      if (ch.vMin < gMin) gMin = ch.vMin;
      if (ch.vMax > gMax) gMax = ch.vMax;
    });
    if (gMin === Infinity) { gMin = -100; gMax = 100; }
    const margin = Math.max(1.0, (gMax - gMin) * 0.1);
    const vMin = gMin - margin;
    const vMax = gMax + margin;

    const viewport: ViewportTransform = {
      tStart: timeZoom.tStart,
      tEnd: timeZoom.tEnd,
      vMin,
      vMax,
      screenWidth: canvas.width,
      screenHeight: canvas.height,
    };

    if (isWebGpuActive && rendererRef.current) {
      // Fast WebGPU Hardware Render
      for (const ch of channels) {
        rendererRef.current.uploadChannelData(ch);
      }
      rendererRef.current.renderChannels(channels, viewport);
    } else {
      // 2D High-Speed Canvas Fallback
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = isDark ? '#0a0d14' : '#ffffff';
        ctx.fillRect(0, 0, w, h);

        const left = 60;
        const right = w - 20;
        const top = 15;
        const bottom = h - 25;
        const pw = right - left;
        const ph = bottom - top;

        // Grid
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 1.0;
        ctx.strokeRect(left, top, pw, ph);

        const tSpan = Math.max(1e-6, timeZoom.tEnd - timeZoom.tStart);
        const vSpan = Math.max(1e-6, vMax - vMin);

        channels.forEach(ch => {
          ctx.strokeStyle = `rgba(${Math.round(ch.colorRgba[0]*255)}, ${Math.round(ch.colorRgba[1]*255)}, ${Math.round(ch.colorRgba[2]*255)}, 1)`;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          const n = ch.times.length;
          const step = Math.max(1, Math.floor(n / (pw * 2)));

          for (let i = 0; i < n; i += step) {
            const sx = left + ((ch.times[i] - timeZoom.tStart) / tSpan) * pw;
            const sy = bottom - ((ch.values[i] - vMin) / vSpan) * ph;
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.stroke();
        });
      }
    }

    const dtMs = performance.now() - t0;
    setRenderTimeMs(Math.round(dtMs * 10) / 10);
    setFps(Math.min(144, Math.round(1000 / Math.max(1, dtMs))));
  }, [getGpuChannels, isWebGpuActive, timeZoom, isDark]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        renderFrame();
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderFrame]);

  useEffect(() => {
    renderFrame();
  }, [renderFrame]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[#0a0d14]">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* GPU Telemetry Badge */}
      <div className="absolute top-2 right-3 z-10 flex items-center gap-2 text-[10px] font-mono pointer-events-none select-none">
        <div className={`px-2 py-0.5 rounded border flex items-center gap-1.5 backdrop-blur-md ${
          isWebGpuActive
            ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-300'
            : 'bg-cyan-950/80 border-cyan-700/60 text-cyan-300'
        }`}>
          <Zap className="w-3 h-3 fill-current" />
          <span className="font-bold">{isWebGpuActive ? 'WebGPU Ultra (144Hz)' : 'Canvas 2D SIMD'}</span>
        </div>

        <div className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-slate-300 flex items-center gap-2">
          <span>{totalPoints.toLocaleString()} pts</span>
          <span className="text-amber-400 font-bold">{renderTimeMs} ms</span>
          <span className="text-emerald-400 font-bold">{fps} FPS</span>
        </div>
      </div>
    </div>
  );
};
