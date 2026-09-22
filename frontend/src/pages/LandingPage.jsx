import React from 'react';
import { MessageSquare, Sparkles, UserCheck, LayoutTemplate } from 'lucide-react';

const LandingPage = ({ onNavigate }) => {
  return (
    <div className="landing-wrapper">
      {/* Animated Background Orbs */}
      <div className="auth-orb auth-orb-1"></div>
      <div className="auth-orb auth-orb-2"></div>
      <div className="auth-orb auth-orb-3"></div>

      {/* Top Header Navigation */}
      <header className="landing-header">
        <div className="landing-brand">
          <div className="landing-brand-icon" style={{ background: 'transparent' }}>
            <img src="/logo.png" alt="Orbit Logo" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
          </div>
          <span className="landing-brand-text">Orbit</span>
        </div>
        <div className="landing-nav">
          <button 
            className="landing-btn-outline" 
            onClick={() => onNavigate('login')}
          >
            Sign In
          </button>
          <button 
            className="landing-btn-solid" 
            onClick={() => onNavigate('register')}
          >
            Sign Up
          </button>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="landing-main">
        <div className="landing-hero">
          <div className="hero-badge">
            <Sparkles size={16} /> The Future of Communication
          </div>
          <h1 className="hero-title">Connect instantly with Orbit.</h1>
          <p className="hero-subtitle" style={{ maxWidth: '600px', margin: '0 auto' }}>
            Experience lightning-fast, secure, and beautiful real-time messaging and blogging. Built with state-of-the-art glassmorphism and tailored for teams and creators.
          </p>

          <div className="landing-features">
            <div className="feature-item">
              <div className="feature-icon-wrapper">
                <MessageSquare size={24} />
              </div>
              <div className="feature-text" style={{ textAlign: 'left' }}>
                <h4>Real-Time Messaging</h4>
                <p>Instant delivery with WebSockets and read receipts.</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon-wrapper">
                <UserCheck size={24} />
              </div>
              <div className="feature-text" style={{ textAlign: 'left' }}>
                <h4>Seamless Contact Management</h4>
                <p>Add friends, block users, and see who's online instantly.</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon-wrapper" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                <LayoutTemplate size={24} />
              </div>
              <div className="feature-text" style={{ textAlign: 'left' }}>
                <h4>Integrated Blogs & Articles</h4>
                <p>Publish and discover amazing content from the community.</p>
              </div>
            </div>
          </div>
          
          <button 
            className="btn-primary" 
            style={{ maxWidth: '300px', marginTop: '40px', padding: '20px', fontSize: '1.1rem' }}
            onClick={() => onNavigate('register')}
          >
            Get Started Now
          </button>
        </div>
      </main>
      
      <footer style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '0.5px', marginTop: 'auto' }}>
        Orbit Communications Platform &copy; 2026 | Version 1.0.0
      </footer>
    </div>
  );
};

export default LandingPage;
