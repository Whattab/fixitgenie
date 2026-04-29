import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Check, Upload, ArrowRight, ArrowLeft, Plus, X, Image as ImageIcon } from 'lucide-react';
import './ProOnboarding.css';

const ProOnboarding = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // Redirect if not logged in or not a pro, and fetch existing profile data
    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        } else if (user.type !== 'professional') {
            navigate('/my-requests');
            return;
        }

        const fetchExistingProfile = async () => {
            try {
                const { data, error } = await supabase
                    .from('professional_details')
                    .select('onboarding_data')
                    .eq('pro_id', user.id)
                    .single();
                
                if (data && data.onboarding_data) {
                    setFormData(prev => ({ ...prev, ...data.onboarding_data }));
                }
            } catch (err) {
                console.error("Error fetching existing profile data", err);
            }
        };

        fetchExistingProfile();
    }, [user, navigate]);

    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newLanguage, setNewLanguage] = useState("");
    const [newService, setNewService] = useState("");
    const [formData, setFormData] = useState({
        // Step 1: Identity
        firstName: '',
        lastName: '',
        phone: '',
        tradeTitle: '',
        yearsExperience: '',
        businessType: '',
        businessName: '',
        bio: '',
        languages: [],
        profilePhoto: null,
        
        // Step 2: Services
        primaryTrade: '',
        servicesOffered: [],
        additionalServices: '',
        clientType: [],
        specializations: [],
        
        // Step 3: Trust
        governmentIdFile: null,
        tradeLicenseNumber: '',
        licenseExpiry: '',
        licenseFile: null,

        // Step 4: Insurance & Safety
        insuranceProvider: '',
        insuranceCoverage: '',
        coiFile: null,
        isBonded: false,
        backgroundConsent: false,

        // Step 5: Pricing
        serviceCallFee: '',
        hourlyRate: '',
        emergencyRate: '',
        freeEstimates: '',
        minimumJobAmount: '',
        paymentMethods: [],
        laborWarranty: '',
        satisfactionGuarantee: '',

        // Step 6: Availability
        daysAvailable: [],
        startTime: '8:00 AM',
        endTime: '6:00 PM',
        sameDayBookings: false,
        emergencyService: false,
        acceptWeekend: false,
        holidayAvailability: false,
        advanceNotice: 'Same day is fine',
        maxJobsPerDay: '',

        // Step 7: Service Area
        primaryCity: '',
        stateRegion: 'TX — Texas',
        baseZipCode: '',
        travelRadius: 25,
        otherCities: '',
        travelFeePolicy: 'Free within 15 miles, $1/mile after',
        travelForLargeJobs: false,

        // Step 8: Portfolio & Credentials
        projectPhotos: [],
        projectVideoLink: '',
        featuredProjectDesc: '',
        certifications: [{ id: 1, name: '', issuer: '', issueDate: '', expiryDate: '', file: null }],
        workHistory: [{ id: 1, company: '', title: '', startYear: '', endYear: '' }],
        education: '',

        // Step 9: Reviews & Stats
        googleUrl: '',
        yelpUrl: '',
        testimonials: [{ id: 1, text: '' }],
        averageResponseTime: 'Within 1 hour',
        jobsCompleted: '',
        facebookUrl: '',
        instagramUrl: '',
        websiteUrl: '',
        youtubeTiktokUrl: '',

        // Step 10: Submission
        agreedToTerms: false,
        certifyTrue: false
    });

    const paymentOptions = ["Cash", "Zelle", "Credit / debit card", "Venmo", "Check", "PayPal", "Financing offered", "Invoice / net-30"];
    const dayOptions = ["M", "T", "W", "Th", "F", "Sa", "Su"];
    const timeOptions = [
        "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
        "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM",
        "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM", "12:00 AM"
    ];

    const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, 10));
    const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxArray = (field, value) => {
        setFormData(prev => {
            const currentArray = prev[field];
            if (currentArray.includes(value)) {
                return { ...prev, [field]: currentArray.filter(item => item !== value) };
            } else {
                return { ...prev, [field]: [...currentArray, value] };
            }
        });
    };

    const handleToggle = (field) => {
        setFormData(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleFileUpload = (e, field) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, [field]: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddPhoto = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    projectPhotos: [...prev.projectPhotos, reader.result].slice(0, 30)
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemovePhoto = (index) => {
        setFormData(prev => ({
            ...prev,
            projectPhotos: prev.projectPhotos.filter((_, i) => i !== index)
        }));
    };

    const handleDynamicChange = (listName, id, field, value) => {
        setFormData(prev => ({
            ...prev,
            [listName]: prev[listName].map(item => item.id === id ? { ...item, [field]: value } : item)
        }));
    };

    const handleDynamicAdd = (listName, templateItem) => {
        setFormData(prev => {
            const newList = [...prev[listName]];
            const newId = newList.length > 0 ? Math.max(...newList.map(i => i.id)) + 1 : 1;
            return { ...prev, [listName]: [...newList, { ...templateItem, id: newId }] };
        });
    };

    const handleDynamicRemove = (listName, id) => {
        setFormData(prev => ({
            ...prev,
            [listName]: prev[listName].filter(item => item.id !== id)
        }));
    };

    const submitOnboarding = async () => {
        if (!formData.agreedToTerms || !formData.certifyTrue) return;
        
        setIsSubmitting(true);
        try {
            // Get current user
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            
            if (authError || !user) {
                alert("Please log in to submit your profile.");
                setIsSubmitting(false);
                return;
            }

            // Insert data to professional_details
            const { error } = await supabase
                .from('professional_details')
                .upsert({ 
                    pro_id: user.id, 
                    onboarding_data: formData,
                    status: 'pending_review'
                });

            if (error) throw error;

            // Update the profile's avatar and name
            const updatePayload = {};
            if (formData.profilePhoto) {
                updatePayload.avatar = formData.profilePhoto;
            }
            
            // Set name to business name, fallback to first/last name
            const displayName = formData.businessName ? formData.businessName : `${formData.firstName} ${formData.lastName}`.trim();
            if (displayName) {
                updatePayload.name = displayName;
            }

            if (Object.keys(updatePayload).length > 0) {
                await supabase.from('profiles').update(updatePayload).eq('id', user.id);
            }

            alert("Onboarding Complete! Your profile is pending review.");
            navigate('/my-bids'); // Or another appropriate dashboard route
        } catch (err) {
            console.error("Submission error:", err);
            alert("Error submitting profile: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // UI Options
    const languageOptions = ["English", "Spanish", "French", "Portuguese", "Vietnamese", "Chinese", "Arabic"];
    const serviceOptions = ["Pipe repair / leak fix", "Water heater install", "Drain cleaning", "Fixture replacement", "Drywall patching", "Door & lock install", "Tile & grout repair", "Pressure washing", "Gutter cleaning", "Appliance install", "Painting — interior", "Painting — exterior", "Electrical repairs", "HVAC maintenance", "Roof repair", "Flooring install"];
    const clientTypes = ["Residential", "Commercial", "Property management", "Real estate / Flips"];
    const specializationOptions = ["Emergency / same-day", "Senior-friendly", "ADA / accessibility", "Eco / green products", "Historic homes", "New construction"];

    const mergedLanguages = [...new Set([...languageOptions, ...(formData.languages || [])])];
    const mergedServices = [...new Set([...serviceOptions, ...(formData.servicesOffered || [])])];

    return (
        <div className="onboarding-container">
            <div className="onboarding-header">
                <h2>Step {currentStep} of 10</h2>
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(currentStep / 10) * 100}%` }}></div>
                </div>
            </div>

            <div className="onboarding-content">
                {currentStep === 1 && (
                    <div className="step-card fade-in">
                        <h3>Identity & personal info</h3>
                        <p className="subtitle">This is what customers see first on your public profile. Use your real name and a professional photo.</p>
                        
                        <div className="form-grid">
                            <div className="input-group">
                                <label>First name *</label>
                                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="e.g. James" />
                            </div>
                            <div className="input-group">
                                <label>Last name *</label>
                                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="e.g. Rivera" />
                            </div>
                            <div className="input-group">
                                <label>Email address *</label>
                                <input type="email" value={user?.email || ''} readOnly style={{ opacity: 0.7 }} />
                            </div>
                            <div className="input-group">
                                <label>Phone number *</label>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="(713) 555-0192" />
                            </div>
                        </div>

                        <div className="input-group" style={{ marginTop: '1.5rem' }}>
                            <label>Trade title / specialty *</label>
                            <input type="text" name="tradeTitle" value={formData.tradeTitle} onChange={handleChange} placeholder="e.g. Master Plumber, Electrician, General Handyman" />
                            <small>This appears as your headline on your public profile.</small>
                        </div>

                        <div className="form-grid" style={{ marginTop: '1.5rem' }}>
                            <div className="input-group">
                                <label>Years of experience *</label>
                                <select name="yearsExperience" value={formData.yearsExperience} onChange={handleChange}>
                                    <option value="">Select</option>
                                    <option value="0-2">0 - 2 years</option>
                                    <option value="3-5">3 - 5 years</option>
                                    <option value="5-10">5 - 10 years</option>
                                    <option value="10+">10+ years</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Business type *</label>
                                <select name="businessType" value={formData.businessType} onChange={handleChange}>
                                    <option value="">Select</option>
                                    <option value="Solo / Independent">Solo / Independent</option>
                                    <option value="LLC / Corporation">LLC / Corporation</option>
                                </select>
                            </div>
                        </div>

                        <div className="input-group" style={{ marginTop: '1.5rem' }}>
                            <label>Business name (optional if different from your name)</label>
                            <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} placeholder="e.g. Rivera Plumbing LLC" />
                        </div>

                        <div className="input-group" style={{ marginTop: '1.5rem' }}>
                            <label>Bio / professional summary *</label>
                            <textarea name="bio" rows="4" value={formData.bio} onChange={handleChange} placeholder="Describe your experience, what you specialize in, your service area, and what makes you stand out. (150-300 words recommended)"></textarea>
                            <small>Write in first person. This is the first thing clients read — make it count.</small>
                        </div>

                        <div className="input-group" style={{ marginTop: '1.5rem' }}>
                            <label>Languages spoken *</label>
                            <div className="checkbox-grid">
                                {mergedLanguages.map(lang => (
                                    <label key={lang} className={`checkbox-pill ${formData.languages.includes(lang) ? 'selected' : ''}`}>
                                        <input type="checkbox" checked={formData.languages.includes(lang)} onChange={() => handleCheckboxArray('languages', lang)} />
                                        {lang}
                                    </label>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                <input type="text" placeholder="Add another language..." value={newLanguage} onChange={(e) => setNewLanguage(e.target.value)} style={{ flex: 1, padding: '0.875rem 1rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', color: 'white' }} />
                                <button type="button" className="btn btn-secondary" onClick={() => { if(newLanguage.trim()) { setFormData(prev => ({...prev, languages: [...new Set([...prev.languages, newLanguage.trim()]) ]})); setNewLanguage(''); } }}>Add</button>
                            </div>
                        </div>

                        <div className="input-group" style={{ marginTop: '1.5rem' }}>
                            <label>Profile photo *</label>
                            <div className="upload-box dashed">
                                {formData.profilePhoto ? (
                                    <img src={formData.profilePhoto} alt="Profile" className="preview-img" style={{maxHeight:'100px', borderRadius:'8px'}} />
                                ) : (
                                    <div className="upload-content">
                                        <Upload size={32} />
                                        <p><strong>Upload a professional headshot</strong></p>
                                        <small>JPG or PNG • Square crop preferred</small>
                                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'profilePhoto')} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="step-card fade-in">
                        <h3>Services offered</h3>
                        <p className="subtitle">Select all the services you provide. Your primary trade will be highlighted on your profile.</p>

                        <div className="input-group">
                            <label>Primary trade category *</label>
                            <select name="primaryTrade" value={formData.primaryTrade} onChange={handleChange}>
                                <option value="">Select your main trade</option>
                                <option value="Appliance Repair">Appliance Repair</option>
                                <option value="Carpentry">Carpentry</option>
                                <option value="Cleaning">Cleaning</option>
                                <option value="Electrical">Electrical</option>
                                <option value="Flooring">Flooring</option>
                                <option value="General Contractor">General Contractor</option>
                                <option value="Handyman">Handyman</option>
                                <option value="HVAC">HVAC</option>
                                <option value="Landscaping">Landscaping</option>
                                <option value="Masonry">Masonry</option>
                                <option value="Moving">Moving</option>
                                <option value="Painting">Painting</option>
                                <option value="Pest Control">Pest Control</option>
                                <option value="Plumbing">Plumbing</option>
                                <option value="Pool Maintenance">Pool Maintenance</option>
                                <option value="Roofing">Roofing</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="input-group" style={{ marginTop: '1.5rem' }}>
                            <label>All services you offer *</label>
                            <div className="checkbox-grid services-grid">
                                {mergedServices.map(service => (
                                    <label key={service} className={`checkbox-pill ${formData.servicesOffered.includes(service) ? 'selected' : ''}`}>
                                        <input type="checkbox" checked={formData.servicesOffered.includes(service)} onChange={() => handleCheckboxArray('servicesOffered', service)} />
                                        {service}
                                    </label>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                <input type="text" placeholder="Add specific service..." value={newService} onChange={(e) => setNewService(e.target.value)} style={{ flex: 1, padding: '0.875rem 1rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', color: 'white' }} />
                                <button type="button" className="btn btn-secondary" onClick={() => { if(newService.trim()) { setFormData(prev => ({...prev, servicesOffered: [...new Set([...prev.servicesOffered, newService.trim()]) ]})); setNewService(''); } }}>Add</button>
                            </div>
                        </div>

                        <div className="input-group" style={{ marginTop: '1.5rem' }}>
                            <label>Additional services (not listed above)</label>
                            <textarea name="additionalServices" value={formData.additionalServices} onChange={handleChange} rows="3" placeholder="List any other services you offer, separated by commas"></textarea>
                        </div>

                        <div className="input-group" style={{ marginTop: '1.5rem' }}>
                            <label>Client type *</label>
                            <div className="checkbox-grid">
                                {clientTypes.map(type => (
                                    <label key={type} className={`checkbox-pill ${formData.clientType.includes(type) ? 'selected' : ''}`}>
                                        <input type="checkbox" checked={formData.clientType.includes(type)} onChange={() => handleCheckboxArray('clientType', type)} />
                                        {type}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="input-group" style={{ marginTop: '1.5rem' }}>
                            <label>Specializations (select all that apply)</label>
                            <div className="checkbox-grid">
                                {specializationOptions.map(spec => (
                                    <label key={spec} className={`checkbox-pill ${formData.specializations.includes(spec) ? 'selected' : ''}`}>
                                        <input type="checkbox" checked={formData.specializations.includes(spec)} onChange={() => handleCheckboxArray('specializations', spec)} />
                                        {spec}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="step-card fade-in">
                        <h3>Trust & verification</h3>
                        <div className="info-banner" style={{ marginBottom: '1.5rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '1rem', borderRadius: '8px', color: '#60a5fa' }}>
                            Upload clear photos or scans of each document. Files are stored securely and never shared with clients — only the verification badge is shown.
                        </div>

                        <div className="input-group">
                            <label>Government-issued photo ID *</label>
                            <div className="upload-box dashed">
                                {formData.governmentIdFile ? (
                                    <div className="file-success" style={{flexDirection: 'column', padding: '1rem'}}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'}}><Check size={20} /> ID Uploaded</div>
                                        {typeof formData.governmentIdFile === 'string' && formData.governmentIdFile.startsWith('data:image') && (
                                            <img src={formData.governmentIdFile} alt="Government ID" style={{maxHeight:'150px', borderRadius:'8px', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.2)'}} />
                                        )}
                                        {typeof formData.governmentIdFile === 'string' && formData.governmentIdFile.startsWith('data:application/pdf') && (
                                            <div style={{padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1rem'}}>📄 PDF Document</div>
                                        )}
                                        <button type="button" onClick={() => setFormData({...formData, governmentIdFile: null})} className="btn" style={{background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.5)', fontSize: '0.85rem'}}>Remove & Re-upload</button>
                                    </div>
                                ) : (
                                    <div className="upload-content">
                                        <Upload size={32} />
                                        <p><strong>Driver's license or passport</strong></p>
                                        <small>JPG, PNG, or PDF • Max 10MB</small>
                                        <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'governmentIdFile')} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="form-grid" style={{ marginTop: '1.5rem' }}>
                            <div className="input-group">
                                <label>Trade license number (if applicable)</label>
                                <input type="text" name="tradeLicenseNumber" value={formData.tradeLicenseNumber} onChange={handleChange} placeholder="e.g. MP-4821" />
                                <small>Include state abbreviation if state-issued</small>
                            </div>
                            <div className="input-group">
                                <label>License expiry date</label>
                                <input type="date" name="licenseExpiry" value={formData.licenseExpiry} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="input-group" style={{ marginTop: '1.5rem' }}>
                            <label>License certificate upload</label>
                            <div className="upload-box dashed">
                                {formData.licenseFile ? (
                                    <div className="file-success" style={{flexDirection: 'column', padding: '1rem'}}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'}}><Check size={20} /> Certificate Uploaded</div>
                                        {typeof formData.licenseFile === 'string' && formData.licenseFile.startsWith('data:image') && (
                                            <img src={formData.licenseFile} alt="License Certificate" style={{maxHeight:'150px', borderRadius:'8px', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.2)'}} />
                                        )}
                                        {typeof formData.licenseFile === 'string' && formData.licenseFile.startsWith('data:application/pdf') && (
                                            <div style={{padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1rem'}}>📄 PDF Document</div>
                                        )}
                                        <button type="button" onClick={() => setFormData({...formData, licenseFile: null})} className="btn" style={{background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.5)', fontSize: '0.85rem'}}>Remove & Re-upload</button>
                                    </div>
                                ) : (
                                    <div className="upload-content">
                                        <Upload size={32} />
                                        <p><strong>Upload license document</strong></p>
                                        <small>JPG, PNG, or PDF</small>
                                        <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'licenseFile')} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 4 && (
                    <div className="step-card fade-in">
                        <h3>Insurance & Safety</h3>
                        
                        <div className="input-group">
                            <label>General liability insurance *</label>
                            <div className="form-grid">
                                <input type="text" name="insuranceProvider" value={formData.insuranceProvider} onChange={handleChange} placeholder="Insurance provider name" />
                                <input type="text" name="insuranceCoverage" value={formData.insuranceCoverage} onChange={handleChange} placeholder="Coverage amount (e.g. $1,000,000)" />
                            </div>
                        </div>

                        <div className="input-group" style={{ marginTop: '1.5rem' }}>
                            <div className="upload-box dashed" style={{ padding: '1.5rem' }}>
                                {formData.coiFile ? (
                                    <div className="file-success" style={{flexDirection: 'column', padding: '1rem'}}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'}}><Check size={20} /> COI Uploaded</div>
                                        {typeof formData.coiFile === 'string' && formData.coiFile.startsWith('data:image') && (
                                            <img src={formData.coiFile} alt="COI Certificate" style={{maxHeight:'150px', borderRadius:'8px', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.2)'}} />
                                        )}
                                        {typeof formData.coiFile === 'string' && formData.coiFile.startsWith('data:application/pdf') && (
                                            <div style={{padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1rem'}}>📄 PDF Document</div>
                                        )}
                                        <button type="button" onClick={() => setFormData({...formData, coiFile: null})} className="btn" style={{background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.5)', fontSize: '0.85rem'}}>Remove & Re-upload</button>
                                    </div>
                                ) : (
                                    <div className="upload-content">
                                        <div style={{ color: '#3b82f6', marginBottom: '0.5rem' }}>🛡️</div>
                                        <p><strong>Upload certificate of insurance (COI)</strong></p>
                                        <small>PDF preferred</small>
                                        <input type="file" accept="application/pdf,image/*" onChange={(e) => handleFileUpload(e, 'coiFile')} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="input-group" style={{ marginTop: '2rem' }}>
                            <label>Surety bond</label>
                            <div className="toggle-switch">
                                <div className="toggle-switch-label">
                                    <div>I am bonded</div>
                                    <small>Provides additional financial protection to clients</small>
                                </div>
                                <label className="switch">
                                    <input type="checkbox" checked={formData.isBonded} onChange={() => handleToggle('isBonded')} />
                                    <span className="slider"></span>
                                </label>
                            </div>
                        </div>

                        <div className="input-group" style={{ marginTop: '2rem' }}>
                            <label>Background check consent *</label>
                            <div className="bg-check-banner">
                                FixIt Genie runs background checks through Checkr. By continuing, you authorize us to run a background screening. Results are confidential.
                            </div>
                            
                            <label className="checkbox-pill" style={{ padding: '1rem', background: 'transparent' }}>
                                <input type="checkbox" checked={formData.backgroundConsent} onChange={() => handleToggle('backgroundConsent')} style={{ width: '1.2rem', height: '1.2rem' }} />
                                <span style={{ marginLeft: '0.5rem', fontWeight: '500' }}>I authorize FixIt Genie to run a background check on my behalf via Checkr as part of the verification process.</span>
                            </label>
                        </div>
                    </div>
                )}
                
                {currentStep === 5 && (
                    <div className="step-card fade-in">
                        <h3>Pricing & payment</h3>
                        <p className="subtitle">Transparent pricing builds trust. You can update these at any time from your dashboard.</p>

                        <div className="form-grid">
                            <div className="input-group">
                                <label>Service call / trip fee</label>
                                <input type="number" name="serviceCallFee" value={formData.serviceCallFee} onChange={handleChange} placeholder="65" />
                                <small>Charged just to show up</small>
                            </div>
                            <div className="input-group">
                                <label>Standard hourly rate *</label>
                                <input type="number" name="hourlyRate" value={formData.hourlyRate} onChange={handleChange} placeholder="95" />
                                <small>Per hour on-site</small>
                            </div>
                            <div className="input-group">
                                <label>Emergency / after-hours rate</label>
                                <input type="number" name="emergencyRate" value={formData.emergencyRate} onChange={handleChange} placeholder="145" />
                                <small>Nights, weekends, holidays</small>
                            </div>
                        </div>

                        <div className="input-group" style={{ marginTop: '1.5rem' }}>
                            <label>Free estimates? *</label>
                            <select name="freeEstimates" value={formData.freeEstimates} onChange={handleChange}>
                                <option value="">Select</option>
                                <option value="Yes, always">Yes, always free estimates</option>
                                <option value="Yes, phone only">Yes, but only over the phone/video</option>
                                <option value="No, fee applied to job">No, but estimate fee is applied to job if hired</option>
                                <option value="No, flat fee">No, standard estimate fee applies</option>
                            </select>
                        </div>

                        <div className="input-group" style={{ marginTop: '1.5rem' }}>
                            <label>Minimum job amount</label>
                            <input type="number" name="minimumJobAmount" value={formData.minimumJobAmount} onChange={handleChange} placeholder="e.g. 100" />
                            <small>Leave blank if no minimum</small>
                        </div>

                        <div className="input-group" style={{ marginTop: '1.5rem' }}>
                            <label>Payment methods accepted *</label>
                            <div className="checkbox-grid">
                                {paymentOptions.map(method => (
                                    <label key={method} className={`checkbox-pill ${formData.paymentMethods.includes(method) ? 'selected' : ''}`}>
                                        <input type="checkbox" checked={formData.paymentMethods.includes(method)} onChange={() => handleCheckboxArray('paymentMethods', method)} />
                                        {method}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="input-group" style={{ marginTop: '1.5rem' }}>
                            <label>Labor warranty *</label>
                            <select name="laborWarranty" value={formData.laborWarranty} onChange={handleChange}>
                                <option value="">Select</option>
                                <option value="No warranty">No warranty</option>
                                <option value="30 days">30 days</option>
                                <option value="90 days">90 days</option>
                                <option value="6 months">6 months</option>
                                <option value="1 year">1 year</option>
                                <option value="Lifetime">Lifetime guarantee</option>
                            </select>
                            <small>Applies to your labor. Manufacturer warranties cover parts separately.</small>
                        </div>

                        <div className="input-group" style={{ marginTop: '1.5rem' }}>
                            <label>Satisfaction guarantee policy <span style={{fontWeight: 'normal', color: 'var(--text-muted)'}}>(optional)</span></label>
                            <textarea name="satisfactionGuarantee" rows="3" value={formData.satisfactionGuarantee} onChange={handleChange} placeholder="Describe your guarantee — e.g. 'If you're not satisfied, I'll return and fix it at no charge within 7 days'"></textarea>
                        </div>
                    </div>
                )}
                
                {currentStep === 6 && (
                    <div className="step-card fade-in">
                        <h3>Availability</h3>
                        <p className="subtitle">Let clients know when you're available. You can update your schedule anytime from your dashboard.</p>

                        <div className="input-group">
                            <label>Days available *</label>
                            <div className="day-picker">
                                {dayOptions.map(day => (
                                    <div 
                                        key={day} 
                                        className={`day-box ${formData.daysAvailable.includes(day) ? 'selected' : ''}`}
                                        onClick={() => handleCheckboxArray('daysAvailable', day)}
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="form-grid" style={{ marginTop: '1.5rem' }}>
                            <div className="input-group">
                                <label>Start time *</label>
                                <select name="startTime" value={formData.startTime} onChange={handleChange}>
                                    {timeOptions.map(time => <option key={time} value={time}>{time}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>End time *</label>
                                <select name="endTime" value={formData.endTime} onChange={handleChange}>
                                    {timeOptions.map(time => <option key={time} value={time}>{time}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="input-group" style={{ marginTop: '2rem' }}>
                            <label>Special availability options</label>
                            <div className="options-list">
                                <div className="toggle-switch">
                                    <div className="toggle-switch-label">
                                        <div>Available for same-day bookings</div>
                                        <small>Clients can book you for today</small>
                                    </div>
                                    <label className="switch">
                                        <input type="checkbox" checked={formData.sameDayBookings} onChange={() => handleToggle('sameDayBookings')} />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                                <div className="toggle-switch">
                                    <div className="toggle-switch-label">
                                        <div>24/7 emergency service</div>
                                        <small>Available nights and weekends for urgent calls</small>
                                    </div>
                                    <label className="switch">
                                        <input type="checkbox" checked={formData.emergencyService} onChange={() => handleToggle('emergencyService')} />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                                <div className="toggle-switch">
                                    <div className="toggle-switch-label">
                                        <div>Accept weekend bookings</div>
                                        <small>Saturdays and/or Sundays</small>
                                    </div>
                                    <label className="switch">
                                        <input type="checkbox" checked={formData.acceptWeekend} onChange={() => handleToggle('acceptWeekend')} />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                                <div className="toggle-switch">
                                    <div className="toggle-switch-label">
                                        <div>Holiday availability</div>
                                        <small>Available on public holidays (emergency premium applies)</small>
                                    </div>
                                    <label className="switch">
                                        <input type="checkbox" checked={formData.holidayAvailability} onChange={() => handleToggle('holidayAvailability')} />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="input-group" style={{ marginTop: '2rem' }}>
                            <label>Advance notice required</label>
                            <select name="advanceNotice" value={formData.advanceNotice} onChange={handleChange}>
                                <option value="Same day is fine">Same day is fine</option>
                                <option value="1 day notice">1 day notice</option>
                                <option value="2 days notice">2 days notice</option>
                                <option value="3+ days notice">3+ days notice</option>
                                <option value="1 week notice">1 week notice</option>
                            </select>
                        </div>

                        <div className="input-group" style={{ marginTop: '1.5rem' }}>
                            <label>Maximum jobs per day</label>
                            <input type="number" name="maxJobsPerDay" value={formData.maxJobsPerDay} onChange={handleChange} placeholder="e.g. 3" />
                            <small>Helps prevent overbooking. Leave blank for unlimited.</small>
                        </div>
                    </div>
                )}
                
                {currentStep === 7 && (
                    <div className="step-card fade-in">
                        <h3>Service Area</h3>
                        
                        <div className="form-grid">
                            <div className="input-group">
                                <label>Primary city *</label>
                                <input type="text" name="primaryCity" value={formData.primaryCity} onChange={handleChange} placeholder="e.g. Cypress" />
                            </div>
                            <div className="input-group">
                                <label>State *</label>
                                <select name="stateRegion" value={formData.stateRegion} onChange={handleChange}>
                                    <option value="TX — Texas">TX — Texas</option>
                                    <option value="CA — California">CA — California</option>
                                    <option value="FL — Florida">FL — Florida</option>
                                    <option value="NY — New York">NY — New York</option>
                                </select>
                            </div>
                        </div>

                        <div className="input-group" style={{ marginTop: '1.5rem' }}>
                            <label>Home / base zip code *</label>
                            <input type="text" name="baseZipCode" value={formData.baseZipCode} onChange={handleChange} placeholder="77429" maxLength={5} />
                            <small>Used to calculate travel distance — not shown publicly.</small>
                        </div>

                        <div className="input-group" style={{ marginTop: '2rem' }}>
                            <label>Travel radius *</label>
                            <div className="range-container">
                                <input 
                                    type="range" 
                                    name="travelRadius" 
                                    min="5" 
                                    max="100" 
                                    step="5" 
                                    value={formData.travelRadius} 
                                    onChange={handleChange} 
                                />
                                <div className="range-value">{formData.travelRadius} miles</div>
                            </div>
                        </div>

                        <div className="input-group" style={{ marginTop: '2rem' }}>
                            <label>Other cities / areas you serve <span style={{fontWeight: 'normal', color: 'var(--text-muted)'}}>(optional)</span></label>
                            <textarea name="otherCities" rows="3" value={formData.otherCities} onChange={handleChange} placeholder="e.g. Katy, Spring, Tomball, Northwest Houston — separate with commas"></textarea>
                        </div>

                        <div className="input-group" style={{ marginTop: '1.5rem' }}>
                            <label>Travel fee policy *</label>
                            <select name="travelFeePolicy" value={formData.travelFeePolicy} onChange={handleChange}>
                                <option value="Always free">Always free</option>
                                <option value="Free within 15 miles, $1/mile after">Free within 15 miles, $1/mile after</option>
                                <option value="Free within 25 miles, flat fee after">Free within 25 miles, flat fee after</option>
                                <option value="Flat travel fee for all jobs">Flat travel fee for all jobs</option>
                            </select>
                        </div>

                        <div className="input-group" style={{ marginTop: '2rem' }}>
                            <label>Will you travel outside your stated area for large jobs?</label>
                            <div className="toggle-switch" style={{ marginTop: '0.5rem', background: 'transparent', padding: '1rem 0' }}>
                                <div className="toggle-switch-label">
                                    <div>Yes, for larger projects I can travel further</div>
                                </div>
                                <label className="switch">
                                    <input type="checkbox" checked={formData.travelForLargeJobs} onChange={() => handleToggle('travelForLargeJobs')} />
                                    <span className="slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 8 && (
                    <div className="step-card fade-in">
                        <h3>Portfolio</h3>
                        <p className="subtitle">Profiles with photos get 4× more clicks. Upload before/after photos of your best work.<br/>
                        Tip: Photograph the problem first, then the completed fix. Include a variety of service types to show your range.</p>

                        <div className="input-group">
                            <label>Project photos *</label>
                            <small style={{marginBottom:'1rem'}}>Upload at least 4 photos. Before/after pairs are highly recommended. JPG or PNG • Max 10MB each • Up to 30 photos total</small>
                            <div className="photo-grid">
                                {formData.projectPhotos.map((photoUrl, index) => (
                                    <div key={index} className="photo-upload-box" style={{ borderColor: 'transparent' }}>
                                        <img src={photoUrl} alt={`Project ${index + 1}`} className="photo-preview" />
                                        <button 
                                            type="button" 
                                            onClick={(e) => { e.preventDefault(); handleRemovePhoto(index); }} 
                                            className="close-btn" 
                                            style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '0.2rem', color: 'white' }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                {/* Generate empty boxes to show a minimum of 8 placeholders visually if under 8 */}
                                {Array.from({ length: Math.max(8 - formData.projectPhotos.length, 1) }).map((_, i) => (
                                    <div key={`empty-${i}`} className="photo-upload-box" style={{ display: formData.projectPhotos.length >= 30 ? 'none' : 'flex' }}>
                                        <Plus className="icon" />
                                        <span>Add photo</span>
                                        <input type="file" accept="image/*" onChange={handleAddPhoto} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="input-group" style={{ marginTop: '2rem' }}>
                            <label>Project video <span style={{fontWeight: 'normal', color: 'var(--text-muted)'}}>(optional — highly recommended)</span></label>
                            <input type="text" name="projectVideoLink" value={formData.projectVideoLink} onChange={handleChange} placeholder="Paste a YouTube or Vimeo link to a job walkthrough video" />
                            <small>Even a 60-second phone video dramatically increases trust.</small>
                        </div>
                        
                        <div className="input-group" style={{ marginTop: '1.5rem' }}>
                            <label>Featured project description <span style={{fontWeight: 'normal', color: 'var(--text-muted)'}}>(optional)</span></label>
                            <textarea name="featuredProjectDesc" rows="3" value={formData.featuredProjectDesc} onChange={handleChange} placeholder="Tell us about a project you're particularly proud of..."></textarea>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '3rem 0' }} />

                        <h3>Credentials & work history</h3>
                        <p className="subtitle">List your professional certifications and past employment. This builds credibility and helps with search rankings.</p>

                        <div className="input-group">
                            <label>Professional licenses & certifications</label>
                            {formData.certifications.map((cert, index) => (
                                <div key={cert.id} className="dynamic-item">
                                    <div className="dynamic-item-header">
                                        <span>Certification #{index + 1}</span>
                                        <button type="button" onClick={() => handleDynamicRemove('certifications', cert.id)} className="close-btn"><X size={18} /></button>
                                    </div>
                                    <div className="form-grid">
                                        <div className="input-group">
                                            <label>Certification name</label>
                                            <input type="text" value={cert.name} onChange={(e) => handleDynamicChange('certifications', cert.id, 'name', e.target.value)} placeholder="e.g. OSHA 10-hour" />
                                        </div>
                                        <div className="input-group">
                                            <label>Issuing body</label>
                                            <input type="text" value={cert.issuer} onChange={(e) => handleDynamicChange('certifications', cert.id, 'issuer', e.target.value)} placeholder="e.g. U.S. Dept. of Labor" />
                                        </div>
                                        <div className="input-group">
                                            <label>Issue date</label>
                                            <input type="date" value={cert.issueDate} onChange={(e) => handleDynamicChange('certifications', cert.id, 'issueDate', e.target.value)} />
                                        </div>
                                        <div className="input-group">
                                            <label>Expiry date <span style={{fontWeight: 'normal', color: 'var(--text-muted)'}}>(if applicable)</span></label>
                                            <input type="date" value={cert.expiryDate} onChange={(e) => handleDynamicChange('certifications', cert.id, 'expiryDate', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="input-group" style={{ marginTop: '1.5rem' }}>
                                        <label>Upload certificate <span style={{fontWeight: 'normal', color: 'var(--text-muted)'}}>(optional)</span></label>
                                        <div className="upload-box dashed" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center' }}>
                                            {cert.file ? (
                                                <div className="file-success" style={{flexDirection: 'column', gap: '0.5rem'}}>
                                                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Check size={20} /> Certificate Uploaded</div>
                                                    {typeof cert.file === 'string' && cert.file.startsWith('data:image') && (
                                                        <img src={cert.file} alt="Certificate" style={{maxHeight:'80px', borderRadius:'4px', marginTop: '0.5rem'}} />
                                                    )}
                                                    {typeof cert.file === 'string' && cert.file.startsWith('data:application/pdf') && (
                                                        <div style={{fontSize: '0.8rem', color: '#9ca3af'}}>📄 PDF Document</div>
                                                    )}
                                                    <button type="button" onClick={() => handleDynamicChange('certifications', cert.id, 'file', null)} className="btn" style={{background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.5)', fontSize: '0.75rem', padding: '0.3rem 0.6rem', marginTop: '0.5rem'}}>Remove & Re-upload</button>
                                                </div>
                                            ) : (
                                                <div className="upload-content" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Upload size={20} style={{ color: '#60a5fa' }} />
                                                    <span>Click to upload certificate document</span>
                                                    <input type="file" accept="image/*,.pdf" onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => handleDynamicChange('certifications', cert.id, 'file', reader.result);
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button type="button" className="add-btn" onClick={() => handleDynamicAdd('certifications', { name: '', issuer: '', issueDate: '', expiryDate: '', file: null })}>
                                <Plus size={18} /> Add another certification
                            </button>
                        </div>

                        <div className="input-group" style={{ marginTop: '2.5rem' }}>
                            <label>Work history <span style={{fontWeight: 'normal', color: 'var(--text-muted)'}}>(optional but recommended)</span></label>
                            {formData.workHistory.map((work, index) => (
                                <div key={work.id} className="dynamic-item">
                                    <div className="dynamic-item-header">
                                        <span>Position #{index + 1}</span>
                                        <button type="button" onClick={() => handleDynamicRemove('workHistory', work.id)} className="close-btn"><X size={18} /></button>
                                    </div>
                                    <div className="form-grid">
                                        <div className="input-group">
                                            <label>Company / employer</label>
                                            <input type="text" value={work.company} onChange={(e) => handleDynamicChange('workHistory', work.id, 'company', e.target.value)} placeholder="e.g. Roto-Rooter" />
                                        </div>
                                        <div className="input-group">
                                            <label>Job title</label>
                                            <input type="text" value={work.title} onChange={(e) => handleDynamicChange('workHistory', work.id, 'title', e.target.value)} placeholder="e.g. Senior Plumber" />
                                        </div>
                                        <div className="input-group">
                                            <label>Start year</label>
                                            <input type="number" value={work.startYear} onChange={(e) => handleDynamicChange('workHistory', work.id, 'startYear', e.target.value)} placeholder="2014" min="1950" max="2030" />
                                        </div>
                                        <div className="input-group">
                                            <label>End year <span style={{fontWeight: 'normal', color: 'var(--text-muted)'}}>(leave blank if current)</span></label>
                                            <input type="number" value={work.endYear} onChange={(e) => handleDynamicChange('workHistory', work.id, 'endYear', e.target.value)} placeholder="2018" min="1950" max="2030" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button type="button" className="add-btn" onClick={() => handleDynamicAdd('workHistory', { company: '', title: '', startYear: '', endYear: '' })}>
                                <Plus size={18} /> Add another position
                            </button>
                        </div>

                        <div className="input-group" style={{ marginTop: '2.5rem' }}>
                            <label>Education / trade school <span style={{fontWeight: 'normal', color: 'var(--text-muted)'}}>(optional)</span></label>
                            <input type="text" name="education" value={formData.education} onChange={handleChange} placeholder="e.g. Houston Community College — Plumbing Technology, 2012" />
                        </div>
                    </div>
                )}

                {currentStep === 9 && (
                    <div className="step-card fade-in">
                        <h3>Reviews & profile stats</h3>
                        <p className="subtitle">Import or link existing reviews from other platforms to give your new profile an instant credibility boost.<br/>
                        New to FixIt Genie? No reviews yet is completely fine — your verification badges do the heavy lifting at first. You can also import from Google or Yelp.</p>

                        <div className="form-grid">
                            <div className="input-group">
                                <label>Google Business Profile URL <span style={{fontWeight: 'normal', color: 'var(--text-muted)'}}>(optional)</span></label>
                                <input type="text" name="googleUrl" value={formData.googleUrl} onChange={handleChange} placeholder="https://g.page/your-business-name" />
                                <small>We'll display your Google rating alongside FixIt Genie reviews.</small>
                            </div>
                            <div className="input-group">
                                <label>Yelp profile URL <span style={{fontWeight: 'normal', color: 'var(--text-muted)'}}>(optional)</span></label>
                                <input type="text" name="yelpUrl" value={formData.yelpUrl} onChange={handleChange} placeholder="https://yelp.com/biz/your-business" />
                            </div>
                        </div>

                        <div className="input-group" style={{ marginTop: '2rem' }}>
                            <label>Do you have existing customer testimonials?</label>
                            <small style={{marginBottom:'1rem'}}>Paste up to 3 short testimonials from past customers. Include their name and city if they've given permission. These will be reviewed before publishing.</small>
                            
                            {formData.testimonials.map((testi, index) => (
                                <div key={testi.id} className="dynamic-item" style={{ padding: '1rem', marginBottom: '1rem' }}>
                                    <div className="dynamic-item-header" style={{ marginBottom: '0.5rem' }}>
                                        <span>Testimonial #{index + 1}</span>
                                        <button type="button" onClick={() => handleDynamicRemove('testimonials', testi.id)} className="close-btn"><X size={18} /></button>
                                    </div>
                                    <textarea 
                                        rows="3" 
                                        value={testi.text} 
                                        onChange={(e) => handleDynamicChange('testimonials', testi.id, 'text', e.target.value)} 
                                        placeholder={`"They did a fantastic job fixing my plumbing..." - John D., Cypress`}
                                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '8px', color: 'white' }}
                                    ></textarea>
                                </div>
                            ))}
                            {formData.testimonials.length < 3 && (
                                <button type="button" className="add-btn" onClick={() => handleDynamicAdd('testimonials', { text: '' })}>
                                    <Plus size={18} /> Add another testimonial
                                </button>
                            )}
                        </div>

                        <div className="form-grid" style={{ marginTop: '2rem' }}>
                            <div className="input-group">
                                <label>Average response time *</label>
                                <select name="averageResponseTime" value={formData.averageResponseTime} onChange={handleChange}>
                                    <option value="Within 1 hour">Within 1 hour</option>
                                    <option value="Within 2 hours">Within 2 hours</option>
                                    <option value="Same day">Same day</option>
                                    <option value="Next day">Next day</option>
                                    <option value="Within 48 hours">Within 48 hours</option>
                                </select>
                                <small>Be realistic — this metric affects your search ranking.</small>
                            </div>
                            <div className="input-group">
                                <label>Approximate jobs completed to date</label>
                                <select name="jobsCompleted" value={formData.jobsCompleted} onChange={handleChange}>
                                    <option value="">Select</option>
                                    <option value="0-10">0 - 10 jobs</option>
                                    <option value="11-50">11 - 50 jobs</option>
                                    <option value="51-100">51 - 100 jobs</option>
                                    <option value="101-500">101 - 500 jobs</option>
                                    <option value="500+">500+ jobs</option>
                                    <option value="1000+">1000+ jobs</option>
                                </select>
                                <small>Shown on profile as credibility signal.</small>
                            </div>
                        </div>

                        <div className="input-group" style={{ marginTop: '2.5rem' }}>
                            <label>Social media profiles <span style={{fontWeight: 'normal', color: 'var(--text-muted)'}}>(optional)</span></label>
                            <div className="form-grid" style={{ marginTop: '0.5rem' }}>
                                <div className="input-group">
                                    <input type="text" name="facebookUrl" value={formData.facebookUrl} onChange={handleChange} placeholder="Facebook (https://facebook.com/...)" />
                                </div>
                                <div className="input-group">
                                    <input type="text" name="instagramUrl" value={formData.instagramUrl} onChange={handleChange} placeholder="Instagram (https://instagram.com/...)" />
                                </div>
                                <div className="input-group">
                                    <input type="text" name="websiteUrl" value={formData.websiteUrl} onChange={handleChange} placeholder="Website (https://yoursite.com)" />
                                </div>
                                <div className="input-group">
                                    <input type="text" name="youtubeTiktokUrl" value={formData.youtubeTiktokUrl} onChange={handleChange} placeholder="YouTube / TikTok channel" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {currentStep === 10 && (
                    <div className="step-card fade-in">
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{ background: 'rgba(34, 197, 94, 0.2)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                <Check size={40} color="#22c55e" />
                            </div>
                            <h3>You're almost done!</h3>
                            <p className="subtitle">Review your information and agree to our terms to finalize your professional profile.</p>
                        </div>

                        <div className="info-banner" style={{ marginBottom: '2rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1.5rem', borderRadius: '8px' }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: '#f3f4f6' }}>Profile Summary</h4>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-muted)' }}>
                                <li style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={16} color="#60a5fa" /> Identity & Services configured</li>
                                <li style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={16} color="#60a5fa" /> Trust & Verification documents uploaded</li>
                                <li style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={16} color="#60a5fa" /> Pricing & Availability set</li>
                                <li style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={16} color="#60a5fa" /> Service Area established</li>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={16} color="#60a5fa" /> Portfolio & Reviews added</li>
                            </ul>
                        </div>

                        <div className="input-group" style={{ marginTop: '2.5rem' }}>
                            <label className="checkbox-pill" style={{ padding: '1.25rem', background: 'transparent', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                                <input type="checkbox" checked={formData.agreedToTerms} onChange={() => handleToggle('agreedToTerms')} style={{ width: '1.2rem', height: '1.2rem' }} />
                                <span style={{ marginLeft: '0.75rem', fontWeight: '500', color: 'white' }}>I agree to the FixIt Genie Terms of Service and Privacy Policy.</span>
                            </label>
                            
                            <label className="checkbox-pill" style={{ padding: '1.25rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }}>
                                <input type="checkbox" checked={formData.certifyTrue} onChange={() => handleToggle('certifyTrue')} style={{ width: '1.2rem', height: '1.2rem' }} />
                                <span style={{ marginLeft: '0.75rem', fontWeight: '500', color: 'white' }}>I certify that all information and documents provided are accurate and true.</span>
                            </label>
                        </div>
                    </div>
                )}
            </div>

            <div className="onboarding-footer">
                <button 
                    className="btn-secondary" 
                    onClick={handleBack} 
                    disabled={currentStep === 1}
                    style={{ visibility: currentStep === 1 ? 'hidden' : 'visible' }}
                >
                    <ArrowLeft size={18} style={{ marginRight: '0.5rem' }} /> Back
                </button>
                
                {currentStep < 10 ? (
                    <button className="btn-primary" onClick={handleNext}>
                        Continue <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
                    </button>
                ) : (
                    <button 
                        className="btn-primary" 
                        onClick={submitOnboarding} 
                        disabled={!formData.agreedToTerms || !formData.certifyTrue || isSubmitting}
                        style={{ 
                            background: formData.agreedToTerms && formData.certifyTrue ? '#22c55e' : 'rgba(255,255,255,0.1)', 
                            border: formData.agreedToTerms && formData.certifyTrue ? 'none' : '1px solid rgba(255,255,255,0.2)',
                            color: formData.agreedToTerms && formData.certifyTrue ? 'white' : 'var(--text-muted)',
                            cursor: formData.agreedToTerms && formData.certifyTrue && !isSubmitting ? 'pointer' : 'not-allowed'
                        }}
                    >
                        {isSubmitting ? "Submitting..." : (
                            <>Submit Profile <Check size={18} style={{ marginLeft: '0.5rem' }} /></>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ProOnboarding;
