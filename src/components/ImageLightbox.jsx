import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download } from 'lucide-react';

/**
 * ImageLightbox
 *
 * Props:
 *   src      {string}   — signed URL of the full-res image
 *   alt      {string}   — alt text
 *   onClose  {Function} — called when the user dismisses the lightbox
 */
export default function ImageLightbox({ src, alt, onClose }) {
  // Esc key listener + body-scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  async function handleDownload() {
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Try to get a sensible filename
      const parts = src.split('/');
      let filename = parts[parts.length - 1].split('?')[0] || 'image.jpg';
      if (!/\.(jpg|jpeg|png|heic|webp|gif)$/i.test(filename)) {
        filename += '.jpg';
      }

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Free the blob URL after the browser has started the download
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error('[ImageLightbox] download failed:', err);
      alert('Could not download the image. Please try again.');
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      onClick={onClose}   // click backdrop → close
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Control bar — top-right */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', top: '1rem', right: '1rem',
          display: 'flex', gap: '0.5rem',
        }}
      >
        {/* Download */}
        <button
          onClick={handleDownload}
          title="Download image"
          style={{
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px', width: '40px', height: '40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
        >
          <Download size={18} />
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          title="Close (Esc)"
          style={{
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px', width: '40px', height: '40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.45)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
        >
          <X size={18} />
        </button>
      </div>

      {/* The photo — stop click from bubbling to backdrop */}
      <img
        src={src}
        alt={alt || 'Attachment'}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw', maxHeight: '90vh',
          objectFit: 'contain',
          borderRadius: '10px',
          boxShadow: '0 8px 48px rgba(0,0,0,0.7)',
          userSelect: 'none',
        }}
      />
    </div>,
    document.body,
  );
}
