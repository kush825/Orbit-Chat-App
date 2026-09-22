import React, { useState } from 'react';
import { MessageSquare, Sparkles, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';

const Login = ({ onSwitchToRegister, onBackToLanding }) => {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);


  // Forgot Password State
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [showSuccess3D, setShowSuccess3D] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setForgotSuccess('');
    setForgotLoading(true);

    try {
      if (forgotStep === 1) {
        // Request OTP
        const res = await api.post('/auth/forgot-password', { email: forgotEmail });
        setForgotSuccess(res.data.message || 'OTP sent to your email.');
        setForgotStep(2);
      } else {
        // Reset Password
        if (forgotNewPassword !== forgotConfirmPassword) {
          setError('Passwords do not match.');
          setForgotLoading(false);
          return;
        }

        const res = await api.post('/auth/reset-password', {
          email: forgotEmail,
          otp: forgotOtp,
          newPassword: forgotNewPassword
        });
        
        setShowSuccess3D(true);
        
        // After 4 seconds, switch back to login
        setTimeout(() => {
          setIsForgotPassword(false);
          setForgotStep(1);
          setForgotEmail('');
          setForgotOtp('');
          setForgotNewPassword('');
          setForgotConfirmPassword('');
          setForgotSuccess('');
          setShowSuccess3D(false);
          setError('');
        }, 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setForgotLoading(false);
    }
  };

  if (isForgotPassword) {
    return (
      <div className="auth-wrapper" style={{ justifyContent: 'center' }}>
        <div className="auth-orb auth-orb-1" style={{ opacity: 0.3 }}></div>
        <div className="auth-orb auth-orb-2" style={{ opacity: 0.3 }}></div>

        <div className="auth-card" style={{ position: 'relative' }}>
          <button 
            className="icon-btn" 
            onClick={() => { setIsForgotPassword(false); setForgotStep(1); setError(''); setForgotSuccess(''); }}
            style={{ position: 'absolute', top: '24px', left: '24px', width: '36px', height: '36px' }}
            title="Back to Login"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="auth-header">
            <h1 className="auth-title">Reset Password</h1>
            <p className="auth-subtitle">
              {showSuccess3D ? 'Successfully Reset!' : (forgotStep === 1 ? 'Enter your email to receive a recovery OTP.' : 'Enter the OTP and your new password.')}
            </p>
          </div>

          {showSuccess3D ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', perspective: '1000px' }}>
              <style>
                {`
                  @keyframes rotate3D {
                    0% { transform: rotateY(0deg) rotateX(10deg); }
                    50% { transform: rotateY(180deg) rotateX(-10deg); }
                    100% { transform: rotateY(360deg) rotateX(10deg); }
                  }
                  .success-3d-box {
                    width: 120px;
                    height: 120px;
                    background: linear-gradient(135deg, #34d399 0%, #059669 100%);
                    border-radius: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 20px 50px rgba(52, 211, 153, 0.4), inset 0 5px 15px rgba(255, 255, 255, 0.4);
                    animation: rotate3D 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                    transform-style: preserve-3d;
                  }
                  .success-3d-icon {
                    transform: translateZ(30px);
                    color: white;
                    filter: drop-shadow(0 10px 10px rgba(0,0,0,0.2));
                  }
                `}
              </style>
              <div className="success-3d-box">
                <div className="success-3d-icon">
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
              <h2 style={{ marginTop: '30px', color: '#34d399', fontWeight: 'bold', fontSize: '1.4rem', textShadow: '0 4px 10px rgba(52, 211, 153, 0.3)' }}>
                Password successfully updated
              </h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Returning to login...</p>
            </div>
          ) : (
            <>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '20px', textAlign: 'center' }}>
                  {error}
                </div>
              )}

              {forgotSuccess && (
                <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '20px', textAlign: 'center' }}>
                  {forgotSuccess}
                </div>
              )}

              <form onSubmit={handleForgotPasswordSubmit}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="your@email.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    disabled={forgotStep === 2}
                  />
                </div>

                {forgotStep === 2 && (
                  <>
                    <div className="form-group">
                      <label className="form-label">6-Digit OTP</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="123456"
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value)}
                        required
                        maxLength={6}
                        style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
                      />
                    </div>

                    <div className="form-group" style={{ position: 'relative' }}>
                      <label className="form-label">New Password</label>
                      <input
                        type={showForgotNewPassword ? 'text' : 'password'}
                        className="input-field"
                        placeholder="••••••••"
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        required
                        style={{ paddingRight: '40px' }}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)} 
                        style={{ position: 'absolute', right: '12px', top: '38px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        {showForgotNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <div className="form-group" style={{ position: 'relative' }}>
                      <label className="form-label">Confirm New Password</label>
                      <input
                        type={showForgotConfirmPassword ? 'text' : 'password'}
                        className="input-field"
                        placeholder="••••••••"
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        required
                        style={{ paddingRight: '40px' }}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)} 
                        style={{ position: 'absolute', right: '12px', top: '38px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        {showForgotConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </>
                )}

                <button type="submit" className="btn-primary" disabled={forgotLoading}>
                  {forgotLoading ? 'Processing...' : (forgotStep === 1 ? 'Send OTP' : 'Reset Password')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper" style={{ justifyContent: 'center' }}>
      {/* Animated Background Orbs (Optional, keeping them for consistency but less prominent) */}
      <div className="auth-orb auth-orb-1" style={{ opacity: 0.3 }}></div>
      <div className="auth-orb auth-orb-2" style={{ opacity: 0.3 }}></div>

      <div className="auth-card" style={{ position: 'relative' }}>
        <button 
          className="icon-btn" 
          onClick={onBackToLanding}
          style={{ position: 'absolute', top: '24px', left: '24px', width: '36px', height: '36px' }}
          title="Back to Home"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="auth-header">
          <div className="auth-logo" style={{ background: 'transparent' }}>
            <img src="/logo.png" alt="Orbit Logo" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
          </div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to your Orbit account</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '20px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="input-field"
              placeholder="kush@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingRight: '40px' }}
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)} 
              style={{ position: 'absolute', right: '12px', top: '38px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <span 
                onClick={() => { setIsForgotPassword(true); setError(''); setForgotSuccess(''); }} 
                style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500, transition: 'color 0.2s' }}
                onMouseEnter={(e) => e.target.style.color = 'var(--text-main)'}
                onMouseLeave={(e) => e.target.style.color = 'var(--accent-primary)'}
              >
                Forgot Password?
              </span>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <span
            onClick={onSwitchToRegister}
            style={{ color: 'var(--accent-primary)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Sign Up
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
