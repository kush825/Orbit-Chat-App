import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus } from 'lucide-react';
import { getUsers } from '../services/userService';
import { accessConversation } from '../services/conversationService';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { getAvatarUrl } from '../utils/getAvatarUrl';

const NewChatModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { setSelectedChat, loadConversations } = useChat();

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loadingChatId, setLoadingChatId] = useState(null);

  // Handle user search
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const delaySearch = setTimeout(async () => {
      setSearching(true);
      try {
        const users = await getUsers(search);
        const filteredUsers = users.filter(u => {
          const isBlocked = user?.blockedUsers?.some(b => 
            (typeof b === 'object' ? b._id : b) === u._id
          );
          return !isBlocked && u._id !== user._id; // exclude blocked and self
        });
        setSearchResults(filteredUsers);
      } catch (err) {
        console.error('User search error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [search, user]);

  const handleStartChat = async (targetUserId) => {
    try {
      setLoadingChatId(targetUserId);
      const conversation = await accessConversation(targetUserId);
      setSelectedChat(conversation);
      loadConversations();
      onClose();
    } catch (err) {
      console.error('Failed to access conversation:', err);
    } finally {
      setLoadingChatId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content new-chat-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Chat</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="search-box" style={{ position: 'relative', width: '100%', marginBottom: '16px' }}>
            <Search size={16} className="search-icon" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
            <input
              type="text"
              className="search-input"
              placeholder="Search for new users to chat with..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '44px', width: '100%' }}
              autoFocus
            />
          </div>

          <div className="search-results" style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {searching ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div className="spinner" style={{ margin: '0 auto 10px', width: '24px', height: '24px' }}></div>
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map(u => (
                <div 
                  key={u._id} 
                  className="search-result-item" 
                  onClick={() => handleStartChat(u._id)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    gap: '12px'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <img 
                    src={getAvatarUrl(u.profileImage, u.name)} 
                    alt={u.name} 
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} 
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</div>
                  </div>
                  {loadingChatId === u._id ? (
                    <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                  ) : (
                    <UserPlus size={18} color="var(--accent-primary)" />
                  )}
                </div>
              ))
            ) : search.trim() ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No users found matching "{search}"
              </div>
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
                <Search size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                Type a name or email to search for new users
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;
