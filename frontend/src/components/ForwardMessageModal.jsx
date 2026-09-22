import React, { useState } from 'react';
import { X, Users, Search, Forward, FileText } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { getAvatarUrl } from '../utils/getAvatarUrl';

const ForwardMessageModal = () => {
  const { user } = useAuth();
  const { conversations, messageToForward, setMessageToForward, forwardMessage } = useChat();
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!messageToForward) return null;

  const handleClose = () => {
    setMessageToForward(null);
  };

  const toggleSelect = (convId) => {
    setSelectedIds((prev) => 
      prev.includes(convId) ? prev.filter(id => id !== convId) : [...prev, convId]
    );
  };

  const messagesToForward = Array.isArray(messageToForward) ? messageToForward : [messageToForward];

  const handleForward = async () => {
    if (selectedIds.length === 0) return;
    setIsSending(true);
    await forwardMessage(messagesToForward, selectedIds);
    setIsSending(false);
  };

  // Filter conversations
  const filteredConversations = conversations.filter(c => {
    const isGroup = c.isGroup;
    const title = isGroup ? c.groupName : (c.participants.find(p => p._id !== user._id)?.name || 'User');
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="modal-overlay" style={{ padding: '16px' }}>
      <div className="modal-content" style={{ display: 'flex', flexDirection: 'column', maxHeight: '80vh', padding: 0, width: '100%', maxWidth: '450px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Forward size={20} color="var(--accent-primary)" />
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Forward Message</h2>
          </div>
          <button className="icon-btn" onClick={handleClose} disabled={isSending}>
            <X size={20} />
          </button>
        </div>

        {/* Message Preview */}
        <div style={{ padding: '16px 24px', background: 'var(--bg-glass)', borderBottom: '1px solid var(--border-glass)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Preview
          </div>
          <div style={{ padding: '12px', background: 'var(--bg-glass)', borderRadius: '12px', color: 'var(--text-main)', fontSize: '0.9rem' }}>
            {messagesToForward.length > 1 ? (
              <div style={{ fontStyle: 'italic', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                Forwarding {messagesToForward.length} messages...
              </div>
            ) : (
              <>
                {messagesToForward[0].file && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: messagesToForward[0].text ? '8px' : '0', color: 'var(--accent-primary)' }}>
                    <FileText size={16} />
                    <span>{messagesToForward[0].fileName || 'Attachment'}</span>
                  </div>
                )}
                {messagesToForward[0].text && (
                  <div style={{ fontStyle: 'italic', borderLeft: '2px solid var(--accent-primary)', paddingLeft: '8px' }}>
                    "{messagesToForward[0].text.length > 80 ? messagesToForward[0].text.substring(0, 80) + '...' : messagesToForward[0].text}"
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '16px 24px', width: '100%' }}>
          <div className="search-box" style={{ position: 'relative', width: '100%' }}>
            <Search size={18} className="search-icon" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
            <input 
              type="text" 
              placeholder="Search chats..." 
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '44px', width: '100%' }}
            />
          </div>
        </div>

        {/* Contacts List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 16px 12px' }}>
          {filteredConversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
              No chats found.
            </div>
          ) : (
            filteredConversations.map(c => {
              const isGroup = c.isGroup;
              const otherParticipant = !isGroup ? c.participants.find(p => p._id !== user._id) : null;
              const title = isGroup ? c.groupName : (otherParticipant?.name || 'User');
              const avatar = isGroup ? getAvatarUrl(c.groupImage, title) : getAvatarUrl(otherParticipant?.profileImage, title);
              const isSelected = selectedIds.includes(c._id);

              return (
                <div 
                  key={c._id}
                  onClick={() => toggleSelect(c._id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    border: '1px solid',
                    borderColor: isSelected ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                    marginBottom: '4px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Custom Checkbox */}
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '6px',
                    border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--text-muted)'}`,
                    background: isSelected ? 'var(--accent-primary)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginRight: '16px', transition: 'all 0.2s ease'
                  }}>
                    {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                  </div>
                  
                  <img src={avatar} alt={title} style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '12px' }} />
                  
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      {title}
                      {isGroup && <Users size={12} color="var(--accent-primary)" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card-hover)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select chats to forward'}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={handleClose} 
              disabled={isSending}
              style={{ background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-main)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            >
              Cancel
            </button>
            <button 
              onClick={handleForward}
              disabled={selectedIds.length === 0 || isSending}
              style={{ 
                background: selectedIds.length > 0 ? 'var(--accent-gradient)' : 'var(--bg-glass)', 
                border: 'none', color: selectedIds.length > 0 ? '#fff' : 'var(--text-muted)', padding: '8px 20px', borderRadius: '8px', 
                cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed', fontWeight: 600,
                opacity: (selectedIds.length === 0 || isSending) ? 0.5 : 1,
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              {isSending ? 'Sending...' : 'Forward'} <Forward size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ForwardMessageModal;
