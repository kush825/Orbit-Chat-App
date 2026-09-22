import React, { useState, useEffect } from 'react';
import { ArrowLeft, Ban, CheckCircle, ShieldAlert, MessageSquare, Users, HardDrive, AlertTriangle, Trash2 } from 'lucide-react';
import { getUserDetails, toggleBlockUser, deleteUser, hardDeleteUser } from '../services/adminService';
import Loader from '../components/Loader';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import './AdminDashboard.css';

const AdminUserDetails = ({ userId, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const toast = useToast();
  const confirm = useConfirm();

  const loadUser = async () => {
    try {
      setLoading(true);
      // Fetch data and enforce a minimum loading time of 800ms so the skeleton is visible
      const [result] = await Promise.all([
        getUserDetails(userId),
        new Promise(resolve => setTimeout(resolve, 800))
      ]);
      setData(result);
    } catch (err) {
      toast.error('Failed to load user details');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [userId]);

  const handleToggleBlock = async () => {
    if (await confirm(`Are you sure you want to ${data.user.isBlocked ? 'unblock' : 'block'} this user?`)) {
      try {
        const res = await toggleBlockUser(userId);
        setData({ ...data, user: res.user });
      } catch (err) {
        toast.error(err.response?.data?.message || 'Action failed');
      }
    }
  };

  const handleDeactivate = async () => {
    if (await confirm('Are you sure you want to deactivate (soft-delete) this user?')) {
      try {
        await deleteUser(userId);
        setData({ ...data, user: { ...data.user, isActive: false } });
        toast.success('User deactivated successfully');
      } catch (err) {
        toast.error('Failed to deactivate user');
      }
    }
  };

  const handleHardDelete = async () => {
    if (await confirm('Are you ABSOLUTELY sure you want to permanently delete this account? All of their data will be wiped and this action CANNOT be undone.')) {
      try {
        await hardDeleteUser(userId);
        toast.success('User account permanently deleted');
        onBack(); // Go back to directory since user no longer exists
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to permanently delete user');
      }
    }
  };

  if (loading || !data) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader text="Loading user profile..." variant="orbit" fullScreen={false} />
      </div>
    );
  }

  const { user, stats, conversations, reports } = data;

  const getAvatarUrl = (path, fallbackName) => {
    if (!path) return `https://api.dicebear.com/7.x/avataaars/svg?seed=${fallbackName}`;
    if (path.startsWith('http')) return path;
    return `http://${window.location.hostname}:5000${path}`;
  };

  const formatTime = (totalSeconds) => {
    if (!totalSeconds) return '0m';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const totalUsageSeconds = user.dailyUsage?.reduce((acc, curr) => acc + curr.seconds, 0) || 0;
  const todayString = new Date().toISOString().split('T')[0];
  const todayUsageSeconds = user.dailyUsage?.find(u => u.date === todayString)?.seconds || 0;

  return (
    <div className="stagger-1" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Header Back Button */}
      <div>
        <button 
          onClick={onBack}
          style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', color: '#818cf8', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 20px', borderRadius: '12px', fontWeight: 600, transition: 'all 0.2s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(99, 102, 241, 0.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <ArrowLeft size={18} /> Return to Directory
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="admin-profile-card" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '30px', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)' }}>
        
        <div className="admin-profile-info" style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
          <img src={getAvatarUrl(user.profileImage, user.name)} alt={user.name} style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', background: 'rgba(255,255,255,0.1)', boxShadow: '0 8px 20px rgba(0,0,0,0.4)', border: '2px solid rgba(255,255,255,0.1)' }} />
          <div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '2rem', fontWeight: 800, textShadow: '0 2px 10px rgba(255,255,255,0.1)' }}>{user.name}</h2>
            <div style={{ display: 'flex', gap: '20px', color: 'rgba(255,255,255,0.6)', fontSize: '1rem', fontWeight: 500 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {user.email}
                {user.emailVerified && <span style={{ color: '#34d399', fontSize: '0.85rem' }} title="Verified">✓</span>}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: user.isOnline ? '#34d399' : '#9ca3af', boxShadow: user.isOnline ? '0 0 10px #34d399' : 'none' }}></span>
                {user.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
              <span className={`admin-status-badge ${user.isActive ? 'admin-status-active' : 'admin-status-inactive'}`}>
                {user.isActive ? 'ACCOUNT ACTIVE' : 'ACCOUNT REVOKED'}
              </span>
            </div>
          </div>
        </div>

        <div className="admin-profile-actions" style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
          <button 
            onClick={handleToggleBlock}
            style={{ padding: '12px 24px', background: user.isBlocked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: user.isBlocked ? '#34d399' : '#f87171', border: `1px solid ${user.isBlocked ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, transition: 'all 0.2s ease' }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = `0 0 15px ${user.isBlocked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            {user.isBlocked ? <CheckCircle size={20} /> : <Ban size={20} />}
            {user.isBlocked ? 'Unblock User' : 'Block User'}
          </button>
          
          {user.isActive && (
            <button 
              onClick={handleDeactivate}
              style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, transition: 'all 0.2s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
            >
              <AlertTriangle size={20} color="#f59e0b" /> Deactivate Account
            </button>
          )}

          <button 
            onClick={handleHardDelete}
            style={{ padding: '12px 24px', background: 'transparent', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, transition: 'all 0.2s ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <Trash2 size={20} color="#ef4444" /> Delete Account
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs" style={{ display: 'flex', gap: '40px', marginTop: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {['profile', 'activity', 'chats', 'reports'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ 
              background: 'none', border: 'none', padding: '0 0 20px 0', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', transition: 'all 0.2s ease',
              color: activeTab === tab ? '#818cf8' : 'rgba(255,255,255,0.4)',
              borderBottom: activeTab === tab ? '3px solid #818cf8' : '3px solid transparent'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="stagger-2" style={{ marginTop: '10px' }}>
        
        {activeTab === 'profile' && (
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '32px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.2rem', fontWeight: 700, marginBottom: '24px', letterSpacing: '0.5px' }}>Identity Overview</h3>
            <div className="admin-profile-grid" style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '24px', fontSize: '1rem', color: 'rgba(255,255,255,0.6)' }}>
              <strong className="admin-profile-grid-label" style={{ color: '#fff' }}>Name:</strong> <span style={{ color: '#fff', fontWeight: 500 }}>{user.name}</span>
              <strong className="admin-profile-grid-label" style={{ color: '#fff' }}>Email:</strong> <span style={{ color: '#fff', fontWeight: 500 }}>{user.email}</span>
              <strong className="admin-profile-grid-label" style={{ color: '#fff' }}>Registration Date:</strong> <span>{new Date(user.createdAt).toLocaleString()}</span>
              <strong className="admin-profile-grid-label" style={{ color: '#fff' }}>Last Seen:</strong> <span>{new Date(user.lastSeen).toLocaleString()}</span>
              <strong className="admin-profile-grid-label" style={{ color: '#fff' }}>Security Status:</strong> 
              <span style={{ display: 'flex', gap: '10px' }}>
                <span className={`admin-status-badge ${user.isBlocked ? 'admin-status-inactive' : 'admin-status-active'}`}>{user.isBlocked ? 'BLOCKED' : 'CLEAR'}</span>
                <span className={`admin-status-badge ${user.isActive ? 'admin-status-active' : 'admin-status-inactive'}`}>{user.isActive ? 'ACTIVE' : 'DEACTIVATED'}</span>
              </span>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)', padding: '32px', borderRadius: '20px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Today's Screen Time</div>
                <div style={{ fontSize: '3rem', fontWeight: 800, color: '#818cf8', textShadow: '0 0 20px rgba(99, 102, 241, 0.4)' }}>{formatTime(todayUsageSeconds)}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '32px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Total Lifetime Usage</div>
                <div style={{ fontSize: '3rem', fontWeight: 800, color: '#fff' }}>{formatTime(totalUsageSeconds)}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '32px', borderRadius: '20px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#818cf8' }}>{stats.messagesSent}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '12px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '1px' }}>Messages Sent</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '32px', borderRadius: '20px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#34d399' }}>{stats.groupsJoined}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '12px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '1px' }}>Groups Joined</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '32px', borderRadius: '20px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#e879f9' }}>{stats.totalConversations}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '12px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '1px' }}>Total Conversations</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '32px', borderRadius: '20px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f87171' }}>{stats.reportsReceivedCount}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '12px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '1px' }}>Reports Received</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chats' && (
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '32px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.2rem', fontWeight: 700, marginBottom: '24px', letterSpacing: '0.5px' }}>Active Connections ({conversations.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {conversations.map(chat => (
                <div key={chat._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', alignItems: 'center', transition: 'background 0.2s ease', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                  <div>
                    <strong style={{ display: 'block', marginBottom: '6px', fontSize: '1.1rem' }}>
                      {chat.isGroupChat ? chat.chatName : chat.users.find(u => u._id !== user._id)?.name}
                    </strong>
                    <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '8px' }}>
                      {chat.isGroupChat ? `Group Chat • ${chat.users.length} members` : 'Direct Message'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Est: {new Date(chat.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
              {conversations.length === 0 && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem', fontStyle: 'italic' }}>No connections logged.</span>}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '32px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.2rem', fontWeight: 700, marginBottom: '24px', letterSpacing: '0.5px' }}>Violation Reports</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reports.map(report => (
                <div key={report._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '16px', alignItems: 'center', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                  <div>
                    <strong style={{ display: 'block', color: '#f87171', marginBottom: '8px', fontSize: '1.1rem' }}>"{report.reason}"</strong>
                    <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>Filed by: <strong style={{color: '#fff'}}>{report.reportedBy?.name}</strong></span>
                  </div>
                  <span style={{ padding: '6px 14px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{report.status}</span>
                </div>
              ))}
              {reports.length === 0 && <span style={{ color: 'rgba(16, 185, 129, 0.8)', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={20} /> No violations reported. Identity is clear.</span>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminUserDetails;
