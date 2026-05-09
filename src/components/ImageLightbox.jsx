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

  function handleDownload() {
    const a = document.createElement('a');
    a.href = src;
    // Extract a filename from the URL or fall back to a generic name
    const parts = src.split('/');
    const filename = parts[parts.length - 1].split('?')[0] || 'image.jpg';
    a.download = filename;
    a.rel = 'noopener noreferrer';
    // For cross-origin signed URLs the browser may still open in a new tab;
    // this is the best we can do without a server-side proxy.
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
