import React, { useState } from 'react';
import { X, UserPlus, UserMinus, ShieldAlert, Ban, Mail, Clock, MessageSquare, Trash2, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import api from '../services/api';
import { getAvatarUrl } from '../utils/getAvatarUrl';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import Loader from './Loader';

const UserProfileSidebar = ({ user: profileUser, onClose }) => {
  const { user: currentUser, updateUserState } = useAuth();
  const { clearChat, selectedChat, setSelectedChat } = useChat();
  const toast = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // Show the sleek profile skeleton loader briefly for visual flair when opening a profile
  React.useEffect(() => {
    setProfileLoading(true);
    const timer = setTimeout(() => {
      setProfileLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [profileUser._id]);

  // Check if they are in contacts or blocked
  const isBlocked = currentUser?.blockedUsers?.includes(profileUser._id);

  const toggleBlock = async () => {
    if (!await confirm(`Are you sure you want to ${isBlocked ? 'unblock' : 'block'} ${profileUser.name}?`)) return;
    try {
      setLoading(true);
      const action = isBlocked ? 'unblock' : 'block';
      const res = await api.put(`/users/${profileUser._id}/block`, { action });
      updateUserState({ blockedUsers: res.data.blockedUsers });
      toast.success(isBlocked ? 'User unblocked' : 'User blocked');

      if (!isBlocked && selectedChat && !selectedChat.isGroup) {
        const isWithBlockedUser = selectedChat.participants.some(p => p._id === profileUser._id);
        if (isWithBlockedUser) {
          setSelectedChat(null);
        }
      }
    } catch (err) {
      toast.error('Failed to update block status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-profile-sidebar" style={{
      width: '320px',
      background: 'var(--bg-card)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderLeft: '1px solid var(--border-glass)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflowY: 'auto'
    }}>
      <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Contact Info</h3>
        <button className="icon-btn" style={{ width: '36px', height: '36px' }} onClick={onClose}><X size={18} /></button>
      </div>

      {profileLoading ? (
        <Loader variant="orbit" />
      ) : (
        <>
          <div style={{ padding: '30px 20px', textAlign: 'center', borderBottom: '1px solid var(--border-glass)' }}>
            <img 
          src={getAvatarUrl(profileUser.profileImage, profileUser.name)}
          alt={profileUser.name}
          style={{ width: '120px', height: '120px', borderRadius: '50%', marginBottom: '16px', border: '2px solid var(--border-glass)' }}
        />
        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.4rem' }}>{profileUser.name}</h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>{profileUser.email}</div>
        
        <div style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: '12px', textAlign: 'left', marginBottom: '24px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>About</div>
          <div style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>{profileUser.bio || "Available"}</div>
        </div>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        <button onClick={toggleBlock} disabled={loading} style={{
          ...btnStyle,
          color: isBlocked ? '#34d399' : '#f87171',
          background: isBlocked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'
        }}>
          {isBlocked ? <><CheckCircle size={18} /> Unblock User</> : <><Ban size={18} /> Block User</>}
        </button>

        <button disabled={loading} style={{
          ...btnStyle,
          color: '#eab308',
          background: 'rgba(234, 179, 8, 0.1)'
        }}>
          <ShieldAlert size={18} /> Report Contact
        </button>

        <button onClick={clearChat} disabled={loading} style={{
          ...btnStyle,
          color: '#ef4444',
          background: 'rgba(239, 68, 68, 0.1)'
        }}>
          <Trash2 size={18} /> Clear Chat
        </button>

      </div>
        </>
      )}
    </div>
  );
};

const btnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
  padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer',
  fontWeight: 600, fontSize: '0.9rem', transition: 'background 0.2s'
};

export default UserProfileSidebar;
