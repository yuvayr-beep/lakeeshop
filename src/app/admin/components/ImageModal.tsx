'use client';
import React from 'react';
import { X } from 'lucide-react';

interface ImageModalProps {
  src: string;
  onClose: () => void;
}

export default function ImageModal({ src, onClose }: ImageModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity cursor-zoom-out" 
        onClick={onClose} 
      />

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-2xl max-w-3xl max-h-[85vh] flex flex-col items-center justify-center border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-950/60 text-white hover:bg-slate-950/80 transition-colors z-10"
        >
          <X size={18} />
        </button>

        <img
          src={src}
          alt="Preview"
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />
      </div>
    </div>
  );
}
