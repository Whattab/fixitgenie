import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Search, User, Shield, Star, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Professionals() {
    const [pros, setPros] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // Portfolio Modal State
    const [selectedProId, setSelectedProId] = useState(null);
    const [portfolioItems, setPortfolioItems] = useState([]);
    const [loadingPortfolio, setLoadingPortfolio] = useState(false);

    const openPortfolio = async (proId) => {
        setSelectedProId(proId);
        setLoadingPortfolio(true);
        try {
            const { data, error } = await supabase
                .from('portfolios')
                .select('*')
                .eq('pro_id', proId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setPortfolioItems(data || []);
        } catch (err) {
            console.error('Error fetching portfolio:', err);
        } finally {
            setLoadingPortfolio(false);
        }
    };

    useEffect(() => {
        fetchPros();
    }, []);

    const fetchPros = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, type, city, state, zipcode, avatar, vetting_status, is_available, is_premium, reviews!reviews_pro_id_fkey(rating)')
                .eq('type', 'professional');

            if (error) {
                console.error("Error fetching professionals:", error);
                return;
            }

            const processedPros = data.map(pro => {
                const reviews = pro.reviews || [];
                const avgRating = reviews.length > 0
                    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
                    : 0;
                
                return {
                    ...pro,
                    avgRating: avgRating.toFixed(1),
                    reviewCount: reviews.length
                };
            });

            // Sort by rating internally if desired, or alphabetically
            setPros(processedPros.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (err) {
            console.error("Unexpected error:", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredPros = pros.filter(pro => 
        pro.name && pro.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container" style={{ padding: '2rem 1rem', paddingBottom: '5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Find a <span style={{ color: 'var(--color-primary-light)' }}>Professional</span></h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
                    Search our directory of verified and trusted professionals by name to get started on your next repair project.
                </p>
                
                <div style={{ marginTop: '2rem', maxWidth: '500px', margin: '2rem auto 0 auto', position: 'relative' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem' }} />
                        <input
                            type="text"
                            placeholder="Search professional by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '1rem 1rem 1rem 3rem',
                                borderRadius: '30px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'white',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'border-color 0.3s, background 0.3s'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--color-primary-light)';
                                e.target.style.background = 'rgba(255,255,255,0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                                e.target.style.background = 'rgba(255,255,255,0.05)';
                            }}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading professionals...</div>
            ) : filteredPros.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', maxWidth: '600px', margin: '0 auto' }}>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1rem' }}>No professionals found matching "{searchTerm}"</p>
                    <button onClick={() => setSearchTerm('')} className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                        Clear Search
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
                    {filteredPros.map(pro => (
                        <div key={pro.id} className="glass-panel" style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', transition: 'transform 0.2s', cursor: 'default' }}
                             onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                             onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
                        >
                            <div style={{ position: 'relative' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--color-primary-dark)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)' }}>
                                    {pro.avatar ? (
                                        <img src={pro.avatar} alt={pro.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <User size={36} color="var(--color-primary-light)" />
                                    )}
                                </div>
                                <div style={{
                                    position: 'absolute', bottom: '16px', right: '4px', width: '18px', height: '18px',
                                    backgroundColor: pro.is_available !== false ? '#22c55e' : '#ef4444',
                                    borderRadius: '50%', border: '3px solid #1a1a2e',
                                    boxShadow: pro.is_available !== false ? '0 0 10px rgba(34, 197, 94, 0.6)' : 'none'
                                }} title={pro.is_available !== false ? 'Available Now' : 'Currently Busy'} />
                            </div>
                            
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                                {pro.name}
                                {pro.vetting_status === 'approved' && (
                                    <Shield size={16} color="#4ade80" fill="rgba(74, 222, 128, 0.2)" title="Verified Professional" />
                                )}
                                {pro.is_premium && (
                                    <Star size={18} color="#fbbf24" fill="#fbbf24" title="Premium Gold Professional" style={{ marginLeft: '4px' }} />
                                )}
                            </h3>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                                <Star size={16} fill={pro.avgRating > 0 ? "#fbbf24" : "none"} />
                                <span style={{ fontWeight: 'bold' }}>{pro.avgRating}</span>
                                <span style={{ color: 'var(--text-muted)' }}>({pro.reviewCount} reviews)</span>
                            </div>

                            {(pro.city || pro.state || pro.zipcode) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                    <MapPin size={14} />
                                    <span>{[pro.city, pro.state, pro.zipcode].filter(Boolean).join(', ')}</span>
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginTop: 'auto' }}>
                                <Link to={`/professional/${pro.id}`} className="btn" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '0.6rem', justifyContent: 'center', textDecoration: 'none' }}>
                                    View Full Profile
                                </Link>
                                <Link to={`/request-repair?pro_id=${pro.id}`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.6rem', textDecoration: 'none' }}>
                                    Request Service
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Portfolio Modal Overlay */}
            {selectedProId && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
                    zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
                        <button onClick={() => setSelectedProId(null)} style={{ position: 'absolute', top: '1rem', right: '1.5rem', background: 'none', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer', zIndex: 2 }}>&times;</button>
                        <h2 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Star size={24} color="var(--color-primary-light)" /> 
                            Professional Portfolio
                        </h2>
                        
                        {loadingPortfolio ? <p style={{ color: 'var(--text-muted)' }}>Loading gallery...</p> : portfolioItems.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>This professional has not uploaded any past projects yet.</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {portfolioItems.map(item => (
                                    <div key={item.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'row', height: '250px' }}>
                                            <div style={{ flex: 1, borderRight: '2px solid rgba(0,0,0,0.5)', position: 'relative' }}>
                                                <img src={item.before_image} alt="Before" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <span style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.7)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.2)' }}>BEFORE</span>
                                            </div>
                                            <div style={{ flex: 1, position: 'relative' }}>
                                                <img src={item.after_image} alt="After" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(34,197,94,0.7)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.2)' }}>AFTER</span>
                                            </div>
                                        </div>
                                        <div style={{ padding: '1.5rem' }}>
                                            <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: 'var(--text-main)' }}>{item.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
