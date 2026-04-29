import { useState } from 'react';
import { X, Send, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function BidModal({ request, onClose }) {
    const { user } = useAuth();
    const [amount, setAmount] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('bids')
                .insert([{
                    request_id: request.id,
                    pro_id: user.id,
                    pro_name: user.name || 'Professional', // Snapshot name
                    price_estimate: amount,
                    message: message,
                    status: 'pending'
                }]);

            if (error) throw error;

            alert('Bid submitted successfully! The homeowner has been notified.');
            onClose();
        } catch (error) {
            console.error('Error submitting bid:', error);
            alert('Failed to submit bid: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Place a Bid</h2>
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Responding to:</h4>
                    <p style={{ fontWeight: '600' }}>{request.details}</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                            Estimated Price / Rate
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <DollarSign size={18} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                required
                                placeholder="e.g. $150 or $50/hr"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.8rem 0.8rem 0.8rem 2.5rem',
                                    borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)', color: 'white'
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                            Message to Homeowner
                        </label>
                        <textarea
                            required
                            rows="4"
                            placeholder="Introduce yourself, ask questions, or explain your estimate..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            style={{
                                width: '100%', padding: '0.8rem',
                                borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                                fontFamily: 'inherit'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ padding: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        {loading ? 'Sending...' : <><Send size={18} /> Send Bid</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
