import React from 'react';

interface ScannerOverlayProps {
  previewUrl: string | null;
  filename: string;
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({ previewUrl, filename }) => {
  return (
    <div className="w-full space-y-6">
      {/* Main Scanner Panel */}
      <div className="w-full bg-[#11141E] rounded-3xl p-5 sm:p-8 border border-orange-500/30 shadow-2xl shadow-orange-500/5">
        {/* Scanner Header Bar */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-xs font-mono font-bold text-orange-400 uppercase tracking-wider">
              Forensic Scan In Progress
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-full border-[3px] border-orange-900 border-t-orange-500 animate-spin animate-ring-glow" />
          </div>
        </div>

        {/* Image Scanner Container */}
        {previewUrl && (
          <div className="relative w-full aspect-video max-h-[420px] rounded-2xl overflow-hidden border-2 border-orange-500/40 bg-black select-none">
            {/* The uploaded image */}
            <img
              src={previewUrl}
              alt="Scanning target"
              className="w-full h-full object-contain opacity-80"
            />

            {/* Holographic orange tint overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 via-transparent to-orange-500/15 pointer-events-none" />

            {/* Sweeping horizontal laser line */}
            <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-[0_0_20px_4px_rgba(249,115,22,0.6),0_0_60px_8px_rgba(249,115,22,0.2)] animate-scan-laser pointer-events-none" />

            {/* Blueprint grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(249,115,22,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(249,115,22,0.08)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none animate-grid-shimmer" />

            {/* Corner scanner brackets — top-left */}
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-orange-400 pointer-events-none animate-bracket-pulse" />
            {/* Corner scanner brackets — top-right */}
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-orange-400 pointer-events-none animate-bracket-pulse" style={{ animationDelay: '0.5s' }} />
            {/* Corner scanner brackets — bottom-left */}
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-orange-400 pointer-events-none animate-bracket-pulse" style={{ animationDelay: '1s' }} />
            {/* Corner scanner brackets — bottom-right */}
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-orange-400 pointer-events-none animate-bracket-pulse" style={{ animationDelay: '1.5s' }} />

            {/* Center target reticle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-10 h-10 rounded-full border border-orange-400/40" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange-400/80 animate-ping" />
              {/* Crosshair lines */}
              <div className="absolute top-1/2 left-0 w-full h-[1px] bg-orange-400/20" />
              <div className="absolute top-0 left-1/2 h-full w-[1px] bg-orange-400/20" />
            </div>

            {/* Bottom status bar overlay */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-8 pb-3 px-4 pointer-events-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold text-orange-300 uppercase tracking-widest">
                    Analyzing Pixel Matrix
                  </span>
                </div>
                <span className="text-[10px] font-mono text-gray-400">
                  {filename}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Scanning status text */}
        <div className="mt-5 text-center">
          <h3 className="text-base sm:text-lg font-bold text-white mb-1">
            Executing Multi-Model Forensic Passes...
          </h3>
        </div>
      </div>
    </div>
  );
};
