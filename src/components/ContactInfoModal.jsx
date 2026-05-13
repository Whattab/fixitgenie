import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import { X, Phone, Mail, MapPin, User } from 'lucide-react';

/**
 * InfoRow — module-level so ESLint correctly resolves the JSX tag name.
 * Renders one labelled row with an icon.
 */
/**
 * InfoRow — module-level so ESLint correctly resolves the JSX tag name.
 * Renders one labelled row with an icon.
 */
function InfoRow({ icon, label, value }) {
  if (!value) return null;
  const Ic = icon; // alias to uppercase so JSX can use it as a component
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.9rem' }}>
      <Ic size={16} style={{ marginTop: '0.15rem', flexShrink: 0, color: 'var(--color-primary-light)' }} />
      <div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '0.97rem', color: 'var(--text-main)', fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  );
}

/**
 * ContactInfoModal
 *
 * Props:
 *   isOpen       {boolean}
 *   onClose      {Function}
 *   mode         {'homeowner'|'pro'}
 *               'homeowner' — viewer is the pro; fetches request_contact_info
 *               'pro'       — viewer is the homeowner; fetches from profiles
 *   requestId    {number}    — needed for homeowner mode
 *   proId        {string}    — needed for pro mode
 */
export default function ContactInfoModal({ isOpen, onClose, mode, requestId, proId }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setInfo(null);
    setErr(null);
    setLoading(true);

    async function fetchInfo() {
      try {
        if (mode === 'homeowner') {
          // Pro is viewing the homeowner's contact info from request_contact_info
          const { data, error } = await supabase
            .from('request_contact_info')
            .select('contact_name, contact_email, contact_phone, exact_address')
            .eq('request_id', requestId)
            .maybeSingle();

          if (error) throw error;
          if (!data) {
            setErr('Contact info has not been filled in yet for this request.');
          } else {
            setInfo(data);
          }
        } else {
          // Homeowner is viewing the pro's contact info from profiles
          const { data, error } = await supabase
            .from('profiles')
            .select('name, email, phone, city, state')
            .eq('id', proId)
            .maybeSingle();

          if (error) throw error;
          if (!data) {
            setErr("Could not retrieve the professional's profile.");
          } else {
            setInfo(data);
          }
        }
      } catch (e) {
        console.error('[ContactInfoModal] fetch error:', e);
        setErr(e.message || 'Failed to load contact info.');
      } finally {
        setLoading(false);
      }
    }

    fetchInfo();
  }, [isOpen, mode, requestId, proId]);

  // Esc key + body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function handleKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const title = mode === 'homeowner' ? 'Homeowner Contact Info' : 'Pro Contact Info';

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel"
        style={{
          width: '90%', maxWidth: '420px',
          padding: '1.75rem', position: 'relative',
          borderRadius: '16px',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'none', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>{title}</h3>

        {loading && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading…</p>
        )}

        {err && (
          <p style={{ color: '#f87171', fontSize: '0.9rem' }}>{err}</p>
        )}

        {info && !loading && (
          <>
            {mode === 'homeowner' ? (
              <>
                <InfoRow icon={User} label="Name" value={info.contact_name} />
                <InfoRow icon={Mail} label="Email" value={info.contact_email} />
                <InfoRow icon={Phone} label="Phone" value={info.contact_phone} />
                <InfoRow icon={MapPin} label="Address" value={info.exact_address} />
              </>
            ) : (
              <>
                <InfoRow icon={User} label="Name" value={info.name} />
                <InfoRow icon={Mail} label="Email" value={info.email} />
                <InfoRow icon={Phone} label="Phone" value={info.phone} />
                <InfoRow
                  icon={MapPin}
                  label="Location"
                  value={[info.city, info.state].filter(Boolean).join(', ')}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
