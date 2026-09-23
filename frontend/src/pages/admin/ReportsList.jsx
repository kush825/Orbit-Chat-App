import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Search, Filter, ShieldAlert, Eye, Shield, Trash2, Ban, AlertOctagon } from 'lucide-react';
import Loader from '../../components/Loader';

const ReportsList = ({ onViewReport }) => {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0, dismissed: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [filterStatus, setFilterStatus] = useState('');
  const [filterReason, setFilterReason] = useState('');

  const loadReports = async () => {
    try {
      setLoading(true);
      const [reportsRes, statsRes] = await Promise.all([
        api.get(`/moderation/reports?page=${page}&status=${filterStatus}&reason=${filterReason}`),
        api.get(`/moderation/reports/stats`)
      ]);
      setReports(reportsRes.data.reports);
      setTotalPages(reportsRes.data.totalPages);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [page, filterStatus, filterReason]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return '#f59e0b';
      case 'UNDER_REVIEW': return '#3b82f6';
      case 'RESOLVED': return '#10b981';
      case 'DISMISSED': return '#6b7280';
      default: return '#fff';
    }
  };

  if (loading && page === 1 && !reports.length) return <Loader text="Loading Reports..." variant="orbit" />;

  return (
    <div>
      <h2 style={{ color: '#fff', marginBottom: '24px' }}>Reports Dashboard</h2>
      
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        {[
          { label: 'Total Reports', value: stats.total, color: '#818cf8' },
          { label: 'Pending', value: stats.pending, color: '#fbbf24' },
          { label: 'Under Review', value: stats.underReview, color: '#60a5fa' },
          { label: 'Resolved', value: stats.resolved, color: '#34d399' },
          { label: 'Dismissed', value: stats.dismissed, color: '#9ca3af' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{s.label}</span>
            <span style={{ color: s.color, fontSize: '2rem', fontWeight: 800 }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', background: 'var(--bg-glass)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0 12px' }}>
          <Filter size={18} color="rgba(255,255,255,0.5)" />
          <select 
            value={filterStatus} 
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            style={{ background: 'transparent', border: 'none', color: '#fff', padding: '10px', width: '100%', outline: 'none' }}
          >
            <option value="" style={{ background: '#1e293b' }}>All Statuses</option>
            <option value="PENDING" style={{ background: '#1e293b' }}>Pending</option>
            <option value="UNDER_REVIEW" style={{ background: '#1e293b' }}>Under Review</option>
            <option value="RESOLVED" style={{ background: '#1e293b' }}>Resolved</option>
            <option value="DISMISSED" style={{ background: '#1e293b' }}>Dismissed</option>
          </select>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0 12px' }}>
          <Filter size={18} color="rgba(255,255,255,0.5)" />
          <select 
            value={filterReason} 
            onChange={e => { setFilterReason(e.target.value); setPage(1); }}
            style={{ background: 'transparent', border: 'none', color: '#fff', padding: '10px', width: '100%', outline: 'none' }}
          >
            <option value="" style={{ background: '#1e293b' }}>All Reasons</option>
            <option value="Harassment" style={{ background: '#1e293b' }}>Harassment</option>
            <option value="Spam" style={{ background: '#1e293b' }}>Spam</option>
            <option value="Hate Speech" style={{ background: '#1e293b' }}>Hate Speech</option>
            <option value="Sexual Content" style={{ background: '#1e293b' }}>Sexual Content</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-glass)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#fff', minWidth: '800px' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-glass)' }}>
              <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Reporter</th>
              <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Reported User</th>
              <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Message</th>
              <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Reason</th>
              <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Date</th>
              <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>No reports found</td></tr>
            ) : (
              reports.map(r => (
                <tr key={r._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '16px' }}>{r.reporterUserId?.name}</td>
                  <td style={{ padding: '16px' }}>{r.reportedUserId?.name}</td>
                  <td style={{ padding: '16px', color: 'rgba(255,255,255,0.8)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.messageId?.isDeleted ? <i style={{color: 'rgba(255,255,255,0.4)'}}>Deleted</i> : r.messageId?.text ? `"${r.messageId.text}"` : r.messageId?.file ? '[Media/File]' : 'Unknown Message'}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                      {r.reason}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ color: getStatusColor(r.status), fontSize: '0.8rem', fontWeight: 600 }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <button 
                      onClick={() => onViewReport(r._id)}
                      style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                    >
                      <Eye size={16} /> View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
            style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
          >
            Prev
          </button>
          <span style={{ display: 'flex', alignItems: 'center', color: '#fff' }}>Page {page} of {totalPages}</span>
          <button 
            disabled={page === totalPages} 
            onClick={() => setPage(p => p + 1)}
            style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportsList;
