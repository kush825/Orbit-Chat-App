import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Loader from '../../components/Loader';
import { ArrowLeft, ShieldAlert, Check, Trash2, AlertOctagon, Ban, X } from 'lucide-react';
import { getAvatarUrl } from '../../utils/getAvatarUrl';

const ReportDetail = ({ reportId, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [actionModal, setActionModal] = useState(null); // 'dismiss' | 'delete' | 'warn' | 'restrict'
  const [adminNote, setAdminNote] = useState('');
  const [restrictionHours, setRestrictionHours] = useState(24);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadReport = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/moderation/reports/${reportId}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load report', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const handleAction = async () => {
    setIsSubmitting(true);
    try {
      let endpoint = '';
      let payload = { adminNote };

      if (actionModal === 'dismiss') endpoint = 'dismiss';
      if (actionModal === 'delete') endpoint = 'delete-message';
      if (actionModal === 'warn') endpoint = 'warn-user';
      if (actionModal === 'restrict') {
        endpoint = 'restrict-user';
        payload.durationHours = restrictionHours;
        payload.restrictions = ['Cannot Send Messages', 'Cannot Send Media'];
      }

      await api.post(`/moderation/reports/${reportId}/${endpoint}`, payload);
      setActionModal(null);
      setAdminNote('');
      loadReport(); // Reload to show updated status
    } catch (err) {
      console.error(`Failed to ${actionModal}`, err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return '#f59e0b';
      case 'UNDER_REVIEW': return '#3b82f6';
      case 'RESOLVED': return '#10b981';
      case 'DISMISSED': return '#6b7280';
      default: return '#fff';
    }
  };

  if (loading || !data) return <Loader text="Loading Report Details..." variant="orbit" />;

  const { report, reportedMessage, contextMessages } = data;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button 
          onClick={onBack}
          style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', color: '#fff', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={16} /> Back to Reports
        </button>
        <h2 style={{ color: '#fff', margin: 0 }}>Report Details</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        
        {/* Left Column - Message Context */}
        <div>
          <div style={{ background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-glass)', padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '20px', fontSize: '1.1rem', fontWeight: 600 }}>Message Context</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto', paddingRight: '10px' }}>
              {contextMessages.map(msg => {
                const isReported = msg._id === reportedMessage?._id;
                return (
                  <div key={msg._id} style={{ 
                    background: isReported ? 'rgba(244, 63, 94, 0.1)' : 'rgba(255,255,255,0.05)', 
                    border: isReported ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid transparent',
                    padding: '16px', 
                    borderRadius: '12px',
                    position: 'relative'
                  }}>
                    {isReported && (
                      <span style={{ position: 'absolute', top: '-10px', right: '16px', background: '#f43f5e', color: '#fff', fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: '12px' }}>REPORTED MESSAGE</span>
                    )}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                      <img src={getAvatarUrl(msg.sender?.profileImage)} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{msg.sender?.name}</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginLeft: '8px' }}>
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', margin: 0, paddingLeft: '44px' }}>
                      {msg.isDeleted ? <i style={{ color: 'rgba(255,255,255,0.4)' }}>This message was removed by an administrator.</i> : msg.text}
                    </p>
                    {msg.file && !msg.isDeleted && (
                      <div style={{ paddingLeft: '44px', marginTop: '12px' }}>
                        {msg.messageType === 'video' ? (
                          <video src={`http://${window.location.hostname}:5000${msg.file}`} controls style={{ maxWidth: '200px', borderRadius: '8px' }} />
                        ) : msg.messageType === 'file' ? (
                          <a href={`http://${window.location.hostname}:5000${msg.file}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', background: 'rgba(59,130,246,0.1)', padding: '8px 12px', borderRadius: '8px', display: 'inline-block' }}>
                            View Attachment
                          </a>
                        ) : (
                          <img src={`http://${window.location.hostname}:5000${msg.file}`} alt="Media" style={{ maxWidth: '200px', borderRadius: '8px' }} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column - Report Info & Actions */}
        <div>
          <div style={{ background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-glass)', padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '20px', fontSize: '1.1rem', fontWeight: 600 }}>Report Info</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Status</span>
                <span style={{ color: getStatusColor(report.status), fontSize: '0.9rem', fontWeight: 600, background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px' }}>{report.status}</span>
              </div>
              
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Reason</span>
                <span style={{ color: '#f43f5e', fontSize: '0.9rem', fontWeight: 600 }}>{report.reason}</span>
              </div>

              {report.description && (
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Details</span>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', margin: 0 }}>{report.description}</p>
                </div>
              )}

              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Reporter</span>
                <span style={{ color: '#fff', fontSize: '0.9rem' }}>{report.reporterUserId?.name}</span>
              </div>
              
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Group</span>
                <span style={{ color: '#fff', fontSize: '0.9rem' }}>{report.groupId?.name || 'Private Chat'}</span>
              </div>
              
              {report.adminNote && (
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #818cf8' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Admin Note</span>
                  <p style={{ color: '#fff', fontSize: '0.9rem', margin: 0 }}>{report.adminNote}</p>
                </div>
              )}
            </div>
          </div>

          {report.status !== 'RESOLVED' && report.status !== 'DISMISSED' && (
            <div style={{ background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-glass)', padding: '24px' }}>
              <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '20px', fontSize: '1.1rem', fontWeight: 600 }}>Actions</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button onClick={() => setActionModal('dismiss')} style={{ background: 'rgba(107, 114, 128, 0.2)', border: '1px solid rgba(107, 114, 128, 0.3)', color: '#fff', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600 }}>
                  <Check size={18} /> Dismiss Report
                </button>
                <button onClick={() => setActionModal('delete')} style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: '#f43f5e', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600 }}>
                  <Trash2 size={18} /> Delete Message
                </button>
                <button onClick={() => setActionModal('warn')} style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600 }}>
                  <AlertOctagon size={18} /> Warn User
                </button>
                <button onClick={() => setActionModal('restrict')} style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', color: '#8b5cf6', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600 }}>
                  <Ban size={18} /> Restrict User
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '30px', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '8px', fontSize: '1.2rem', fontWeight: 600 }}>
              {actionModal === 'dismiss' && 'Dismiss Report?'}
              {actionModal === 'delete' && 'Delete Message?'}
              {actionModal === 'warn' && 'Warn User?'}
              {actionModal === 'restrict' && 'Restrict User?'}
            </h3>
            
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '20px' }}>
              {actionModal === 'delete' && 'This message will be removed from the chat.'}
              {actionModal === 'restrict' && 'User will be temporarily restricted from sending messages.'}
            </p>

            {actionModal === 'restrict' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#fff', fontSize: '0.85rem', marginBottom: '8px' }}>Restriction Duration</label>
                <select 
                  value={restrictionHours} 
                  onChange={e => setRestrictionHours(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }}
                >
                  <option value={1} style={{ background: '#1e293b' }}>1 Hour</option>
                  <option value={6} style={{ background: '#1e293b' }}>6 Hours</option>
                  <option value={24} style={{ background: '#1e293b' }}>24 Hours</option>
                  <option value={72} style={{ background: '#1e293b' }}>3 Days</option>
                  <option value={168} style={{ background: '#1e293b' }}>7 Days</option>
                </select>
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: '#fff', fontSize: '0.85rem', marginBottom: '8px' }}>Admin Note (Optional)</label>
              <textarea 
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="Reason for this action..."
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', resize: 'vertical', minHeight: '80px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setActionModal(null)} 
                disabled={isSubmitting}
                style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                onClick={handleAction} 
                disabled={isSubmitting}
                style={{ flex: 1, background: actionModal === 'dismiss' ? '#10b981' : actionModal === 'delete' ? '#f43f5e' : actionModal === 'warn' ? '#f59e0b' : '#8b5cf6', border: 'none', color: '#fff', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                {isSubmitting ? 'Confirming...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportDetail;
