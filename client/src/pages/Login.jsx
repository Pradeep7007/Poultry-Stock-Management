import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      if ((username === 'pms' && password === '26082006') || (username === 'pradeep' && password === '2006')) {
        toast.success('Sign in successful!');
        onLogin();
      } else {
        toast.error('Invalid credentials provided');
      }
    }, 1000);
  };

  return (
    <div className="d-flex w-100 vh-100 animate-fade-in" style={{ backgroundColor: 'var(--bg-color)' }}>
      {/* Left Side: Branding / Visual */}
      <div className="d-none d-lg-flex col-lg-6 col-xl-7 bg-primary flex-column justify-content-between p-5 position-relative overflow-hidden" 
           style={{ 
             background: 'linear-gradient(135deg, var(--primary) 0%, #3730A3 100%)',
           }}>
        
        {/* Background decorative elements */}
        <div className="position-absolute rounded-circle" style={{ width: '600px', height: '600px', background: 'rgba(255,255,255,0.03)', top: '-10%', right: '-10%' }}></div>
        <div className="position-absolute rounded-circle" style={{ width: '400px', height: '400px', background: 'rgba(255,255,255,0.05)', bottom: '-10%', left: '-5%' }}></div>

        <div className="position-relative z-1">
          <div className="d-flex align-items-center gap-3 mb-5">
            <div className="bg-white text-primary rounded-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
              <span className="fs-3">🐓</span>
            </div>
            <h3 className="text-white fw-bold m-0">PMS Pro</h3>
          </div>
        </div>

        <div className="position-relative z-1 mb-5 pb-5">
          <h1 className="text-white display-4 fw-bolder mb-4" style={{ letterSpacing: '-1px' }}>
            Next-gen Poultry<br />Management
          </h1>
          <p className="text-white fs-5 opacity-75 fw-light" style={{ maxWidth: '500px' }}>
            Elevate your farm's efficiency. Streamline egg production, batch tracking, and revenue analytics all in one intuitive platform.
          </p>
        </div>
        
        <div className="position-relative z-1 text-white opacity-50 small">
          &copy; {new Date().getFullYear()} Poultry Management Systems. All rights reserved.
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="col-12 col-lg-6 col-xl-5 d-flex align-items-center justify-content-center p-4 p-md-5">
        <div className="w-100" style={{ maxWidth: '420px' }}>
          
          <div className="d-lg-none d-flex align-items-center gap-3 mb-5 justify-content-center">
            <div className="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
              <span className="fs-4">🐓</span>
            </div>
            <h3 className="text-main fw-bold m-0">PMS Pro</h3>
          </div>

          <div className="mb-5">
            <h2 className="fw-bold mb-2">Welcome back</h2>
            <p className="text-muted">Please enter your credentials to access your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="d-flex flex-column gap-4">
            
            {/* Floating Label Input for Username */}
            <div className="position-relative">
              <label className="form-label small fw-semibold text-muted mb-2 d-flex align-items-center gap-2">
                <Mail size={16} /> Username
              </label>
              <input 
                type="text" 
                className="form-control-modern w-100" 
                placeholder="Enter Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            {/* Floating Label Input for Password */}
            <div className="position-relative">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label small fw-semibold text-muted mb-0 d-flex align-items-center gap-2">
                  <Lock size={16} /> Password
                </label>
                <a href="#!" className="small text-primary text-decoration-none fw-medium">Forgot password?</a>
              </div>
              <div className="position-relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="form-control-modern w-100 pe-5" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button"
                  className="btn border-0 position-absolute top-50 end-0 translate-middle-y text-muted"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="form-check d-flex align-items-center gap-2">
              <input 
                className="form-check-input mt-0" 
                type="checkbox" 
                id="rememberMe" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label className="form-check-label small text-muted" htmlFor="rememberMe" style={{ cursor: 'pointer' }}>
                Remember me for 30 days
              </label>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="btn-primary-modern w-100 py-3 mt-2 fs-6 d-flex justify-content-between px-4"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-100 text-center">
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Authenticating...
                </div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;
