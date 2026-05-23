import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMessaging } from '../context/MessagingContext';
import { supabase } from '../lib/supabaseClient';
import { Clock, MapPin, DollarSign, User, CheckCircle, Smartphone, Mail, AlertCircle, Star, Zap, MessageSquare, ArrowUpRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function ProDashboard() {
    const { user } = useAuth();
    const { getOrCreateConversation } = useMessaging();
    const navigate = useNavigate();
    const [myBids, setMyBids] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [editingBid, setEditingBid] = useState(null);
    const [editForm, setEditForm] = useState({ price: '', message: '' });
    
    // Portfolio State
    const [activeTab, setActiveTab] = useState('bids');
    const [portfolioItems, setPortfolioItems] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [newPortfolio, setNewPortfolio] = useState({
        before_image: '',
        after_image: '',
        description: ''
    });

    // Reviews State
    const [reviewsReceived, setReviewsReceived] = useState([]);
    const [newReviewsCount, setNewReviewsCount] = useState(0);

    // Availability and Location state
    const [isAvailable, setIsAvailable] = useState(true);
    const [activeZipcode, setActiveZipcode] = useState('');
    const [isSavingZip, setIsSavingZip] = useState(false);
    const [isPremium, setIsPremium] = useState(false);
    const [smsNotifications, setSmsNotifications] = useState(false);

    useEffect(() => {
        if (user) {
            fetchProfileSettings();
            
            // Set up a real-time listener for profile updates (like Stripe Webhook upgrades)
            const profileSubscription = supabase
                .channel('custom-profile-channel')
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
                    (payload) => {
                        console.log('Profile realtime update received:', payload);
                        if (payload.new) {
                            setIsPremium(payload.new.is_premium || false);
                            setIsAvailable(payload.new.is_available !== false);
                            setActiveZipcode(payload.new.active_zipcode || '');
                            setSmsNotifications(payload.new.sms_notifications || false);
                        }
                    }
                )
                .subscribe();

            if (activeTab === 'bids') {
                fetchMyBids();
            } else if (activeTab === 'portfolio') {
                fetchPortfolio();
            } else if (activeTab === 'reviews') {
                fetchReviewsReceived();
            }

            // Always fetch reviews count (small query, drives the tab badge)
            fetchReviewsCount();

            return () => {
                supabase.removeChannel(profileSubscription);
            };
        }
    }, [user, activeTab]);

    const fetchReviewsReceived = async () => {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select('id, rating, comment, created_at, reviewer_id, request_id')
                .eq('pro_id', user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;

            const list = data || [];
            if (list.length > 0) {
                const reviewerIds = [...new Set(list.map(r => r.reviewer_id).filter(Boolean))];
                const { data: reviewers } = await supabase
                    .from('profiles')
                    .select('id, name')
                    .in('id', reviewerIds);
                const namesById = {};
                (reviewers || []).forEach(p => { namesById[p.id] = p.name; });
                setReviewsReceived(list.map(r => ({
                    ...r,
                    reviewer_name: namesById[r.reviewer_id] || 'Homeowner',
                })));
            } else {
                setReviewsReceived([]);
            }
        } catch (err) {
            console.error('Error fetching reviews received:', err);
            setReviewsReceived([]);
        }
    };

    const fetchReviewsCount = async () => {
        try {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const { count, error } = await supabase
                .from('reviews')
                .select('id', { count: 'exact', head: true })
                .eq('pro_id', user.id)
                .gte('created_at', sevenDaysAgo);
            if (!error) setNewReviewsCount(count ?? 0);
        } catch (err) {
            console.error('Error counting new reviews:', err);
        }
    };

    const fetchProfileSettings = async () => {
        try {
            const { data, error } = await supabase.from('profiles').select('is_available, active_zipcode, is_premium, sms_notifications').eq('id', user.id).single();
            if (data && !error) {
                setIsPremium(data.is_premium || false);
                setIsAvailable(data.is_available !== false); // Default to true if null
                setActiveZipcode(data.active_zipcode || '');
                setSmsNotifications(data.sms_notifications || false);
            }
        } catch(e) {
            console.error("Failed to check availability", e);
        }
    };

    const toggleAvailability = async () => {
        const newState = !isAvailable;
        setIsAvailable(newState);
        try {
            const { error } = await supabase.from('profiles').update({ is_available: newState }).eq('id', user.id);
            if (error) throw error;
        } catch (error) {
            console.error("Failed to update availability", error);
            setIsAvailable(!newState); // revert if failed
            alert("Failed to update status. Please try again.");
        }
    };

    const toggleSmsNotifications = async () => {
        const newState = !smsNotifications;
        setSmsNotifications(newState);
        try {
            const { error } = await supabase.from('profiles').update({ sms_notifications: newState }).eq('id', user.id);
            if (error) throw error;
        } catch (error) {
            console.error("Failed to update SMS settings", error);
            setSmsNotifications(!newState); // revert if failed
            alert("Failed to update SMS settings. Please try again.");
        }
    };

    const handleSaveZipcode = async () => {
        setIsSavingZip(true);
        try {
            const { error } = await supabase.from('profiles').update({ active_zipcode: activeZipcode }).eq('id', user.id);
            if (error) throw error;
            alert('Work area zipcode saved successfully!');
        } catch(e) {
            console.error("Failed to save zipcode", e);
            alert('Failed to save zipcode.');
        } finally {
            setIsSavingZip(false);
        }
    };

    const fetchMyBids = async () => {
        try {
            setLoading(true);
            setFetchError(null);

            // 1. Fetch my bids
            const { data: bids, error: bidError } = await supabase
                .from('bids')
                .select(`
                    *,
                    request:service_requests (
                        id,
                        details,
                        category,
                        urgency,
                        city_state,
                        created_at,
                        status,
                        user_id
                    )
                `)
                .eq('pro_id', user.id)
                .order('created_at', { ascending: false });

            if (bidError) throw bidError;

            // 2. For accepted bids, fetch the private contact info
            const bidsWithContact = await Promise.all(bids.map(async (bid) => {
                let contactInfo = null;
                if (bid.status === 'accepted') {
                    const { data: info, error: infoError } = await supabase
                        .from('request_contact_info')
                        .select('contact_name, contact_email, contact_phone, exact_address')
                        .eq('request_id', bid.request_id)
                        .single();

                    if (!infoError) {
                        contactInfo = info;
                    }
                }
                return { ...bid, contactInfo };
            }));

            setMyBids(bidsWithContact);

        } catch (error) {
            console.error("Error fetching my bids:", error);
            setFetchError(error.message || JSON.stringify(error));
        } finally {
            setLoading(false);
        }
    };

    const fetchPortfolio = async () => {
        try {
            const { data, error } = await supabase
                .from('portfolios')
                .select('*')
                .eq('pro_id', user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setPortfolioItems(data || []);
        } catch (err) {
            console.error("Error fetching portfolio:", err);
        }
    };

    const handleImageUpload = (e, targetField) => {
        const file = e.target.files[0];
        if (file) {
            // Check file size (limit to ~2MB to prevent base64 payload issues)
            if (file.size > 2 * 1024 * 1024) {
                alert("File is too large. Please select an image under 2MB.");
                e.target.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewPortfolio(prev => ({ ...prev, [targetField]: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const submitPortfolio = async (e) => {
        e.preventDefault();
        if (!newPortfolio.before_image || !newPortfolio.after_image) {
            alert("Please upload both before and after images.");
            return;
        }
        
        try {
            setIsUploading(true);
            const { error } = await supabase
                .from('portfolios')
                .insert({
                    pro_id: user.id,
                    before_image: newPortfolio.before_image,
                    after_image: newPortfolio.after_image,
                    description: newPortfolio.description
                });
                
            if (error) throw error;
            
            alert("Portfolio item added successfully!");
            setNewPortfolio({ before_image: '', after_image: '', description: '' });
            // reset file inputs
            document.getElementById('beforeImage').value = '';
            document.getElementById('afterImage').value = '';
            fetchPortfolio();
        } catch (err) {
            console.error(err);
            alert("Failed to add portfolio item. Ensure you ran the SQL setup script!");
        } finally {
            setIsUploading(false);
        }
    };

    const deletePortfolioItem = async (id) => {
        if(!confirm("Delete this portfolio item?")) return;
        try {
            await supabase.from('portfolios').delete().eq('id', id);
            setPortfolioItems(prev => prev.filter(item => item.id !== id));
        } catch(err) {
            console.error(err);
        }
    };

    const handleDeleteBid = async (bidId) => {
        if (!confirm("Are you sure you want to delete this bid?")) return;

        try {
            const { error } = await supabase
                .from('bids')
                .delete()
                .eq('id', bidId);

            if (error) throw error;

            setMyBids(prev => prev.filter(b => b.id !== bidId));
        } catch (error) {
            console.error("Error deleting bid:", error);
            alert("Failed to delete bid: " + error.message);
        }
    };

    const startEditing = (bid) => {
        setEditingBid(bid.id);
        setEditForm({ price: bid.price_estimate, message: bid.message });
    };

    const cancelEditing = () => {
        setEditingBid(null);
        setEditForm({ price: '', message: '' });
    };

    const handleMessageHomeowner = async (bid) => {
        if (!bid.request?.id) return;
        try {
            const conv = await getOrCreateConversation({
                requestId: bid.request.id,
                homeownerId: bid.request.user_id ?? bid.homeowner_id,
                proId: user.id,
            });
            navigate(`/messages?conversation=${conv.id}`);
        } catch (err) {
            console.error('[ProDashboard] handleMessageHomeowner error:', err);
            alert('Could not open conversation. Please try again.');
        }
    };

    const saveEditing = async (bidId) => {
        try {
            const { error } = await supabase
                .from('bids')
                .update({
                    price_estimate: editForm.price,
                    message: editForm.message
                })
                .eq('id', bidId);

            if (error) throw error;

            // Update local state
            setMyBids(prev => prev.map(b =>
                b.id === bidId ? { ...b, price_estimate: editForm.price, message: editForm.message } : b
            ));

            cancelEditing();
            alert("Bid updated successfully!");
        } catch (error) {
            console.error("Error updating bid:", error);
            alert("Failed to update bid: " + error.message);
        }
    };

    if (loading) return <div className="container" style={{ padding: '2rem' }}>Loading...</div>;

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.5rem' }}>Professional Dashboard</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage your active jobs, leads, and professional tools.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-end' }}>
                    {/* Availability Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '1rem', color: isAvailable ? '#4ade80' : '#ef4444' }}>
                                {isAvailable ? 'Available for Work' : 'Currently Busy'}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Visible to homeowners</span>
                        </div>
                        {/* Custom CSS Toggle Switch */}
                        <div 
                            onClick={toggleAvailability}
                            title="Toggle your public availability"
                            style={{
                                width: '50px', height: '26px', background: isAvailable ? '#22c55e' : '#334155',
                                borderRadius: '13px', position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
                            }}
                        >
                            <div style={{
                                width: '22px', height: '22px', background: 'white', borderRadius: '50%',
                                position: 'absolute', top: '2px', left: isAvailable ? '26px' : '2px',
                                transition: 'left 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }} />
                        </div>
                    </div>
                    
                    {/* SMS Notification Toggle */}
                    {isPremium && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1rem', color: smsNotifications ? '#3b82f6' : '#94a3b8' }}>
                                    {smsNotifications ? 'SMS Alerts ON' : 'SMS Alerts OFF'}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Get text when job posted</span>
                            </div>
                            <div 
                                onClick={toggleSmsNotifications}
                                title="Toggle SMS notifications"
                                style={{
                                    width: '50px', height: '26px', background: smsNotifications ? '#3b82f6' : '#334155',
                                    borderRadius: '13px', position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
                                }}
                            >
                                <div style={{
                                    width: '22px', height: '22px', background: 'white', borderRadius: '50%',
                                    position: 'absolute', top: '2px', left: smsNotifications ? '26px' : '2px',
                                    transition: 'left 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }} />
                            </div>
                        </div>
                    )}
                    
                    {/* Zipcode Matcher Setting */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MapPin size={16} color="var(--color-primary-light)" />
                        <input 
                            type="text" 
                            placeholder="Set Work Area Zip Code..." 
                            value={activeZipcode} 
                            onChange={(e) => setActiveZipcode(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: 'white', width: '180px' }}
                        />
                        <button onClick={handleSaveZipcode} disabled={isSavingZip} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                            {isSavingZip ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Dashboard Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <button 
                    onClick={() => setActiveTab('bids')}
                    style={{
                        padding: '1rem 2rem', background: 'none', border: 'none', color: activeTab === 'bids' ? 'var(--color-primary-light)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'bids' ? '3px solid var(--color-primary)' : '3px solid transparent',
                        fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    Jobs & Leads
                </button>
                <button 
                    onClick={() => setActiveTab('portfolio')}
                    style={{
                        padding: '1rem 2rem', background: 'none', border: 'none', color: activeTab === 'portfolio' ? 'var(--color-primary-light)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'portfolio' ? '3px solid var(--color-primary)' : '3px solid transparent',
                        fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    My Portfolio
                </button>
                <button 
                    onClick={() => setActiveTab('profile')}
                    style={{
                        padding: '1rem 2rem', background: 'none', border: 'none', color: activeTab === 'profile' ? 'var(--color-primary-light)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'profile' ? '3px solid var(--color-primary)' : '3px solid transparent',
                        fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    My Profile
                </button>
                <button
                    onClick={() => setActiveTab('reviews')}
                    style={{
                        padding: '1rem 2rem', background: 'none', border: 'none', color: activeTab === 'reviews' ? 'var(--color-primary-light)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'reviews' ? '3px solid var(--color-primary)' : '3px solid transparent',
                        fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative'
                    }}
                >
                    Reviews
                    {newReviewsCount > 0 && (
                        <span style={{
                            background: '#ef4444', color: 'white', fontSize: '0.7rem', fontWeight: 700,
                            padding: '0.1rem 0.45rem', borderRadius: '10px', lineHeight: 1.4,
                        }}>
                            {newReviewsCount} new
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('subscription')}
                    style={{
                        padding: '1rem 2rem', background: 'none', border: 'none', color: activeTab === 'subscription' ? 'var(--color-primary-light)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'subscription' ? '3px solid var(--color-primary)' : '3px solid transparent',
                        fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                >
                    <Star size={18} fill={activeTab === 'subscription' ? 'var(--color-primary-light)' : 'none'} /> Pro Plan
                </button>
            </div>

            {activeTab === 'bids' && (
                <>

            {fetchError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <strong>Error loading bids:</strong> {fetchError}
                </div>
            )}

            {/* Verification Warning Banner */}
            {user.vetting_status !== 'approved' && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <AlertCircle size={32} style={{ color: '#ef4444' }} />
                        <div>
                            <h3 style={{ color: '#ef4444', marginBottom: '0.25rem' }}>Verification Required</h3>
                            <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                                You must verify your account before you can place new bids.
                                {user.vetting_status === 'pending' && " (Your application is currently under review)"}
                            </p>
                        </div>
                    </div>
                    <Link to="/verification">
                        <button className="btn" style={{ background: '#ef4444', color: 'white', border: 'none' }}>
                            {user.vetting_status === 'pending' ? 'Check Status' : 'Verify Now'}
                        </button>
                    </Link>
                </div>
            )}

            {myBids.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
                    <p>You haven't placed any bids yet.</p>
                    <Link to="/services" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
                        Browse Open Requests
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {myBids.map(bid => {
                        // Check if job is already given to someone else
                        const isLost = bid.request?.status === 'assigned' && bid.status !== 'accepted';
                        const isEditing = editingBid === bid.id;

                        return (
                            <div key={bid.id} className="glass-panel" style={{
                                padding: '1.5rem',
                                borderLeft: bid.status === 'accepted' ? '4px solid #4ade80' :
                                    isLost ? '4px solid #94a3b8' : '4px solid transparent',
                                opacity: isLost ? 0.7 : 1
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                    {/* Request Info Snapshot */}
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                            <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}>
                                                Request #{bid.request_id}
                                            </span>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                Bid placed: {new Date(bid.created_at).toLocaleDateString()}
                                            </span>
                                            <Link
                                                to={`/job/${bid.request_id}`}
                                                style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.15rem', marginLeft: 'auto' }}
                                            >
                                                View Job <ArrowUpRight size={12} />
                                            </Link>
                                        </div>
                                        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                                            {bid.request?.details || 'Unknown Request (Private/Deleted)'}
                                        </h3>
                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <MapPin size={14} /> {bid.request?.city_state || bid.request?.zip_code || 'Location Hidden'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Bid Status & Amount / Edit Form */}
                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', minWidth: '200px' }}>

                                        {isEditing ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                                                <input
                                                    type="text"
                                                    value={editForm.price}
                                                    onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                                                    placeholder="Price"
                                                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', color: 'black' }}
                                                />
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button onClick={cancelEditing} className="btn" style={{ fontSize: '0.8rem', background: '#64748b' }}>Cancel</button>
                                                    <button onClick={() => saveEditing(bid.id)} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>Save</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                    <DollarSign size={20} /> {bid.price_estimate}
                                                </div>

                                                <div style={{
                                                    marginTop: '0.5rem',
                                                    display: 'inline-block',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '20px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600',
                                                    background: bid.status === 'accepted' ? 'rgba(74, 222, 128, 0.2)' :
                                                        isLost ? 'rgba(148, 163, 184, 0.2)' : 'rgba(255,255,255,0.1)',
                                                    color: bid.status === 'accepted' ? '#4ade80' :
                                                        isLost ? '#94a3b8' : 'var(--text-muted)'
                                                }}>
                                                    {bid.status === 'accepted' ? 'Request Accepted!' :
                                                        isLost ? 'Assigned' :
                                                            'Status: ' + bid.status}
                                                </div>

                                                {/* Actions */}
                                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                    {(bid.status === 'pending' || bid.status === 'accepted') && !isLost && (
                                                        <button
                                                            onClick={() => handleMessageHomeowner(bid)}
                                                            style={{
                                                                background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)',
                                                                color: '#60a5fa', padding: '0.3rem 0.8rem', borderRadius: '4px',
                                                                cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem'
                                                            }}
                                                        >
                                                            <MessageSquare size={14} /> Message Homeowner
                                                        </button>
                                                    )}
                                                    {bid.status === 'pending' && !isLost && (
                                                        <button
                                                            onClick={() => startEditing(bid)}
                                                            style={{
                                                                background: 'none', border: 'none', color: '#3b82f6',
                                                                cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline'
                                                            }}
                                                        >
                                                            Edit
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteBid(bid.id)}
                                                        style={{
                                                            background: 'none', border: 'none', color: '#ef4444',
                                                            cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline',
                                                            opacity: 0.8
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Contact Info Reveal Section for Accepted Bids */}
                                {bid.status === 'accepted' && bid.contactInfo ? (
                                    <div style={{ marginTop: '1.5rem', background: 'rgba(74, 222, 128, 0.1)', padding: '1.5rem', borderRadius: '12px', border: '1px solid #4ade80' }}>
                                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4ade80', marginBottom: '1rem' }}>
                                            <CheckCircle size={20} /> Job Secured! Contact the Homeowner
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                            <div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Name</div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>{bid.contactInfo.contact_name}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Phone</div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Smartphone size={16} /> {bid.contactInfo.contact_phone || 'N/A'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email</div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Mail size={16} /> <a href={`mailto:${bid.contactInfo.contact_email}`} style={{ color: 'white', textDecoration: 'underline' }}>{bid.contactInfo.contact_email}</a>
                                                </div>
                                            </div>
                                            {bid.contactInfo.exact_address && (
                                                <div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Address</div>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>{bid.contactInfo.exact_address}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : bid.status === 'accepted' && !bid.contactInfo ? (
                                    <div style={{ marginTop: '1rem', color: '#ef4444' }}>
                                        <AlertCircle size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                                        Accepted, but could not load contact info. Please contact support.
                                    </div>
                                ) : (
                                    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        {isEditing ? (
                                            <textarea
                                                value={editForm.message}
                                                onChange={e => setEditForm({ ...editForm, message: e.target.value })}
                                                rows="3"
                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', color: 'black' }}
                                            />
                                        ) : (
                                            <p>Your pitch: "{bid.message}"</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            </>
            )}

            {activeTab === 'portfolio' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Upload Before & After Photos</h2>
                        <form onSubmit={submitPortfolio} style={{ display: 'grid', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>"Before" Photo</label>
                                    <input type="file" id="beforeImage" accept="image/*" onChange={(e) => handleImageUpload(e, 'before_image')} style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} required />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>"After" Photo</label>
                                    <input type="file" id="afterImage" accept="image/*" onChange={(e) => handleImageUpload(e, 'after_image')} style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} required />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Project Description</label>
                                <textarea 
                                    value={newPortfolio.description} 
                                    onChange={(e) => setNewPortfolio({...newPortfolio, description: e.target.value})}
                                    placeholder="Describe the repair, materials used, or client request..."
                                    style={{ width: '100%', minHeight: '100px', padding: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={isUploading} style={{ maxWidth: '200px' }}>
                                {isUploading ? 'Uploading...' : 'Save to Portfolio'}
                            </button>
                        </form>
                    </div>

                    <div style={{ marginTop: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Your Gallery</h2>
                        {portfolioItems.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>No portfolio items uploaded yet.</p>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                {portfolioItems.map(item => (
                                    <div key={item.id} className="glass-panel" style={{ overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', height: '200px' }}>
                                            <div style={{ flex: 1, borderRight: '2px solid rgba(0,0,0,0.5)', position: 'relative' }}>
                                                <img src={item.before_image} alt="Before" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>Before</span>
                                            </div>
                                            <div style={{ flex: 1, position: 'relative' }}>
                                                <img src={item.after_image} alt="After" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <span style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(34,197,94,0.7)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>After</span>
                                            </div>
                                        </div>
                                        <div style={{ padding: '1.5rem', position: 'relative' }}>
                                            <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '1rem' }}>{item.description}</p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(item.created_at).toLocaleDateString()}</span>
                                                <button onClick={() => deletePortfolioItem(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', textDecoration: 'underline', cursor: 'pointer' }}>Delete</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'reviews' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Star size={22} color="#fbbf24" /> Reviews Received
                            <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                ({reviewsReceived.length})
                            </span>
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                            Reviews homeowners have left after completed jobs. New reviews from the last 7 days are highlighted.
                        </p>
                    </div>

                    {reviewsReceived.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No reviews yet. Once a homeowner rates a completed job, it will appear here.
                        </div>
                    ) : (
                        reviewsReceived.map(rev => {
                            const isNew = (Date.now() - new Date(rev.created_at).getTime()) < (7 * 24 * 60 * 60 * 1000);
                            return (
                                <div key={rev.id} className="glass-panel" style={{ padding: '1.25rem', borderLeft: isNew ? '3px solid var(--color-primary)' : undefined }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>{rev.reviewer_name}</strong>
                                                {isNew && (
                                                    <span style={{ background: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '10px' }}>NEW</span>
                                                )}
                                            </div>
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
                            );
                        })
                    )}
                </div>
            )}

            {activeTab === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                            <User size={32} style={{ color: 'var(--color-primary-light)' }} />
                            <div>
                                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>Professional Profile</h2>
                                <p style={{ color: 'var(--text-muted)' }}>Keep your details, services, and pricing up to date.</p>
                            </div>
                        </div>
                        
                        <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <h3 style={{ marginBottom: '1rem' }}>Edit Your Public Profile</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                                Your professional profile includes your business identity, verified credentials, pricing preferences, service areas, and availability. Customers view this information when considering you for jobs.
                            </p>
                            <Link to="/pro-onboarding" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}>
                                <User size={18} /> Edit Profile & Settings
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'subscription' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                        {/* Background glow */}
                        <div style={{ position: 'absolute', top: '-50%', right: '-20%', width: '300px', height: '300px', background: 'var(--color-primary)', filter: 'blur(100px)', opacity: 0.1, zIndex: 0 }}></div>
                        
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            {isPremium ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                                    <div style={{ width: '80px', height: '80px', background: 'rgba(74, 222, 128, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
                                        <Star size={40} fill="#4ade80" />
                                    </div>
                                    <h2 style={{ fontSize: '2rem', color: 'white' }}>You are a Premium Pro</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto' }}>
                                        Your account is fully upgraded. You are currently receiving instant SMS Job Alerts to your phone the exact second a homeowner posts a job in your zip code.
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem' }}>
                                        <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(74, 222, 128, 0.3)', width: '250px' }}>
                                            <Zap size={24} color="#4ade80" style={{ marginBottom: '0.5rem' }} />
                                            <h4 style={{ color: 'white', marginBottom: '0.25rem' }}>SMS Alerts Active</h4>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Real-time Twilio Notifications are enabled.</p>
                                        </div>
                                    </div>
                                    <button className="btn btn-secondary" style={{ marginTop: '2rem' }}>Manage Billing on Stripe</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                                    <div style={{ width: '80px', height: '80px', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                        <Star size={40} />
                                    </div>
                                    <h2 style={{ fontSize: '2.5rem', color: 'white' }}>FixIt Genie Premium</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
                                        Beat your competition to the punch. Unlock Instant SMS Job Alerts right to your phone so you can bid on high-paying jobs before anyone else even sees them.
                                    </p>
                                    
                                    <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.3)', width: '100%', maxWidth: '400px', margin: '1rem auto' }}>
                                        <h3 style={{ fontSize: '2rem', color: 'white', marginBottom: '0.5rem' }}>$15<span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 'normal' }}> / month</span></h3>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: '1.5rem 0', textAlign: 'left' }}>
                                            <li style={{ display: 'flex', alignItems: 'start', gap: '0.5rem', marginBottom: '1rem' }}><CheckCircle size={20} color="#3b82f6" style={{ flexShrink: 0 }} /> <span style={{ color: 'var(--text-main)' }}>Instant SMS Notifications for new jobs in your zip code</span></li>
                                            <li style={{ display: 'flex', alignItems: 'start', gap: '0.5rem', marginBottom: '1rem' }}><CheckCircle size={20} color="#3b82f6" style={{ flexShrink: 0 }} /> <span style={{ color: 'var(--text-main)' }}>"Featured Pro" search ranking priority</span></li>
                                            <li style={{ display: 'flex', alignItems: 'start', gap: '0.5rem', marginBottom: '1rem' }}><CheckCircle size={20} color="#3b82f6" style={{ flexShrink: 0 }} /> <span style={{ color: 'var(--text-main)' }}>Premium Gold Verification Badge</span></li>
                                        </ul>
                                        <a href={`https://buy.stripe.com/test_5kQ14o5rIbD96NIdFJ83C00?client_reference_id=${user.id}`} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ display: 'block', width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
                                            Upgrade to Premium
                                        </a>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>Secure checkout powered by Stripe. Cancel anytime.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
