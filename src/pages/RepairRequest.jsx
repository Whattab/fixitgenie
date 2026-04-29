
import { useState, useEffect } from 'react';
import { Send, ArrowLeft } from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useService } from '../context/ServiceContext';

export default function RepairRequest() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { addRequest } = useService();

    // Protect Route: Redirect to login if not authenticated
    // Redirect Pros to their dashboard (they can't post requests)
    useEffect(() => {
        if (!user) {
            // Save current path to redirect back after login
            navigate('/login', { state: { from: location }, replace: true });
        } else if (user.type === 'professional') {
            alert("Professionals cannot post service requests. Please use the Homeowner account to post requests.");
            navigate('/my-bids', { replace: true });
        }
    }, [user, navigate, location]);

    const [formData, setFormData] = useState({
        category: '',
        details: '',
        urgency: '',
        startTime: '',
        propertyType: '',
        primaryResidence: '',
        homeAge: '',
        zipCode: '',
        cityState: '',
        serviceGoal: '',
        serviceTime: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        contactMethod: ''
    });

    const [mediaFile, setMediaFile] = useState(null);
    const [estimate, setEstimate] = useState(null);
    const [isCalculatingEstimate, setIsCalculatingEstimate] = useState(false);
    const [isFetchingZip, setIsFetchingZip] = useState(false);

    // Calculate Community Estimate when category changes
    useEffect(() => {
        const calculateEstimate = async (category) => {
            try {
                setIsCalculatingEstimate(true);
                setEstimate(null);

                const { data: requests, error } = await supabase
                    .from('service_requests')
                    .select('id')
                    .eq('category', category)
                    .in('status', ['assigned', 'completed']);
                
                if (error) throw error;
                if (!requests || requests.length === 0) return;

                const requestIds = requests.map(r => r.id);
                
                const { data: bids, error: bidsError } = await supabase
                    .from('bids')
                    .select('price_estimate')
                    .in('request_id', requestIds)
                    .eq('status', 'accepted');

                if (bidsError) throw bidsError;
                if (!bids || bids.length === 0) return;

                const validPrices = bids
                    .map(b => {
                        const num = parseFloat(b.price_estimate.replace(/[^0-9.]/g, ''));
                        return isNaN(num) ? null : num;
                    })
                    .filter(p => p !== null);
                    
                if (validPrices.length === 0) return;

                const sum = validPrices.reduce((a, b) => a + b, 0);
                const avg = sum / validPrices.length;

                setEstimate(avg.toFixed(2));
            } catch (err) {
                console.error("Error calculating estimate:", err);
            } finally {
                setIsCalculatingEstimate(false);
            }
        };

        if (formData.category) {
            calculateEstimate(formData.category);
        } else {
            setEstimate(null);
        }
    }, [formData.category]);

    // Pre-fill contact info if user is logged in
    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                contactName: user.name || '',
                contactEmail: user.email || ''
            }));
        }
    }, [user]);

    const categories = [
        "Plumbing", "Electrical", "HVAC / Heating & Cooling", "Appliance Repair",
        "Roofing", "Flooring", "Painting", "Drywall", "Carpentry",
        "Windows & Doors", "Landscaping / Outdoor", "Pest Control",
        "General Handyman", "Other"
    ];

    const urgencyOptions = [
        { value: "Emergency", label: "🚨 Emergency (immediate attention)" },
        { value: "Urgent", label: "⏱ Urgent (24–48 hours)" },
        { value: "Soon", label: "📅 Soon (within a week)" },
        { value: "Not urgent", label: "🧘 Not urgent / flexible" }
    ];

    const startTimeOptions = [
        "Today",
        "Last few days",
        "Over a week ago",
        "Ongoing / recurring"
    ];

    const propertyProperties = [
        "Single-family home",
        "Condo / Apartment",
        "Townhouse",
        "Rental property"
    ];

    const homeAgeOptions = [
        "0–5 years",
        "5–15 years",
        "15–30 years",
        "30+ years",
        "Not sure"
    ];

    const serviceGoalOptions = [
        "Get advice or estimates",
        "Request on-site service",
        "Compare multiple professionals"
    ];

    const serviceTimeOptions = [
        "Morning", "Afternoon", "Evening", "Flexible"
    ];

    const contactMethodOptions = [
        "Email", "Phone", "Text"
    ];

    const handleChange = async (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Auto-fill City and State if Zip Code is exactly 5 numeric digits
        if (name === 'zipCode' && /^\d{5}$/.test(value)) {
            setIsFetchingZip(true);
            try {
                const response = await fetch(`https://api.zippopotam.us/us/${value}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.places && data.places.length > 0) {
                        const place = data.places[0];
                        const newCityState = `${place['place name']}, ${place['state abbreviation']}`;
                        setFormData(prev => ({ ...prev, cityState: newCityState }));
                    }
                }
            } catch (err) {
                console.error("Failed to fetch zip code automatically", err);
            } finally {
                setIsFetchingZip(false);
            }
        }
    };

    const handleFileChange = (e) => {
        setMediaFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Use the context to add the request
        const result = await addRequest({
            ...formData,
            // In a real app we'd upload mediaFile here
        });

        if (result.success) {
            alert("Your repair request has been submitted! Pros will see it shortly.");
            navigate('/services'); // Redirect to the available services list
        } else {
            alert("Failed to submit request: " + result.message);
        }
    };

    return (
        <div className="container" style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
            <button
                onClick={() => navigate('/')}
                style={{
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem',
                    cursor: 'pointer', fontSize: '1rem'
                }}
            >
                <ArrowLeft size={20} /> Back to Home
            </button>

            <div className="glass-panel" style={{ padding: '2.5rem' }}>
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Request Home Repair</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Tell us what you need, and we'll connect you with the right pros.</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Category Selection */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <label style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                                What type of repair do you need?
                            </label>
                            {isCalculatingEstimate ? (
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Calculating average costs...</span>
                            ) : estimate ? (
                                <div style={{ background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid rgba(74, 222, 128, 0.2)' }}>
                                    <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ fontSize: '1.1rem' }}>💡</span> Community Estimate:</strong> ${estimate}
                                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Based on accepted bids for similar jobs</span>
                                </div>
                            ) : null}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                            {categories.map(cat => (
                                <label key={cat} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    padding: '0.75rem', borderRadius: '8px',
                                    background: formData.category === cat ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                                    cursor: 'pointer', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <input
                                        type="radio"
                                        name="category"
                                        value={cat}
                                        checked={formData.category === cat}
                                        onChange={handleChange}
                                        style={{ accentColor: 'white' }}
                                    />
                                    {cat}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Problem Details */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '1.1rem' }}>
                            Repair Details
                        </label>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Please describe the problem</p>
                        <textarea
                            name="details"
                            required
                            placeholder="Example: Kitchen sink leaking under cabinet when water is running."
                            value={formData.details}
                            onChange={handleChange}
                            style={{
                                width: '100%', minHeight: '120px', padding: '1rem',
                                borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                                fontSize: '1rem', fontFamily: 'inherit'
                            }}
                        />
                        {/* Media Upload */}
                        <div style={{ marginTop: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                                Upload photos or videos (optional)
                            </label>
                            <input type="file" accept="image/*,video/*" onChange={handleFileChange} style={{ color: 'var(--text-muted)' }} />
                        </div>
                    </div>

                    {/* Property Details Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        {/* Property Type */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '1rem', fontWeight: '600', fontSize: '1.1rem' }}>
                                Property type
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {propertyProperties.map(prop => (
                                    <label key={prop} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                                        background: formData.propertyType === prop ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                        borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        <input
                                            type="radio"
                                            name="propertyType"
                                            value={prop}
                                            checked={formData.propertyType === prop}
                                            onChange={handleChange}
                                            style={{ accentColor: '#3b82f6' }}
                                        />
                                        {prop}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Primary Residence */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '1rem', fontWeight: '600', fontSize: '1.1rem' }}>
                                Is this your primary residence?
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {["Yes", "No"].map(opt => (
                                    <label key={opt} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                                        background: formData.primaryResidence === opt ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                        borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        <input
                                            type="radio"
                                            name="primaryResidence"
                                            value={opt}
                                            checked={formData.primaryResidence === opt}
                                            onChange={handleChange}
                                            style={{ accentColor: '#3b82f6' }}
                                        />
                                        {opt}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Home Age and Location Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        {/* Age of Home */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '1rem', fontWeight: '600', fontSize: '1.1rem' }}>
                                Approximate age of the home
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {homeAgeOptions.map(age => (
                                    <label key={age} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                                        background: formData.homeAge === age ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                        borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        <input
                                            type="radio"
                                            name="homeAge"
                                            value={age}
                                            checked={formData.homeAge === age}
                                            onChange={handleChange}
                                            style={{ accentColor: '#3b82f6' }}
                                        />
                                        {age}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Location Fields */}
                        <div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '1.1rem' }}>
                                    ZIP Code
                                </label>
                                <input
                                    type="text"
                                    name="zipCode"
                                    placeholder="Enter ZIP Code"
                                    required
                                    value={formData.zipCode}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%', padding: '1rem', borderRadius: '12px',
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'white', fontSize: '1rem'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'flex', marginBottom: '0.5rem', fontWeight: '600', fontSize: '1.1rem', alignItems: 'center' }}>
                                    City & State
                                    {isFetchingZip && <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: 'var(--color-primary-light)', fontWeight: 'normal' }}>Fetching...</span>}
                                </label>
                                <input
                                    type="text"
                                    name="cityState"
                                    placeholder={isFetchingZip ? "Loading location..." : "Auto-fills from ZIP, or enter manually"}
                                    value={formData.cityState}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%', padding: '1rem', borderRadius: '12px',
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'white', fontSize: '1rem'
                                    }}
                                />
                            </div>
                        </div>
                    </div>


                    {/* Urgency and Time Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                        {/* Urgency */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '1rem', fontWeight: '600', fontSize: '1.1rem' }}>
                                How urgent is this issue?
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {urgencyOptions.map(opt => (
                                    <label key={opt.value} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                                        background: formData.urgency === opt.value ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                        borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        <input
                                            type="radio"
                                            name="urgency"
                                            value={opt.value}
                                            checked={formData.urgency === opt.value}
                                            onChange={handleChange}
                                            style={{ accentColor: '#3b82f6' }}
                                        />
                                        {opt.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Start Time */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '1rem', fontWeight: '600', fontSize: '1.1rem' }}>
                                When did the problem start?
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {startTimeOptions.map(opt => (
                                    <label key={opt} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                                        background: formData.startTime === opt ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                        borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        <input
                                            type="radio"
                                            name="startTime"
                                            value={opt}
                                            checked={formData.startTime === opt}
                                            onChange={handleChange}
                                            style={{ accentColor: '#3b82f6' }}
                                        />
                                        {opt}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Service Preferences */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '1rem', fontWeight: '600', fontSize: '1.1rem' }}>
                                What would you like to do?
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {serviceGoalOptions.map(opt => (
                                    <label key={opt} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                                        background: formData.serviceGoal === opt ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                        borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        <input
                                            type="radio"
                                            name="serviceGoal"
                                            value={opt}
                                            checked={formData.serviceGoal === opt}
                                            onChange={handleChange}
                                            style={{ accentColor: '#3b82f6' }}
                                        />
                                        {opt}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '1rem', fontWeight: '600', fontSize: '1.1rem' }}>
                                Preferred Service Time
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {serviceTimeOptions.map(opt => (
                                    <label key={opt} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                                        background: formData.serviceTime === opt ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                        borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        <input
                                            type="radio"
                                            name="serviceTime"
                                            value={opt}
                                            checked={formData.serviceTime === opt}
                                            onChange={handleChange}
                                            style={{ accentColor: '#3b82f6' }}
                                        />
                                        {opt}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>Contact Information</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Full Name</label>
                                <input type="text" name="contactName" required value={formData.contactName} onChange={handleChange}
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email Address</label>
                                <input type="email" name="contactEmail" required value={formData.contactEmail} onChange={handleChange}
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Phone Number</label>
                                <input type="tel" name="contactPhone" value={formData.contactPhone} onChange={handleChange}
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Preferred Contact Method</label>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                    {contactMethodOptions.map(opt => (
                                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input type="radio" name="contactMethod" value={opt} checked={formData.contactMethod === opt} onChange={handleChange} style={{ accentColor: '#3b82f6' }} />
                                            {opt}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ marginTop: '1rem', padding: '1rem', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        <Send size={20} /> Submit Request
                    </button>

                </form>
            </div>
        </div>
    );
}
