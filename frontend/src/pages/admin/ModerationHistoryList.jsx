import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Loader from '../../components/Loader';

const ModerationHistoryList = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/moderation/history?page=${page}`);
      setHistory(res.data.history);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [page]);

  const getActionColor = (action) => {
    switch (action) {
      case 'MESSAGE_DELETED': return '#f43f5e';
      case 'USER_WARNED': return '#f59e0b';
      case 'USER_RESTRICTED': return '#8b5cf6';
      case 'USER_BANNED': return '#991b1b';
      case 'REPORT_DISMISSED': return '#6b7280';
      default: return '#fff';
    }
  };

  if (loading && page === 1 && !history.length) return <Loader text="Loading History..." variant="orbit" />;

  return (
    <div>
      <h2 style={{ color: '#fff', marginBottom: '24px' }}>Moderation History</h2>
      
      {/* Table */}
      <div style={{ background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-glass)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#fff', minWidth: '700px' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-glass)' }}>
              <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Date</th>
              <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Admin</th>
              <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>User</th>
              <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Action</th>
              <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>No moderation history found</td></tr>
            ) : (
              history.map(h => (
                <tr key={h._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '16px', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                    {new Date(h.createdAt).toLocaleDateString()} {new Date(h.createdAt).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: '16px' }}>{h.adminId?.name || h.adminId?.email}</td>
                  <td style={{ padding: '16px' }}>{h.targetUserId?.name}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ color: getActionColor(h.action), fontSize: '0.8rem', fontWeight: 600, background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
                      {h.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontSize: '0.9rem' }}>{h.reason}</td>
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

export default ModerationHistoryList;
