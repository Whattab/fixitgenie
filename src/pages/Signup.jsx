import { useState } from 'react';
import { House, Wrench, Check, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Signup.css';

const Signup = () => {
    const navigate = useNavigate();
    const { signup } = useAuth();
    const [userType, setUserType] = useState(null); // 'homeowner' | 'professional' | null
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        zipcode: '',
        city: '',
        state: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [profileImage, setProfileImage] = useState(null);

    const handleInputChange = async (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Automatically fetch City and State if Zipcode gets to 5 digits
        if (name === 'zipcode' && value.length === 5) {
            try {
                const response = await fetch(`https://api.zippopotam.us/us/${value}`);
                if (response.ok) {
                    const data = await response.json();
                    setFormData(prev => ({
                        ...prev,
                        city: data.places[0]['place name'],
                        state: data.places[0]['state abbreviation']
                    }));
                }
            } catch (err) {
                console.error("Failed to fetch location by zip", err);
            }
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 200;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    setProfileImage(dataUrl);
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUserTypeSelect = (type) => {
        setUserType(type);
        setFormData({ name: '', email: '', password: '', confirmPassword: '', zipcode: '', city: '', state: '' }); // Reset form
        setShowPassword(false);
        setProfileImage(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            alert("Passwords do not match!");
            return;
        }
        // Proceed with signup logic
        const newUser = {
            name: formData.name,
            email: formData.email,
            password: formData.password, // Store password
            type: userType,
            avatar: profileImage,
            zipcode: formData.zipcode,
            city: formData.city,
            state: formData.state
        };

        const result = await signup(newUser);

        if (result.success) {
            if (userType === 'professional') {
                navigate('/pro-onboarding');
            } else {
                alert(`Success! Account created for ${userType}: ${formData.email}`);
                navigate('/');
            }
        } else {
            alert(result.message);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className="signup-container">
            <div className="signup-header">
                <h1>HomeRepair Forum</h1>
                <p>Connect homeowners with trusted professionals</p>
            </div>

            <div className={`signup-content ${userType ? 'has-selection' : ''}`}>
                {/* Homeowner Card */}
                <div
                    className={`signup-card ${userType === 'homeowner' ? 'active' : ''} ${userType === 'professional' ? 'inactive' : ''}`}
                    onClick={() => handleUserTypeSelect('homeowner')}
                >
                    <div className="icon-wrapper homeowner-icon">
                        {profileImage && userType === 'homeowner' ? (
                            <img src={profileImage} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            <House size={48} />
                        )}
                    </div>
                    <h2>Homeowner</h2>
                    <p className="description">
                        Find trusted professionals for your home repair and improvement projects
                    </p>

                    <ul className="benefits-list">
                        <li><Check size={16} /> Post your questions and get help</li>
                        <li><Check size={16} /> Post repair requests</li>
                        <li><Check size={16} /> Get quotes from professionals</li>
                        <li><Check size={16} /> Read reviews and ratings</li>
                    </ul>

                    {userType === 'homeowner' && (
                        <form className="signup-form" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
                            <h3>Join as Homeowner</h3>
                            <div className="file-input-wrapper" style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: '#64748b' }}>Upload Profile Photo (Optional)</label>
                                <input type="file" accept="image/*" onChange={handleFileChange} style={{ padding: '0.5rem' }} />
                            </div>
                            <input
                                type="text"
                                name="name"
                                placeholder="Full Name"
                                required
                                value={formData.name}
                                onChange={handleInputChange}
                            />
                            <input
                                type="email"
                                name="email"
                                placeholder="Email Address"
                                required
                                value={formData.email}
                                onChange={handleInputChange}
                            />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem', marginBottom: '1rem' }}>
                                <input
                                    type="text"
                                    name="zipcode"
                                    placeholder="Zip / Postal"
                                    required
                                    maxLength={5}
                                    value={formData.zipcode}
                                    onChange={handleInputChange}
                                />
                                <input
                                    type="text"
                                    name="city"
                                    placeholder="City, State (Auto-filled)"
                                    readOnly
                                    value={formData.city && formData.state ? `${formData.city}, ${formData.state}` : ''}
                                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.2)' }}
                                />
                            </div>

                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    placeholder="Password"
                                    required
                                    value={formData.password}
                                    onChange={handleInputChange}
                                />
                                <button type="button" className="password-toggle" onClick={togglePasswordVisibility}>
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    placeholder="Confirm Password"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    style={{ borderColor: formData.confirmPassword && formData.password !== formData.confirmPassword ? '#ef4444' : '' }}
                                />
                                <button type="button" className="password-toggle" onClick={togglePasswordVisibility}>
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            <button type="submit" className="btn-primary">Create Account</button>
                        </form>
                    )}
                </div>

                {/* Professional Card */}
                <div
                    className={`signup-card ${userType === 'professional' ? 'active' : ''} ${userType === 'homeowner' ? 'inactive' : ''}`}
                    onClick={() => handleUserTypeSelect('professional')}
                >
                    <div className="icon-wrapper professional-icon">
                        {profileImage && userType === 'professional' ? (
                            <img src={profileImage} alt="Logo" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            <Wrench size={48} />
                        )}
                    </div>
                    <h2>Professional Tradesman</h2>
                    <p className="description">
                        Grow your business by connecting with homeowners in your area
                    </p>

                    <ul className="benefits-list">
                        <li><Check size={16} /> Find new clients</li>
                        <li><Check size={16} /> Showcase your expertise</li>
                        <li><Check size={16} /> Build your reputation</li>
                    </ul>

                    {userType === 'professional' && (
                        <form className="signup-form" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
                            <h3>Join as Professional</h3>
                            <input
                                type="email"
                                name="email"
                                placeholder="Email Address"
                                required
                                value={formData.email}
                                onChange={handleInputChange}
                            />
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    placeholder="Password"
                                    required
                                    value={formData.password}
                                    onChange={handleInputChange}
                                />
                                <button type="button" className="password-toggle" onClick={togglePasswordVisibility}>
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    placeholder="Confirm Password"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    style={{ borderColor: formData.confirmPassword && formData.password !== formData.confirmPassword ? '#ef4444' : '' }}
                                />
                                <button type="button" className="password-toggle" onClick={togglePasswordVisibility}>
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            <button type="submit" className="btn-primary">Create Account</button>
                        </form>
                    )}
                </div>
            </div>

            {userType && (
                <button className="back-btn" onClick={() => setUserType(null)}>
                    ← Function Back to Selection
                </button>
            )}
        </div>
    );
};

export default Signup;
