import React, { useState, useEffect } from 'react';
import { Users, MessageSquare, HardDrive, ShieldAlert, LogOut, Search, Bell, Activity, FileText, History } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { getAppStats, getAllUsers, getNotifications, markNotificationsRead } from '../services/adminService';
import { useAdmin } from '../context/AdminContext';
import Loader from '../components/Loader';
import { io } from 'socket.io-client';
import './AdminDashboard.css';

import AdminUserDetails from './AdminUserDetails';
import ReportsList from './admin/ReportsList';
import ReportDetail from './admin/ReportDetail';
import ModerationHistoryList from './admin/ModerationHistoryList';

const SOCKET_SERVER_URL = `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}`;

const AdminDashboard = () => {
  const { admin, logoutAdmin } = useAdmin();
  const [stats, setStats] = useState({ totalUsers: 0, totalGroups: 0, totalMessages: 0, userGrowth: [], messageActivity: [] });
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);

  const getAvatarUrl = (path, fallbackName) => {
    if (!path) return `https://api.dicebear.com/7.x/avataaars/svg?seed=${fallbackName}`;
    if (path.startsWith('http')) return path;
    return `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}${path}`;
  };

  // Navigation State
  const [activeTab, setActiveTab] = useState('DASHBOARD'); // DASHBOARD, USERS, REPORTS, HISTORY
  const [tabLoading, setTabLoading] = useState(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'USERS') {
      setTabLoading(true);
      setTimeout(() => setTabLoading(false), 800);
    }
  };
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportId, setSelectedReportId] = useState(null);

  const loadData = async (showGlobalLoader = true) => {
    try {
      if (showGlobalLoader) setLoading(true);
      const [statsResult, usersResult, notifsResult] = await Promise.allSettled([
        getAppStats(),
        getAllUsers(),
        getNotifications()
      ]);

      if (statsResult.status === 'fulfilled') setStats(statsResult.value);
      if (usersResult.status === 'fulfilled') setUsers(usersResult.value);
      if (notifsResult.status === 'fulfilled') setNotifications(notifsResult.value);

    } catch (err) {
      console.error('Unexpected error loading admin data', err);
      if (err.response?.status === 401) {
        logoutAdmin();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const socket = io(SOCKET_SERVER_URL, {
      reconnectionAttempts: 5,
    });

    socket.on('new_admin_notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    socket.on('new_message_report', (report) => {
      // If we are on the reports list, we could auto-refresh, or just let the bell handle it
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleNotificationClick = async () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && unreadCount > 0) {
      try {
        await markNotificationsRead();
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      } catch (err) {
        console.error('Failed to mark notifications read', err);
      }
    }
  };

  if (loading) {
    return <Loader text="Loading dashboard..." fullScreen={true} variant="orbit" />;
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderContent = () => {
    if (selectedReportId) {
      return <ReportDetail reportId={selectedReportId} onBack={() => setSelectedReportId(null)} />;
    }

    if (activeTab === 'USERS' && selectedUserId) {
      return (
        <AdminUserDetails 
          userId={selectedUserId} 
          onBack={() => { 
            setSelectedUserId(null); 
            setTabLoading(true);
            loadData(false); // background load without global loader
            setTimeout(() => setTabLoading(false), 800);
          }} 
        />
      );
    }

    switch (activeTab) {
      case 'USERS':
        if (tabLoading) {
          return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader variant="orbit" fullScreen={false} text="Loading users directory..." />
            </div>
          );
        }
        const filteredUsers = users.filter(u => 
          (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) || 
          (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: '#fff', margin: 0 }}>Users Directory</h2>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Search size={18} color="rgba(255,255,255,0.4)" style={{ marginRight: '10px' }} />
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', width: '250px' }}
                />
              </div>
            </div>
            
            <div 
              className="admin-users-grid" 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: '20px',
                maxHeight: '65vh',
                overflowY: 'auto',
                paddingRight: '10px'
              }}
            >
              {filteredUsers.map((user, idx) => (
                <div 
                  key={user._id} 
                  className="admin-user-card" 
                  onClick={() => setSelectedUserId(user._id)}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="admin-user-card-header" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                    <img 
                      src={getAvatarUrl(user.profileImage, user.name)} 
                      alt="avatar" 
                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)' }} 
                    />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <h4 style={{ margin: '0 0 4px 0', color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.name}</h4>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {user.email}
                        {user.emailVerified && <span style={{ color: '#34d399', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>✓</span>}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '0.8rem' }}>
                    <span style={{ color: user.isOnline ? '#34d399' : 'rgba(255,255,255,0.4)' }}>{user.isOnline ? 'Online Now' : 'Offline'}</span>
                    <span style={{ color: user.isBlocked ? '#f87171' : (user.isActive ? '#34d399' : '#f59e0b') }}>
                      {user.isBlocked ? 'Blocked' : (user.isActive ? 'Active' : 'Deactivated')}
                    </span>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  No users found matching "{searchQuery}"
                </div>
              )}
            </div>
          </>
        );
      case 'REPORTS':
        return <ReportsList onViewReport={(id) => setSelectedReportId(id)} />;
      case 'HISTORY':
        return <ModerationHistoryList />;
      case 'DASHBOARD':
      default:
        return (
          <>
            {/* Dashboard Stats */}
            <div className="admin-stats-grid">
              <div className="admin-stat-card" style={{ '--delay': '0.1s' }}>
                <div className="admin-stat-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                  <Users size={28} color="#818cf8" />
                </div>
                <div className="admin-stat-content">
                  <h3>TOTAL USERS</h3>
                  <div className="admin-stat-value">{stats.totalUsers || 0}</div>
                </div>
              </div>

              <div className="admin-stat-card" style={{ '--delay': '0.2s' }}>
                <div className="admin-stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                  <MessageSquare size={28} color="#34d399" />
                </div>
                <div className="admin-stat-content">
                  <h3>TOTAL GROUPS</h3>
                  <div className="admin-stat-value">{stats.totalGroups || 0}</div>
                </div>
              </div>

              <div className="admin-stat-card" style={{ '--delay': '0.3s' }}>
                <div className="admin-stat-icon-wrapper" style={{ background: 'rgba(244, 63, 94, 0.1)' }}>
                  <HardDrive size={28} color="#fb7185" />
                </div>
                <div className="admin-stat-content">
                  <h3>TOTAL MESSAGES</h3>
                  <div className="admin-stat-value">{stats.totalMessages || 0}</div>
                </div>
              </div>
            </div>

            {/* Analytics Charts */}
            <div className="admin-charts-grid">
              
              {/* User Growth Chart */}
              <div style={{ background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-glass)', padding: '24px' }}>
                <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={20} color="#818cf8" /> User Growth (Last 7 Days)
                </h3>
                <div style={{ height: '300px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.userGrowth || []} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <RechartsTooltip 
                        contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#818cf8' }}
                      />
                      <Line type="monotone" dataKey="count" name="New Users" stroke="#818cf8" strokeWidth={3} dot={{ r: 4, fill: '#818cf8' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Message Activity Chart */}
              <div style={{ background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-glass)', padding: '24px' }}>
                <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={20} color="#34d399" /> Message Activity (Last 7 Days)
                </h3>
                <div style={{ height: '300px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.messageActivity || []} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <RechartsTooltip 
                        contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#34d399' }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      />
                      <Bar dataKey="count" name="Messages" fill="#34d399" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Recent Activity Section */}
            <div style={{ marginTop: '24px', background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-glass)', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={20} color="#fb7185" /> Recent Signups
                </h3>
                <button 
                  onClick={() => setActiveTab('USERS')}
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  View All Users
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {users.slice(0, 5).map(user => (
                  <div key={user._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <img 
                      src={getAvatarUrl(user.profileImage, user.name)} 
                      alt="avatar" 
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} 
                    />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <h4 style={{ margin: '0 0 2px 0', color: '#fff', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</h4>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>{user.isOnline ? 'Online Now' : 'Offline'}</span>
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>No users found.</div>
                )}
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="admin-dashboard-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      
      {/* Admin Navbar */}
      <header className="admin-header" style={{ zIndex: 10000 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '10px', borderRadius: '12px', boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)' }}>
            <ShieldAlert size={28} color="#818cf8" />
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '0.5px' }}>Super Admin Panel</h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          
          <div className="admin-notification-wrapper" style={{ position: 'relative' }}>
            <button 
              className="admin-notification-btn" 
              onClick={handleNotificationClick}
              style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#fff', padding: '10px', borderRadius: '50%', cursor: 'pointer', position: 'relative', display: 'flex', transition: 'all 0.2s' }}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-main)' }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="admin-notification-dropdown" style={{ position: 'absolute', top: '120%', right: '0', width: '320px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)', zIndex: 99999, overflow: 'hidden' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#fff' }}>Notifications</h3>
                </div>
                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>No notifications yet</div>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif._id} style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '12px', opacity: notif.isRead ? 0.7 : 1, background: notif.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.05)' }}>
                        <div style={{ marginTop: '2px' }}>
                          <ShieldAlert size={16} color={notif.type === 'REPORT' ? '#f43f5e' : '#6366f1'} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#fff' }}>{notif.message}</p>
                          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                            {new Date(notif.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Authorized Session</span>
            <span style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 500 }}>{admin?.email}</span>
          </div>
          <button 
            onClick={logoutAdmin}
            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, transition: 'all 0.2s ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </header>

      <div className="admin-body">
        
        {/* Sidebar */}
        <div className="admin-sidebar">
          
          <button 
            onClick={() => { setActiveTab('DASHBOARD'); setSelectedReportId(null); setSelectedUserId(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', background: activeTab === 'DASHBOARD' && !selectedReportId && !selectedUserId ? 'rgba(99, 102, 241, 0.15)' : 'transparent', border: 'none', color: activeTab === 'DASHBOARD' && !selectedReportId && !selectedUserId ? '#818cf8' : '#fff', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', borderLeft: activeTab === 'DASHBOARD' && !selectedReportId && !selectedUserId ? '4px solid #818cf8' : '4px solid transparent', textAlign: 'left', transition: 'all 0.2s' }}
          >
            <Activity size={20} /> Dashboard
          </button>
          
          <button 
            onClick={() => { 
              setTabLoading(true);
              setActiveTab('USERS'); 
              setSelectedReportId(null); 
              setSelectedUserId(null); 
              setTimeout(() => setTabLoading(false), 800);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', background: activeTab === 'USERS' || selectedUserId ? 'rgba(99, 102, 241, 0.15)' : 'transparent', border: 'none', color: activeTab === 'USERS' || selectedUserId ? '#818cf8' : '#fff', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', borderLeft: activeTab === 'USERS' || selectedUserId ? '4px solid #818cf8' : '4px solid transparent', textAlign: 'left', transition: 'all 0.2s' }}
          >
            <Users size={20} /> Users Management
          </button>

          <button 
            onClick={() => { setActiveTab('REPORTS'); setSelectedReportId(null); setSelectedUserId(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', background: activeTab === 'REPORTS' || selectedReportId ? 'rgba(99, 102, 241, 0.15)' : 'transparent', border: 'none', color: activeTab === 'REPORTS' || selectedReportId ? '#818cf8' : '#fff', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', borderLeft: activeTab === 'REPORTS' || selectedReportId ? '4px solid #818cf8' : '4px solid transparent', textAlign: 'left', transition: 'all 0.2s' }}
          >
            <FileText size={20} /> Moderation Reports
          </button>

          <button 
            onClick={() => { setActiveTab('HISTORY'); setSelectedReportId(null); setSelectedUserId(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', background: activeTab === 'HISTORY' && !selectedReportId && !selectedUserId ? 'rgba(99, 102, 241, 0.15)' : 'transparent', border: 'none', color: activeTab === 'HISTORY' && !selectedReportId && !selectedUserId ? '#818cf8' : '#fff', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', borderLeft: activeTab === 'HISTORY' && !selectedReportId && !selectedUserId ? '4px solid #818cf8' : '4px solid transparent', textAlign: 'left', transition: 'all 0.2s' }}
          >
            <History size={20} /> Moderation History
          </button>

          <div style={{ marginTop: 'auto', padding: '24px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '1px' }}>
            ORBIT PLATFORM v1.0.0
          </div>
        </div>

        {/* Main Content Area */}
        <div className="admin-main-content">
          {renderContent()}
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
