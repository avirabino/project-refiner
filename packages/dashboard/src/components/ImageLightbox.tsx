import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface LightboxImage {
  src: string;
  alt: string;
  caption?: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  initialIndex: number;
  onClose: () => void;
}

export function ImageLightbox({ images, initialIndex, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const count = images.length;
  const image = images[currentIndex];

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + count) % count);
  }, [count]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % count);
  }, [count]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          goPrev();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          goNext();
          break;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goPrev, goNext]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!image) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Close button */}
      <button
        className="absolute top-4 right-4 z-10 bg-white/15 hover:bg-white/30 rounded-full p-2 transition-colors"
        onClick={onClose}
        aria-label="Close lightbox"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Previous button */}
      {count > 1 && (
        <button
          className="absolute left-4 z-10 bg-white/15 hover:bg-white/30 rounded-full p-3 transition-colors"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          aria-label="Previous image"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Next button */}
      {count > 1 && (
        <button
          className="absolute right-4 z-10 bg-white/15 hover:bg-white/30 rounded-full p-3 transition-colors"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          aria-label="Next image"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Image + caption + counter */}
      <div className="relative z-10 flex flex-col items-center w-[90vw] max-h-[90vh]">
        <img
          src={image.src}
          alt={image.alt}
          className="w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Caption bar */}
        {image.caption && (
          <div className="mt-3 px-4 py-1.5 bg-black/50 rounded-full">
            <span className="text-xs text-white/90">{image.caption}</span>
          </div>
        )}

        {/* Counter */}
        {count > 1 && (
          <div className="mt-2 text-sm text-white/60">
            {currentIndex + 1} / {count}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
