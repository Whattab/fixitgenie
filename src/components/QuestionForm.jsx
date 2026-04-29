import { useState, useEffect } from 'react';
import { Send, FileQuestion } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function QuestionForm({ onSubmit }) {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: user ? user.name : '',
        email: user ? user.email : '',
        category: 'General',
        question: ''
    });

    // Update form data if user logs in/out while on page
    useEffect(() => {
        if (user) {
            setFormData(prev => ({ ...prev, name: user.name, email: user.email }));
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const [media, setMedia] = useState(null);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setMedia(e.target.files[0]);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ ...formData, media });
        // Reset form but keep user details if logged in
        setFormData({
            name: user ? user.name : '',
            email: user ? user.email : '',
            category: 'General',
            question: ''
        });
        setMedia(null);
    };

    const inputStyle = {
        width: '100%',
        padding: '1rem',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.05)',
        color: 'white',
        fontSize: '1rem',
        outline: 'none',
        transition: 'border-color 0.2s',
        marginBottom: '1rem'
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ padding: '0.75rem', background: 'var(--color-primary)', borderRadius: '12px', display: 'flex' }}>
                    <FileQuestion size={24} color="white" />
                </div>
                <div>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Ask a Question</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Get answers from pros and neighbors</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {!user && (
                        <>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Your Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    required={!user}
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={handleChange}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Email (Optional)</label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="john@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    style={inputStyle}
                                />
                            </div>
                        </>
                    )}
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Category</label>
                    <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                        <option value="General" style={{ color: 'black' }}>General Inquiry</option>
                        <option value="Plumbing" style={{ color: 'black' }}>Plumbing</option>
                        <option value="Electrical" style={{ color: 'black' }}>Electrical</option>
                        <option value="HVAC" style={{ color: 'black' }}>HVAC / AC</option>
                        <option value="Roofing" style={{ color: 'black' }}>Roofing</option>
                        <option value="Foundation" style={{ color: 'black' }}>Foundation</option>
                        <option value="Siding" style={{ color: 'black' }}>Siding</option>
                        <option value="Windows & Doors" style={{ color: 'black' }}>Windows & Doors</option>
                        <option value="Decks & Patios" style={{ color: 'black' }}>Decks & Patios</option>
                        <option value="Fencing" style={{ color: 'black' }}>Fencing</option>
                        <option value="Drywall & Plastering" style={{ color: 'black' }}>Drywall & Plastering</option>
                        <option value="Flooring" style={{ color: 'black' }}>Flooring</option>
                        <option value="Insulation" style={{ color: 'black' }}>Insulation</option>
                        <option value="Painting" style={{ color: 'black' }}>Painting</option>
                        <option value="Remodeling" style={{ color: 'black' }}>Remodeling</option>
                        <option value="Garage Doors" style={{ color: 'black' }}>Garage Doors</option>
                        <option value="Appliance" style={{ color: 'black' }}>Appliance</option>
                        <option value="Water Heater" style={{ color: 'black' }}>Water Heater</option>
                        <option value="Pest Control" style={{ color: 'black' }}>Pest Control</option>
                        <option value="Home Security" style={{ color: 'black' }}>Home Security</option>
                        <option value="Emergency Repair" style={{ color: 'black' }}>Emergency Repair</option>
                        <option value="Product Recommendations" style={{ color: 'black' }}>Product Recommendations</option>
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Your Question</label>
                    <textarea
                        name="question"
                        required
                        placeholder="Describe your issue in detail..."
                        value={formData.question}
                        onChange={handleChange}
                        style={{ ...inputStyle, minHeight: '150px', resize: 'vertical' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Photos/Videos (Optional)</label>
                    <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileChange}
                        style={inputStyle}
                    />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <Send size={18} />
                    Post Question
                </button>
            </form>
        </div>
    );
}
