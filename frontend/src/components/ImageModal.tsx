import React from 'react';

interface ImageModalProps {
  previewUrl: string;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ previewUrl, onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-zoom-out"
      onClick={onClose}
    >
      <div className="relative max-w-full max-h-full">
        <img
          src={previewUrl}
          alt="Enlarged target"
          className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-white/10"
          loading="lazy"
        />
        {/* Enlarged Modal Scan Laser Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#00ffc6]/10 via-transparent to-[#00ffc6]/15 pointer-events-none rounded-xl" />
        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#00ffc6] to-transparent shadow-[0_0_15px_#00ffc6] animate-scan-vertical pointer-events-none" />
      </div>
    </div>
  );
};
