import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useMessaging } from '../context/MessagingContext';
import { User, MapPin, Shield, Star, DollarSign, Clock, CheckCircle, Briefcase, Languages, ChevronLeft, MessageSquare } from 'lucide-react';

export default function PublicProProfile() {
    const { id } = useParams();
    const { user } = useAuth();
    const { getOrCreateConversation } = useMessaging();
    const navigate = useNavigate();
    const [proData, setProData] = useState(null);
    const [details, setDetails] = useState(null);
    const [portfolio, setPortfolio] = useState([]);
    const [loading, setLoading] = useState(true);
    const [qualifyingRequestId, setQualifyingRequestId] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(true);

    useEffect(() => {
        fetchProfileData();
        fetchReviews();
    }, [id]);

    const fetchReviews = async () => {
        setReviewsLoading(true);
        try {
            // Reviews are public (RLS allows select using true)
            const { data, error } = await supabase
                .from('reviews')
                .select('id, rating, comment, created_at, reviewer_id')
                .eq('pro_id', id)
                .order('created_at', { ascending: false });
            if (error) throw error;

            // Fetch reviewer names separately (profiles is also public-readable)
            const reviewsList = data || [];
            if (reviewsList.length > 0) {
                const reviewerIds = [...new Set(reviewsList.map(r => r.reviewer_id).filter(Boolean))];
                const { data: reviewers } = await supabase
                    .from('profiles')
                    .select('id, name')
                    .in('id', reviewerIds);
                const namesById = {};
                (reviewers || []).forEach(p => { namesById[p.id] = p.name; });
                setReviews(reviewsList.map(r => ({
                    ...r,
                    reviewer_name: namesById[r.reviewer_id] || 'Homeowner',
                })));
            } else {
                setReviews([]);
            }
        } catch (err) {
            console.error('Error fetching reviews:', err);
            setReviews([]);
        } finally {
            setReviewsLoading(false);
        }
    };

    // Check if viewer is a homeowner with an active bid from this pro
    useEffect(() => {
        if (!user || user.type !== 'homeowner' || !id) return;
        async function checkQualifyingBid() {
            const { data, error } = await supabase
                .from('bids')
                .select('request_id')
                .eq('pro_id', id)
                .in('status', ['pending', 'accepted'])
                .order('created_at', { ascending: false })
                .limit(1);
            if (error || !data || data.length === 0) return;
            // Verify the request belongs to this homeowner
            const { data: req, error: reqErr } = await supabase
                .from('service_requests')
                .select('id')
                .eq('id', data[0].request_id)
                .eq('user_id', user.id)
                .maybeSingle();
            if (!reqErr && req) {
                setQualifyingRequestId(req.id);
            }
        }
        checkQualifyingBid();
    }, [user, id]);

    const fetchProfileData = async () => {
        setLoading(true);
        try {
            // Fetch basic profile info
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, name, avatar, vetting_status, is_available, is_premium, city, state')
                .eq('id', id)
                .single();
            
            if (profileError) throw profileError;
            setProData(profile);

            // Fetch comprehensive onboarding details
            const { data: proDetails, error: detailsError } = await supabase
                .from('professional_details')
                .select('onboarding_data, status')
                .eq('pro_id', id)
                .single();
            
            if (!detailsError && proDetails) {
                setDetails(proDetails.onboarding_data);
            }

            // Fetch portfolio images
            const { data: portfolioItems, error: portfolioError } = await supabase
                .from('portfolios')
                .select('*')
                .eq('pro_id', id)
                .order('created_at', { ascending: false });
            
            if (!portfolioError && portfolioItems) {
                setPortfolio(portfolioItems);
            }

        } catch (err) {
            console.error("Error fetching pro profile:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="container" style={{ padding: '3rem', textAlign: 'center' }}>Loading professional profile...</div>;
    }

    if (!proData) {
        return <div className="container" style={{ padding: '3rem', textAlign: 'center' }}>Professional not found.</div>;
    }

    const d = details || {};
    const displayName = d.businessName || proData.name || 'Unknown Professional';
    const tradeTitle = d.tradeTitle || 'Professional Tradesman';
    const bio = d.bio || 'This professional has not added a bio yet.';
    const languages = d.languages && d.languages.length > 0 ? d.languages.join(', ') : 'English';
    const services = d.servicesOffered || [];

    return (
        <div className="container" style={{ padding: '2rem 1rem', paddingBottom: '5rem', maxWidth: '900px' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <Link to="/professionals" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary-light)', textDecoration: 'none' }}>
                    <ChevronLeft size={20} /> Back to Directory
                </Link>
            </div>

            {/* Header Section */}
            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                {proData.is_premium && (
                    <div style={{ position: 'absolute', top: '0', right: '0', background: 'var(--color-primary)', color: 'white', padding: '0.5rem 1.5rem', borderBottomLeftRadius: '16px', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Star size={16} fill="white" /> Featured Pro
                    </div>
                )}
                
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '3px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                        {d.profilePhoto || proData.avatar ? (
                            <img src={d.profilePhoto || proData.avatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <User size={48} color="var(--color-primary-light)" />
                        )}
                    </div>
                    
                    <div>
                        <h1 style={{ fontSize: '2rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {displayName}
                            {proData.vetting_status === 'approved' && (
                                <Shield size={20} color="#4ade80" fill="rgba(74, 222, 128, 0.2)" title="Verified Background Check" />
                            )}
                        </h1>
                        <div style={{ fontSize: '1.1rem', color: 'var(--color-primary-light)', marginBottom: '0.5rem', fontWeight: '500' }}>
                            {tradeTitle} {d.yearsExperience && `• ${d.yearsExperience} yrs exp.`}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.95rem', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <MapPin size={16} /> {d.primaryCity || proData.city || 'Local Area'}, {d.stateRegion ? d.stateRegion.split(' ')[0] : (proData.state || 'US')}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: proData.is_available !== false ? '#4ade80' : '#ef4444' }}>
                                <CheckCircle size={16} /> {proData.is_available !== false ? 'Accepting new jobs' : 'Currently busy'}
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <Link to="/request-repair" className="btn btn-primary" style={{ padding: '0.8rem 2rem', fontSize: '1.1rem' }}>
                        Request Service
                    </Link>
                    {qualifyingRequestId && (
                        <button
                            onClick={async () => {
                                try {
                                    const conv = await getOrCreateConversation({
                                        requestId: qualifyingRequestId,
                                        homeownerId: user.id,
                                        proId: id,
                                    });
                                    navigate(`/messages?conversation=${conv.id}`);
                                } catch (err) {
                                    console.error('[PublicProProfile] message error:', err);
                                    alert('Could not open conversation.');
                                }
                            }}
                            style={{
                                padding: '0.8rem 2rem', fontSize: '1.1rem',
                                background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)',
                                color: '#60a5fa', borderRadius: '8px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                            }}
                        >
                            <MessageSquare size={18} /> Message this Pro
                        </button>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
                
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* About Section */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={20} color="var(--color-primary-light)" /> About
                        </h3>
                        <p style={{ lineHeight: '1.6', color: 'var(--text-main)' }}>{bio}</p>
                        
                        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                                <Briefcase size={16} /> <span style={{ color: 'white' }}>Business Type:</span> {d.businessType || 'Independent Contractor'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                                <Languages size={16} /> <span style={{ color: 'white' }}>Languages:</span> {languages}
                            </div>
                            {d.isBonded && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4ade80' }}>
                                    <Shield size={16} /> Bonded Professional
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pricing Section */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <DollarSign size={20} color="var(--color-primary-light)" /> Pricing & Payment
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Hourly Rate</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>{d.hourlyRate ? `$${d.hourlyRate}/hr` : 'Contact for rate'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Service Call Fee</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>{d.serviceCallFee ? `$${d.serviceCallFee}` : 'None'}</div>
                            </div>
                        </div>

                        {d.freeEstimates && (
                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Estimates</div>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.95rem' }}>
                                    {d.freeEstimates}
                                </div>
                            </div>
                        )}

                        {d.paymentMethods && d.paymentMethods.length > 0 && (
                            <div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Accepted Payments</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {d.paymentMethods.map(method => (
                                        <span key={method} style={{ background: 'rgba(255,255,255,0.1)', padding: '0.3rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem' }}>
                                            {method}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Services Section */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Briefcase size={20} color="var(--color-primary-light)" /> Services Provided
                        </h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {d.primaryTrade && (
                                <span style={{ background: 'var(--color-primary)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                    ★ {d.primaryTrade}
                                </span>
                            )}
                            {services.filter(s => s !== d.primaryTrade).map(service => (
                                <span key={service} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.9rem' }}>
                                    {service}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Availability Section */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={20} color="var(--color-primary-light)" /> Availability
                        </h3>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Typical Hours</div>
                                <div style={{ fontSize: '1rem', fontWeight: '500' }}>{d.startTime || '8:00 AM'} - {d.endTime || '6:00 PM'}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Days</div>
                                <div style={{ fontSize: '1rem', fontWeight: '500' }}>{d.daysAvailable && d.daysAvailable.length > 0 ? d.daysAvailable.join(', ') : 'Mon - Fri'}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {d.emergencyService && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24', fontSize: '0.9rem', background: 'rgba(251, 191, 36, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                                    <Clock size={16} /> 24/7 Emergency Service Available
                                </div>
                            )}
                            {d.sameDayBookings && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4ade80', fontSize: '0.9rem', background: 'rgba(74, 222, 128, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                                    <CheckCircle size={16} /> Accepts Same-Day Bookings
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Reviews Section */}
            <div style={{ marginTop: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Star size={22} color="#fbbf24" /> Customer Reviews
                    {reviews.length > 0 && (
                        <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                            ({reviews.length})
                        </span>
                    )}
                </h2>
                {reviewsLoading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading reviews…</p>
                ) : reviews.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '1.5rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        No reviews yet. Be the first to share your experience.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {reviews.map(rev => (
                            <div key={rev.id} className="glass-panel" style={{ padding: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                                    <div>
                                        <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>{rev.reviewer_name}</strong>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                            {new Date(rev.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.15rem' }}>
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <Star key={s} size={16}
                                                fill={s <= rev.rating ? '#fbbf24' : 'none'}
                                                color={s <= rev.rating ? '#fbbf24' : '#4b5563'}
                                            />
                                        ))}
                                    </div>
                                </div>
                                {rev.comment && (
                                    <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                                        {rev.comment}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Portfolio Section */}
            {portfolio.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Past Projects & Portfolio
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {portfolio.map(item => (
                            <div key={item.id} className="glass-panel" style={{ overflow: 'hidden' }}>
                                <div style={{ display: 'flex', height: '180px' }}>
                                    <div style={{ flex: 1, borderRight: '2px solid rgba(0,0,0,0.5)', position: 'relative' }}>
                                        <img src={item.before_image} alt="Before" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>Before</span>
                                    </div>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <img src={item.after_image} alt="After" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <span style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(34,197,94,0.7)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>After</span>
                                    </div>
                                </div>
                                <div style={{ padding: '1rem' }}>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.5' }}>{item.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
