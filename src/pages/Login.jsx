import { useState } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const cleanEmail = formData.email?.trim();
            const cleanPassword = formData.password?.trim();

            if (!cleanEmail || !cleanPassword) {
                alert("Please fill in all fields");
                return;
            }

            console.log("Attempting login with:", cleanEmail);

            if (!login) {
                throw new Error("Auth system is not ready (login function missing)");
            }

            const result = await login(cleanEmail, cleanPassword);

            if (result && result.success) {
                const from = location.state?.from?.pathname || '/';
                navigate(cleanEmail === 'admin@fixit.com' ? '/admin' : from, { replace: true });
            } else {
                alert(result?.message || "Login failed without error message");
            }
        } catch (error) {
            console.error("Login Error:", error);
            alert("Something went wrong during login: " + error.message);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="icon-wrapper">
                        <LogIn size={40} />
                    </div>
                    <h1>Welcome Back</h1>
                    <p>Log in to access your account</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            placeholder="Enter your email"
                            required
                            value={formData.email}
                            onChange={handleInputChange}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                name="password"
                                placeholder="Enter your password"
                                required
                                value={formData.password}
                                onChange={handleInputChange}
                            />
                            <button type="button" className="password-toggle" onClick={togglePasswordVisibility}>
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div className="form-actions">
                        <Link to="/forgot-password" className="forgot-password">Forgot password?</Link>
                    </div>

                    <button type="submit" className="btn-primary login-btn">Log In</button>
                </form>

                <div className="login-footer">
                    <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
                </div>
            </div>
        </div>
    );
};

export default Login;
