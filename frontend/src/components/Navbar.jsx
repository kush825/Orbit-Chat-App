import React, { useState } from 'react';
import { MessageSquare, UserPlus, LogOut, Settings, Users, Sparkles, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import GroupModal from './GroupModal';
import ProfileModal from './ProfileModal';
import SettingsModal from './SettingsModal';
import { getAvatarUrl } from '../utils/getAvatarUrl';
import api from '../services/api';

const Navbar = () => {
  const { user, logout, updateUserState } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  return (
    <>
      <header className="navbar">
        <div className="navbar-brand">
          <div className="brand-icon" style={{ background: 'transparent' }}>
            <img src="/logo.png" alt="Orbit Logo" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
          </div>
          <span>Orbit</span>
          <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(99,102,241,0.2)', color: '#818cf8', borderRadius: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={10} /> Real-Time
          </span>
        </div>

        <div className="navbar-actions">
          <button
            className="icon-btn"
            onClick={async () => {
              const newTheme = theme === 'dark' ? 'light' : 'dark';
              setTheme(newTheme);
              try {
                const updatedSettings = {
                  ...user?.settings,
                  appearance: { ...user?.settings?.appearance, theme: newTheme }
                };
                await api.put('/users/settings', { settings: updatedSettings });
                updateUserState({ ...user, settings: updatedSettings });
              } catch (err) {
                console.error('Failed to sync theme to backend', err);
              }
            }}
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            className="icon-btn"
            onClick={() => setShowGroupModal(true)}
            title="Create Group Chat"
          >
            <Users size={18} />
          </button>

          <div
            className="user-profile-badge"
            onClick={() => setShowProfileModal(true)}
            title="Edit Profile"
          >
            <img
              src={getAvatarUrl(user?.profileImage, user?.name)}
              alt={user?.name}
              className="user-avatar"
            />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user?.name}</span>
          </div>

          <button
            className="icon-btn"
            onClick={() => setShowSettingsModal(true)}
            title="Settings"
          >
            <Settings size={18} />
          </button>

        </div>
      </header>

      {showGroupModal && <GroupModal onClose={() => setShowGroupModal(false)} />}
      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
      {showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} />}
    </>
  );
};

export default Navbar;
