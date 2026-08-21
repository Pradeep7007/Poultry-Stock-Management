import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, ArrowRight, User as UserIcon, UserPlus, KeyRound, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Login = ({ onLogin }) => {
  const { login, signup } = useAuth();

  const [mode, setMode] = useState('login'); // 'login', 'signup', or 'forgot'
  
  // Login Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Signup Form States
  const [fullName, setFullName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  // Forgot Password States
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const res = await login(username, password);
    setIsLoading(false);

    if (res.success) {
      toast.success('Sign in successful!');
      if (onLogin) onLogin();
    } else {
      toast.error(res.message || 'Invalid credentials provided');
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!signupUsername || !signupEmail || !signupPassword) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);

    const res = await signup({
      fullName,
      username: signupUsername,
      email: signupEmail,
      password: signupPassword
    });

    setIsLoading(false);

    if (res.success) {
      toast.success(res.message || 'Account created successfully!');
      if (onLogin) onLogin();
    } else {
      toast.error(res.message || 'Signup failed.');
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!forgotUsername || !forgotNewPassword) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        username: forgotUsername,
        newPassword: forgotNewPassword
      });
      setIsLoading(false);
      toast.success(response.data.message || 'Password reset successfully!');
      setUsername(forgotUsername);
      setMode('login');
    } catch (error) {
      setIsLoading(false);
      const errMsg = error.response?.data?.message || 'Failed to reset password.';
      toast.error(errMsg);
    }
  };

  return (
    <div className="d-flex w-100 vh-100 animate-fade-in" style={{ backgroundColor: 'var(--bg-color)' }}>
      {/* Left Side: Branding / Visual */}
      <div
        className="d-none d-lg-flex col-lg-6 col-xl-7 bg-primary flex-column justify-content-between p-5 position-relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, #3730A3 100%)'
        }}
      >
        {/* Background decorative elements */}
        <div
          className="position-absolute rounded-circle"
          style={{ width: '600px', height: '600px', background: 'rgba(255,255,255,0.03)', top: '-10%', right: '-10%' }}
        ></div>
        <div
          className="position-absolute rounded-circle"
          style={{ width: '400px', height: '400px', background: 'rgba(255,255,255,0.05)', bottom: '-10%', left: '-5%' }}
        ></div>

        <div className="position-relative z-1">
          <div className="d-flex align-items-center gap-3 mb-5">
            <div className="bg-white text-primary rounded-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
              <span className="fs-3">🐓</span>
            </div>
            <h3 className="text-white fw-bold m-0">PMS Poultry</h3>
          </div>
        </div>

        <div className="position-relative z-1 mb-5 pb-5">
          <h1 className="text-white display-4 fw-bolder mb-4" style={{ letterSpacing: '-1px' }}>
            Next-gen Poultry<br />Management
          </h1>
          <p className="text-white fs-5 opacity-75 fw-light" style={{ maxWidth: '500px' }}>
            Elevate your farm's efficiency. Streamline feed tracking, egg production, batch management, and revenue analytics all in one intuitive platform.
          </p>
        </div>

        <div className="position-relative z-1 text-white opacity-50 small">
          &copy; {new Date().getFullYear()} Poultry Management Systems. All rights reserved.
        </div>
      </div>

      {/* Right Side: Login & Signup Form */}
      <div className="col-12 col-lg-6 col-xl-5 d-flex align-items-center justify-content-center p-4 p-md-5 overflow-auto">
        <div className="w-100" style={{ maxWidth: '420px' }}>
          
          <div className="d-lg-none d-flex align-items-center gap-3 mb-4 justify-content-center">
            <div className="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
              <span className="fs-4">🐓</span>
            </div>
            <h3 className="text-main fw-bold m-0">PMS Poultry</h3>
          </div>

          {/* Mode Switcher Tabs */}
          {mode !== 'forgot' && (
            <div className="d-flex bg-light p-1 rounded-3 mb-4 border">
              <button
                type="button"
                className={`btn flex-fill py-2 fw-semibold btn-sm ${mode === 'login' ? 'btn-white shadow-sm text-primary bg-white' : 'text-muted border-0'}`}
                onClick={() => setMode('login')}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`btn flex-fill py-2 fw-semibold btn-sm ${mode === 'signup' ? 'btn-white shadow-sm text-primary bg-white' : 'text-muted border-0'}`}
                onClick={() => setMode('signup')}
              >
                Sign Up
              </button>
            </div>
          )}

          {mode === 'login' ? (
            <div>
              <div className="mb-4">
                <h2 className="fw-bold mb-1">Welcome back</h2>
                <p className="text-muted small">Please enter your credentials to access your account.</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="d-flex flex-column gap-3">
                <div className="position-relative">
                  <label className="form-label small fw-semibold text-muted mb-1 d-flex align-items-center gap-2">
                    <Mail size={16} /> Username or Email
                  </label>
                  <input
                    type="text"
                    className="form-control-modern w-100"
                    placeholder="e.g. pradeep or pms"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="position-relative">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label small fw-semibold text-muted mb-0 d-flex align-items-center gap-2">
                      <Lock size={16} /> Password
                    </label>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-primary small text-decoration-none fw-semibold"
                      onClick={() => { setForgotUsername(username); setMode('forgot'); }}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="position-relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
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

                <div className="d-flex justify-content-between align-items-center">
                  <div className="form-check d-flex align-items-center gap-2 m-0">
                    <input
                      className="form-check-input mt-0"
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <label className="form-check-label small text-muted" htmlFor="rememberMe" style={{ cursor: 'pointer' }}>
                      Remember me
                    </label>
                  </div>
                </div>

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
          ) : mode === 'forgot' ? (
            <div className="animate-fade-in">
              <div className="mb-4">
                <button
                  type="button"
                  className="btn btn-sm btn-light border mb-3 d-inline-flex align-items-center gap-1"
                  onClick={() => setMode('login')}
                >
                  <ArrowLeft size={16} /> Back to Sign In
                </button>
                <h2 className="fw-bold mb-1">Reset Password</h2>
                <p className="text-muted small">Enter your username or email address and choose a new password.</p>
              </div>

              <form onSubmit={handleResetSubmit} className="d-flex flex-column gap-3">
                <div className="position-relative">
                  <label className="form-label small fw-semibold text-muted mb-1 d-flex align-items-center gap-2">
                    <Mail size={16} /> Username or Email
                  </label>
                  <input
                    type="text"
                    className="form-control-modern w-100"
                    placeholder="Enter your username or email"
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="position-relative">
                  <label className="form-label small fw-semibold text-muted mb-1 d-flex align-items-center gap-2">
                    <KeyRound size={16} /> New Password
                  </label>
                  <div className="position-relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control-modern w-100 pe-5"
                      placeholder="Enter new password"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
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

                <button
                  type="submit"
                  className="btn-primary-modern w-100 py-3 mt-2 fs-6 d-flex justify-content-between px-4"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="w-100 text-center">
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Updating Password...
                    </div>
                  ) : (
                    <>
                      <span>Reset Password</span>
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <h2 className="fw-bold mb-1">Create an account</h2>
                <p className="text-muted small">Enter details to sign up as a new user.</p>
              </div>

              <form onSubmit={handleSignupSubmit} className="d-flex flex-column gap-3">
                <div className="position-relative">
                  <label className="form-label small fw-semibold text-muted mb-1 d-flex align-items-center gap-2">
                    <UserIcon size={16} /> Full Name (Optional)
                  </label>
                  <input
                    type="text"
                    className="form-control-modern w-100"
                    placeholder="Enter Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="position-relative">
                  <label className="form-label small fw-semibold text-muted mb-1 d-flex align-items-center gap-2">
                    <UserIcon size={16} /> Username <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control-modern w-100"
                    placeholder="Choose Username"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="position-relative">
                  <label className="form-label small fw-semibold text-muted mb-1 d-flex align-items-center gap-2">
                    <Mail size={16} /> Email Address <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control-modern w-100"
                    placeholder="name@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="position-relative">
                  <label className="form-label small fw-semibold text-muted mb-1 d-flex align-items-center gap-2">
                    <Lock size={16} /> Password <span className="text-danger">*</span>
                  </label>
                  <div className="position-relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control-modern w-100 pe-5"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
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

                <button
                  type="submit"
                  className="btn-primary-modern w-100 py-3 mt-2 fs-6 d-flex justify-content-between px-4"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="w-100 text-center">
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Creating account...
                    </div>
                  ) : (
                    <>
                      <span>Sign Up & Continue</span>
                      <UserPlus size={20} />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Login;
