import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, Bell, MessageCircle, Palette, Monitor, Phone, Mail, User, LogOut, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { deleteMyAccount, changePassword } from '../services/userService';
import api from '../services/api';
import { getAvatarUrl } from '../utils/getAvatarUrl';

const ToggleSwitch = ({ checked, onChange }) => (
  <div 
    onClick={onChange}
    style={{
      width: '44px',
      height: '24px',
      background: checked ? '#3b82f6' : 'rgba(255,255,255,0.1)',
      borderRadius: '12px',
      position: 'relative',
      cursor: 'pointer',
      transition: 'background 0.3s ease',
      border: '1px solid rgba(255,255,255,0.05)',
      flexShrink: 0
    }}
  >
    <div 
      style={{
        width: '20px',
        height: '20px',
        background: '#fff',
        borderRadius: '50%',
        position: 'absolute',
        top: '1px',
        left: checked ? '21px' : '1px',
        transition: 'left 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}
    />
  </div>
);

const RadioGroup = ({ options, value, onChange }) => (
  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '4px' }}>
    {options.map((opt) => (
      <label 
        key={opt.value} 
        onClick={() => onChange(opt.value)}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          cursor: 'pointer',
          fontSize: '0.9rem',
          color: value === opt.value ? 'var(--text-main)' : 'var(--text-muted)'
        }}
      >
        <div style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          border: `2px solid ${value === opt.value ? '#3b82f6' : 'rgba(255,255,255,0.2)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s'
        }}>
          {value === opt.value && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }} />}
        </div>
        {opt.label}
      </label>
    ))}
  </div>
);

const SettingsModal = ({ onClose }) => {
  const { user, logout, updateUserState } = useAuth();
  const { theme, toggleTheme, setTheme } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  
  const [activeTab, setActiveTab] = useState('account');
  const [loading, setLoading] = useState(false);
  const [localSettings, setLocalSettings] = useState({
    privacy: user?.settings?.privacy || { lastSeen: 'nobody', profilePhoto: 'everyone', about: 'everyone', readReceipts: true, typingIndicator: true },
    notifications: user?.settings?.notifications || { messages: true, groups: true, sound: true, desktop: true, preview: true },
    chat: user?.settings?.chat || { enterToSend: true, autoDownloadMedia: true, fontSize: 'medium' },
    appearance: user?.settings?.appearance || { theme: 'dark' }
  });
  
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });

  const [blockedUsersList, setBlockedUsersList] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  useEffect(() => {
    if (activeTab === 'blocked') {
      const fetchBlockedUsers = async () => {
        try {
          setLoadingBlocked(true);
          const res = await api.get('/users/blocked');
          setBlockedUsersList(res.data);
        } catch (err) {
          toast.error('Failed to load blocked users');
        } finally {
          setLoadingBlocked(false);
        }
      };
      fetchBlockedUsers();
    }
  }, [activeTab, toast]);

  const handleUnblock = async (userId) => {
    try {
      const res = await api.put(`/users/${userId}/block`, { action: 'unblock' });
      setBlockedUsersList(prev => prev.filter(u => u._id !== userId));
      updateUserState({ ...user, blockedUsers: res.data.blockedUsers });
      toast.success('User unblocked');
    } catch (err) {
      toast.error('Failed to unblock user');
    }
  };

  const handleToggle = (category, setting) => {
    setLocalSettings(prev => {
      const newValue = !prev[category][setting];
      
      // Request notification permissions if turning on notifications
      if (category === 'notifications' && newValue === true && 
          (setting === 'messages' || setting === 'groups' || setting === 'desktop')) {
        if ('Notification' in window) {
          if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
              if (permission === 'denied') {
                toast.error('Notification permission was denied by your browser.');
              }
            });
          } else if (Notification.permission === 'denied') {
            toast.error('Notifications are blocked by your browser settings.');
          }
        } else {
          toast.error('Notifications are not supported on this device/browser (HTTPS is required).');
        }
      }

      return {
        ...prev,
        [category]: {
          ...prev[category],
          [setting]: newValue
        }
      };
    });
  };

  const handleSelect = (category, setting, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));

    if (category === 'appearance' && setting === 'theme') {
      if (value === 'system') {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(isSystemDark ? 'dark' : 'light');
      } else {
        setTheme(value);
      }
    }
  };

  const isFirstRender = useRef(true);
  
  // Auto-save settings when localSettings changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    const saveSettings = async () => {
      try {
        const res = await api.put('/users/settings', { settings: localSettings });
        updateUserState({ ...user, settings: res.data.settings });
      } catch (err) {
        console.error('Failed to auto-save settings', err);
      }
    };
    
    const timeoutId = setTimeout(saveSettings, 500);
    return () => clearTimeout(timeoutId);
  }, [localSettings]);

  const handleDeleteAccount = async () => {
    if (await confirm('Are you ABSOLUTELY sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.')) {
      try {
        await deleteMyAccount();
        toast.success('Your account has been deleted');
        logout();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to delete account');
      }
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      return setPasswordError('All password fields are required');
    }
    if (passwords.new === passwords.current) {
      return setPasswordError('New password cannot be the same as the current password');
    }
    if (passwords.new !== passwords.confirm) {
      return setPasswordError('New passwords do not match');
    }
    if (passwords.new.length < 8) {
      return setPasswordError('New password must be at least 8 characters');
    }
    
    // Strong password validation regex
    const hasUpperCase = /[A-Z]/.test(passwords.new);
    const hasLowerCase = /[a-z]/.test(passwords.new);
    const hasNumbers = /\d/.test(passwords.new);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(passwords.new);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return setPasswordError('Password must contain uppercase, lowercase, number, and special character');
    }

    try {
      setPasswordLoading(true);
      await changePassword(passwords.current, passwords.new);
      setPasswordSuccess('Password successfully updated!');
      setPasswords({ current: '', new: '', confirm: '' });
      setTimeout(() => setPasswordSuccess(''), 5000);
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content settings-modal-container" style={{ width: '800px', maxWidth: '95vw', height: '600px', padding: 0, overflow: 'hidden' }}>
        
        {/* Sidebar Tabs */}
        <div className="settings-sidebar" style={{ background: 'var(--bg-glass)', borderRight: '1px solid var(--border-glass)' }}>
          <div style={{ padding: '24px', fontSize: '1.2rem', fontWeight: 'bold' }}>Settings</div>
          
          <div className="settings-tabs-list">
            <button className={`settings-tab ${activeTab === 'account' ? 'active' : ''}`} onClick={() => setActiveTab('account')} style={tabStyle(activeTab === 'account')}>
              <User size={18} /> Account
            </button>
            <button className={`settings-tab ${activeTab === 'privacy' ? 'active' : ''}`} onClick={() => setActiveTab('privacy')} style={tabStyle(activeTab === 'privacy')}>
              <Lock size={18} /> Privacy
            </button>
            <button className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')} style={tabStyle(activeTab === 'security')}>
              <ShieldAlert size={18} /> Security
            </button>
            <button className={`settings-tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')} style={tabStyle(activeTab === 'chat')}>
              <MessageCircle size={18} /> Chat
            </button>
            <button className={`settings-tab ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')} style={tabStyle(activeTab === 'notifications')}>
              <Bell size={18} /> Notifications
            </button>
            <button className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`} onClick={() => setActiveTab('appearance')} style={tabStyle(activeTab === 'appearance')}>
              <Palette size={18} /> Appearance
            </button>
            <button className={`settings-tab ${activeTab === 'blocked' ? 'active' : ''}`} onClick={() => setActiveTab('blocked')} style={tabStyle(activeTab === 'blocked')}>
              <ShieldAlert size={18} /> Blocked Users
            </button>
          </div>

          <div style={{ marginTop: 'auto', padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '1px', alignSelf: 'center', width: '100%', boxSizing: 'border-box' }}>
            ORBIT v1.0.0
          </div>
        </div>

        {/* Content Area */}
        <div className="settings-content" style={{ padding: '32px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h2 style={{ margin: 0, textTransform: 'capitalize' }}>{activeTab} Settings</h2>
            <button className="icon-btn" onClick={onClose}><X size={20} /></button>
          </div>

          <div style={{ flex: 1 }}>
            
            {activeTab === 'blocked' && (
              <div className="settings-section">
                {loadingBlocked ? (
                  <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '24px' }}>Loading...</div>
                ) : blockedUsersList.length === 0 ? (
                  <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '24px' }}>
                    You have no blocked users.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {blockedUsersList.map(bu => (
                      <div key={bu._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img src={getAvatarUrl(bu.profileImage, bu.name)} alt={bu.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{bu.name}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{bu.email}</span>
                          </div>
                        </div>
                        <button onClick={() => handleUnblock(bu._id)} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'account' && (
              <div style={sectionStyle}>
                <div style={itemStyle}><span><Mail size={16} style={{marginRight:'8px'}}/> Email</span> <span>{user.email}</span></div>
                <div style={itemStyle}><span><User size={16} style={{marginRight:'8px'}}/> Name</span> <span>{user.name}</span></div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Permanently remove your account and all data.</p>
                <button onClick={handleDeleteAccount} style={{...dangerBtn, marginTop: '24px'}}>Delete Account</button>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div style={sectionStyle}>
                <h4>Visibility</h4>
                <div style={radioItemStyle}>
                  <span style={{ fontWeight: 500 }}>Last Seen</span>
                  <RadioGroup 
                    value={localSettings.privacy.lastSeen} 
                    onChange={(val) => handleSelect('privacy', 'lastSeen', val)} 
                    options={[
                      { label: 'Everyone', value: 'everyone' },
                      { label: 'My Contacts', value: 'contacts' },
                      { label: 'Nobody', value: 'nobody' }
                    ]} 
                  />
                </div>
                <div style={radioItemStyle}>
                  <span style={{ fontWeight: 500 }}>Profile Photo</span>
                  <RadioGroup 
                    value={localSettings.privacy.profilePhoto} 
                    onChange={(val) => handleSelect('privacy', 'profilePhoto', val)} 
                    options={[
                      { label: 'Everyone', value: 'everyone' },
                      { label: 'My Contacts', value: 'contacts' },
                      { label: 'Nobody', value: 'nobody' }
                    ]} 
                  />
                </div>
                
                <h4 style={{ marginTop: '24px' }}>Messaging</h4>
                <div style={itemStyle}>
                  <span>Read Receipts (Blue Ticks)</span>
                  <ToggleSwitch checked={localSettings.privacy.readReceipts} onChange={() => handleToggle('privacy', 'readReceipts')} />
                </div>
                <div style={itemStyle}>
                  <span>Typing Indicator</span>
                  <ToggleSwitch checked={localSettings.privacy.typingIndicator} onChange={() => handleToggle('privacy', 'typingIndicator')} />
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div style={sectionStyle}>
                <div style={itemStyle}>
                  <span>Message Notifications</span>
                  <ToggleSwitch checked={localSettings.notifications.messages} onChange={() => handleToggle('notifications', 'messages')} />
                </div>
                <div style={itemStyle}>
                  <span>Group Notifications</span>
                  <ToggleSwitch checked={localSettings.notifications.groups} onChange={() => handleToggle('notifications', 'groups')} />
                </div>
                <div style={itemStyle}>
                  <span>Notification Sounds</span>
                  <ToggleSwitch checked={localSettings.notifications.sound} onChange={() => handleToggle('notifications', 'sound')} />
                </div>
                <div style={itemStyle}>
                  <span>Desktop Notifications</span>
                  <ToggleSwitch checked={localSettings.notifications.desktop} onChange={() => handleToggle('notifications', 'desktop')} />
                </div>
                <div style={itemStyle}>
                  <span>Show Message Preview</span>
                  <ToggleSwitch checked={localSettings.notifications.preview} onChange={() => handleToggle('notifications', 'preview')} />
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div style={sectionStyle}>
                <div style={itemStyle}>
                  <span>Enter Key to Send</span>
                  <ToggleSwitch checked={localSettings.chat.enterToSend} onChange={() => handleToggle('chat', 'enterToSend')} />
                </div>
                <div style={itemStyle}>
                  <span>Auto-Download Media</span>
                  <ToggleSwitch checked={localSettings.chat.autoDownloadMedia} onChange={() => handleToggle('chat', 'autoDownloadMedia')} />
                </div>
                <div style={radioItemStyle}>
                  <span style={{ fontWeight: 500 }}>Message Font Size</span>
                  <RadioGroup 
                    value={localSettings.chat.fontSize} 
                    onChange={(val) => handleSelect('chat', 'fontSize', val)} 
                    options={[
                      { label: 'Small', value: 'small' },
                      { label: 'Medium', value: 'medium' },
                      { label: 'Large', value: 'large' }
                    ]} 
                  />
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div style={sectionStyle}>
                <div style={radioItemStyle}>
                  <span style={{ fontWeight: 500 }}>App Theme</span>
                  <RadioGroup 
                    value={localSettings.appearance.theme} 
                    onChange={(val) => handleSelect('appearance', 'theme', val)} 
                    options={[
                      { label: 'Light Mode', value: 'light' },
                      { label: 'Dark Mode', value: 'dark' },
                      { label: 'System Default', value: 'system' }
                    ]} 
                  />
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div style={sectionStyle}>
                <h4>Change Password</h4>
                
                {passwordError && (
                  <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px', textAlign: 'center' }}>
                    {passwordError}
                  </div>
                )}
                
                {passwordSuccess && (
                  <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px', textAlign: 'center' }}>
                    {passwordSuccess}
                  </div>
                )}

                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                  <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Current Password</label>
                    <input type={showPassword.current ? 'text' : 'password'} required value={passwords.current} onChange={(e) => setPasswords({...passwords, current: e.target.value})} style={inputStyle} placeholder="Enter current password" />
                    <button type="button" onClick={() => setShowPassword(prev => ({...prev, current: !prev.current}))} style={{ position: 'absolute', right: '12px', top: '38px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      {showPassword.current ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>New Password</label>
                    <input type={showPassword.new ? 'text' : 'password'} required value={passwords.new} onChange={(e) => setPasswords({...passwords, new: e.target.value})} style={inputStyle} placeholder="Enter new password" />
                    <button type="button" onClick={() => setShowPassword(prev => ({...prev, new: !prev.new}))} style={{ position: 'absolute', right: '12px', top: '38px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      {showPassword.new ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Confirm New Password</label>
                    <input type={showPassword.confirm ? 'text' : 'password'} required value={passwords.confirm} onChange={(e) => setPasswords({...passwords, confirm: e.target.value})} style={inputStyle} placeholder="Confirm new password" />
                    <button type="button" onClick={() => setShowPassword(prev => ({...prev, confirm: !prev.confirm}))} style={{ position: 'absolute', right: '12px', top: '38px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <button type="submit" disabled={passwordLoading} style={{ ...btnPrimary, alignSelf: 'flex-start', marginTop: '8px' }}>
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            )}

          </div>

          <div className="settings-footer-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', borderTop: '1px solid var(--border-glass)', paddingTop: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <button 
              onClick={() => { logout(); onClose(); }} 
              style={{ ...btnOutline, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <LogOut size={16} /> Log Out
            </button>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={onClose} style={btnOutline}>Close</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// Quick missing icon wrapper
const ShieldAlertIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>
);

const tabStyle = (isActive) => ({
  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', border: 'none', 
  background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
  color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
  borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontSize: '0.95rem', fontWeight: 500, marginBottom: '4px',
  transition: 'all 0.2s'
});

const sectionStyle = { display: 'flex', flexDirection: 'column', gap: '16px' };
const radioItemStyle = { display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 0', borderBottom: '1px solid var(--border-glass)' };
const itemStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-glass)' };
const selectStyle = { background: 'var(--bg-glass)', color: 'var(--text-main)', border: '1px solid var(--border-glass)', padding: '6px 12px', borderRadius: '6px' };
const inputStyle = { background: 'var(--bg-glass)', color: 'var(--text-main)', border: '1px solid var(--border-glass)', padding: '10px 40px 10px 14px', borderRadius: '8px', width: '100%', boxSizing: 'border-box' };
const btnOutline = { background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-main)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 };
const btnPrimary = { background: 'var(--accent-primary)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 };
const dangerBtn = { background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, alignSelf: 'flex-start' };

export default SettingsModal;
