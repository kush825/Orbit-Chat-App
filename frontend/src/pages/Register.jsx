import React, { useState, useEffect } from 'react';
import { MessageSquare, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import OtpInput from '../components/OtpInput';

const Register = ({ onSwitchToLogin, onBackToLanding }) => {
  const { register, verifyRegistration, resendRegistrationOtp } = useAuth();
  
  // Registration data state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // UI Flow state
  const [step, setStep] = useState('FORM'); // 'FORM', 'OTP', 'SUCCESS'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // OTP state
  const [otpValue, setOtpValue] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  // Handle countdown timer for OTP
  useEffect(() => {
    let timer;
    if (step === 'OTP' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      return setError('Password must be at least 8 characters');
    }
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return setError('Password must contain uppercase, lowercase, number, and special character');
    }

    setLoading(true);
    try {
      await register({ name, email, password, bio });
      setStep('OTP');
      setCountdown(60);
      setCanResend(false);
      setResendMessage('');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpComplete = (otpString) => {
    setOtpValue(otpString);
  };

  const handleVerifySubmit = async (e) => {
    e?.preventDefault();
    if (otpValue.length !== 6) {
      return setError('Please enter all 6 digits of the OTP.');
    }
    
    setError('');
    setLoading(true);
    try {
      await verifyRegistration(email, otpValue);
      setStep('SUCCESS');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    
    setError('');
    setResendMessage('');
    setLoading(true);
    try {
      await resendRegistrationOtp(email);
      setCountdown(60);
      setCanResend(false);
      setResendMessage('New OTP sent successfully.');
      setOtpValue(''); // Will not clear child input boxes visually due to how OtpInput is structured in this simple version, but will clear state
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = () => {
    setStep('FORM');
    setError('');
    setOtpValue('');
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="auth-wrapper" style={{ justifyContent: 'center' }}>
      <div className="auth-orb auth-orb-1" style={{ opacity: 0.3 }}></div>
      <div className="auth-orb auth-orb-2" style={{ opacity: 0.3 }}></div>

      <div className="auth-card" style={{ position: 'relative' }}>
        
        {step === 'FORM' && (
          <button 
            className="icon-btn" 
            onClick={onBackToLanding}
            style={{ position: 'absolute', top: '24px', left: '24px', width: '36px', height: '36px' }}
            title="Back to Home"
          >
            <ArrowLeft size={16} />
          </button>
        )}

        {/* STEP 1: FORM */}
        {step === 'FORM' && (
          <>
            <div className="auth-header">
              <div className="auth-logo" style={{ background: 'transparent' }}>
                <img src="/logo.png" alt="Orbit Logo" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
              </div>
              <h1 className="auth-title">Create Account</h1>
              <p className="auth-subtitle">Join Orbit & start messaging</p>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '20px', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="Enter your email"
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
              </div>

              <div className="form-group">
                <label className="form-label">Bio (Optional)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Hey there! I am using Orbit."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Register'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <span
                onClick={onSwitchToLogin}
                style={{ color: 'var(--accent-primary)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Sign In
              </span>
            </div>
          </>
        )}

        {/* STEP 2: OTP VERIFICATION */}
        {step === 'OTP' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="auth-logo" style={{ marginBottom: '20px' }}>
              <MessageSquare size={28} color="#fff" />
            </div>
            
            <h1 className="auth-title">Verify Your Email</h1>
            <p className="auth-subtitle" style={{ textAlign: 'center', marginBottom: '10px' }}>
              We sent a 6-digit verification code to
            </p>
            <p style={{ color: '#fff', fontWeight: '600', marginBottom: '20px' }}>
              {email.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => { 
                return gp2 + gp3.replace(/./g, '*') 
              })}
            </p>

            {error && (
              <div style={{ width: '100%', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '20px', textAlign: 'center' }}>
                {error}
              </div>
            )}

            {resendMessage && (
              <div style={{ width: '100%', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '20px', textAlign: 'center' }}>
                {resendMessage}
              </div>
            )}

            <OtpInput length={6} onComplete={handleOtpComplete} />

            <button 
              className="btn-primary" 
              onClick={handleVerifySubmit}
              disabled={loading || otpValue.length !== 6}
              style={{ marginTop: '20px' }}
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>

            <div style={{ marginTop: '30px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '10px' }}>
                Didn't receive the code?
              </p>
              
              <button 
                onClick={handleResendOtp}
                disabled={!canResend || loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: canResend ? 'var(--accent-primary)' : 'var(--text-muted)',
                  fontWeight: '600',
                  cursor: canResend ? 'pointer' : 'not-allowed',
                  fontSize: '0.9rem',
                  display: 'block',
                  margin: '0 auto 15px auto',
                  textDecoration: canResend ? 'underline' : 'none'
                }}
              >
                {canResend ? 'Resend OTP' : `Resend OTP in ${formatTime(countdown)}`}
              </button>

              <button 
                onClick={handleChangeEmail}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  textDecoration: 'underline'
                }}
              >
                Change Email
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'SUCCESS' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: 'rgba(16, 185, 129, 0.1)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '20px',
              border: '2px solid rgba(16, 185, 129, 0.5)'
            }}>
              <CheckCircle size={40} color="#34d399" />
            </div>
            
            <h1 className="auth-title">Email Verified!</h1>
            <p className="auth-subtitle" style={{ textAlign: 'center', marginBottom: '30px', maxWidth: '80%' }}>
              Your Orbit account has been created successfully.
            </p>

            <button 
              className="btn-primary" 
              onClick={() => window.location.reload()} // AuthContext will detect the user and show the Chat dashboard automatically, or we just reload
            >
              Continue to Chat
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default Register;
