import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Users, MessageSquare, Plus, CheckCheck, Edit } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useChat } from '../context/ChatContext';
import { getAvatarUrl } from '../utils/getAvatarUrl';
import NewChatModal from './NewChatModal';
import MuteModal from './MuteModal';
import DeleteChatModal from './DeleteChatModal';
import { ArrowLeft, Trash2, Bell, BellOff, MoreVertical, Pin, PinOff } from 'lucide-react';
import { toggleBlockUser, getUsers } from '../services/userService';
import { accessConversation } from '../services/conversationService';
import Loader from './Loader';
const Sidebar = () => {
  const { user, updateUserState } = useAuth();
  const { onlineUsers } = useSocket();
  const { conversations, selectedChat, setSelectedChat, loadConversations, unreadCounts, typingUsers, handleMuteChats, handleDeleteChats, handlePinChats, handleRemoveGroupMember, conversationsLoaded } = useChat();

  const [activeTab, setActiveTab] = useState('all'); // 'all', 'unread', 'groups', 'requests'
  const [search, setSearch] = useState('');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  
  // Selection state
  const [selectedChats, setSelectedChats] = useState([]);
  const [isMuteModalOpen, setIsMuteModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [searchingGlobal, setSearchingGlobal] = useState(false);

  useEffect(() => {
    if (!search.trim()) {
      setGlobalSearchResults([]);
      setSearchingGlobal(false);
      return;
    }

    const delaySearch = setTimeout(async () => {
      setSearchingGlobal(true);
      try {
        const users = await getUsers(search);
        const existingParticipantIds = new Set();
        conversations.forEach(c => {
          if (!c.isGroup && c.lastMessage) {
            c.participants.forEach(p => {
              existingParticipantIds.add(String(typeof p === 'object' ? p._id : p));
            });
          }
        });

        const filtered = users.filter(u => {
          if (String(u._id) === String(user?._id)) return false;
          if (existingParticipantIds.has(String(u._id))) return false;
          const isBlocked = user?.blockedUsers?.some(b => 
            String(typeof b === 'object' ? b._id : b) === String(u._id)
          );
          if (isBlocked) return false;
          return true;
        });
        setGlobalSearchResults(filtered);
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setSearchingGlobal(false);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [search, user, conversations]);

  const handleStartGlobalChat = async (targetUserId) => {
    try {
      const conversation = await accessConversation(targetUserId);
      setSelectedChat(conversation);
      loadConversations();
      setSearch('');
    } catch (err) {
      console.error('Failed to access conversation:', err);
    }
  };
  const touchTimerRef = React.useRef(null);
  const longPressedChatId = React.useRef(null);

  const pendingRequests = conversations.filter(c => 
    (c.isGroup && c.pendingParticipants?.includes(user._id)) || 
    (!c.isGroup && c.status === 'pending' && c.initiatedBy !== user._id)
  );
  const pendingCount = pendingRequests.length;

  const filteredConversations = conversations.filter((c) => {
    // Hide empty 1-on-1 chats (unless they are pending requests)
    if (!c.isGroup && !c.lastMessage && c.status !== 'pending') {
      return false;
    }

    // Hide chats with blocked users
    if (!c.isGroup) {
      const otherParticipant = c.participants.find(p => (typeof p === 'object' ? p._id : p) !== user?._id);
      if (otherParticipant) {
        const isBlocked = user?.blockedUsers?.some(b => 
          String(typeof b === 'object' ? b._id : b) === String(typeof otherParticipant === 'object' ? otherParticipant._id : otherParticipant)
        );
        if (isBlocked) return false;
      }
    }

    const isIncomingRequest = (c.isGroup && c.pendingParticipants?.includes(user._id)) || 
                              (!c.isGroup && c.status === 'pending' && c.initiatedBy !== user._id);

    if (activeTab === 'requests') {
      return isIncomingRequest;
    }

    // Hide incoming requests from other tabs (All, Unread, Groups)
    if (isIncomingRequest) {
      return false;
    }

    if (activeTab === 'unread') return unreadCounts[c._id] > 0;
    if (activeTab === 'groups') return c.isGroup;

    // Local search filter
    if (search.trim()) {
      const searchTerm = search.toLowerCase();
      let matchName = '';
      if (c.isGroup) {
        matchName = c.chatName || '';
      } else {
        const otherParticipant = c.participants.find(p => (typeof p === 'object' ? p._id.toString() : p.toString()) !== user._id.toString());
        matchName = otherParticipant?.name || '';
      }
      return matchName.toLowerCase().includes(searchTerm);
    }

    return true;
  }).sort((a, b) => {
    const aPinned = a.pinnedBy?.includes(user._id);
    const bPinned = b.pinnedBy?.includes(user._id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    
    const dateA = new Date(a.lastMessage?.createdAt || a.updatedAt);
    const dateB = new Date(b.lastMessage?.createdAt || b.updatedAt);
    return dateB - dateA;
  });

  const handleSelectChat = (chatId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setSelectedChats(prev => {
      if (prev.includes(chatId)) {
        return prev.filter(id => id !== chatId);
      } else {
        return [...prev, chatId];
      }
    });
  };

  const handleTouchStart = (chatId) => {
    longPressedChatId.current = null;
    touchTimerRef.current = setTimeout(() => {
      longPressedChatId.current = chatId;
      handleSelectChat(chatId);
      if (navigator.vibrate) navigator.vibrate(50);
      
      // Clear flag after 1 second so normal clicks work again
      setTimeout(() => {
        if (longPressedChatId.current === chatId) longPressedChatId.current = null;
      }, 1000);
    }, 500); // 500ms long press
  };

  const handleTouchCancel = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }
  };

  const handleContextMenu = (e, chatId) => {
    e.preventDefault();
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    if (longPressedChatId.current === chatId) return; // Prevent double firing if touch already handled it
    
    longPressedChatId.current = chatId;
    handleSelectChat(chatId);
    if (navigator.vibrate) navigator.vibrate(50);
    
    setTimeout(() => {
      if (longPressedChatId.current === chatId) longPressedChatId.current = null;
    }, 1000);
  };

  const handleClearSelection = () => {
    setSelectedChats([]);
    setIsMoreMenuOpen(false);
  };

  const handleDeleteSelected = () => {
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSubmit = async (alsoExitGroup) => {
    // Delete them first (this hides them)
    await handleDeleteChats(selectedChats);
    
    // If user chose to exit, leave the groups
    if (alsoExitGroup) {
      for (const chatId of selectedChats) {
        const conv = conversations.find(c => c._id === chatId);
        if (conv && conv.isGroup) {
          await handleRemoveGroupMember(chatId, user._id);
        }
      }
    }
    
    handleClearSelection();
  };

  const handleMuteSubmit = async (duration) => {
    await handleMuteChats(selectedChats, duration);
    handleClearSelection();
  };

  const handlePinSubmit = async () => {
    await handlePinChats(selectedChats);
    handleClearSelection();
  };

  const isAllSelectedPinned = selectedChats.length > 0 && selectedChats.every(id => {
    const conv = conversations.find(c => c._id === id);
    return conv?.pinnedBy?.includes(user._id);
  });

  const isAllSelectedMuted = selectedChats.length > 0 && selectedChats.every(id => {
    const conv = conversations.find(c => c._id === id);
    return conv?.mutedBy?.some(m => {
      const mUser = typeof m.user === 'object' ? m.user?._id : m.user;
      return mUser === user?._id;
    });
  });

  const handleSelectAll = () => {
    setSelectedChats(filteredConversations.map(c => c._id));
    setIsMoreMenuOpen(false);
  };

  const handleBlockUser = async () => {
    if (selectedChats.length === 1) {
      const conv = conversations.find(c => c._id === selectedChats[0]);
      if (conv && !conv.isGroup) {
        const otherUserId = conv.participants.find(p => (typeof p === 'object' ? p._id : p) !== user._id);
        const otherId = typeof otherUserId === 'object' ? otherUserId._id : otherUserId;
        if (otherId) {
          try {
            await toggleBlockUser(otherId, 'block');
            
            // Instantly update local user state to hide the chat immediately
            const currentBlocked = user.blockedUsers || [];
            if (!currentBlocked.includes(otherId)) {
              updateUserState({ blockedUsers: [...currentBlocked, otherId] });
            }
            
            handleClearSelection();
            if (selectedChat?._id === conv._id) {
              setSelectedChat(null);
            }
          } catch (error) {
            console.error('Failed to block user', error);
          }
        }
      }
    }
  };

  return (
    <aside className="sidebar">
      {selectedChats.length > 0 ? (
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-secondary)', height: '60px' }}>
          <button 
            className="icon-btn" 
            onClick={handleClearSelection}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft size={20} />
          </button>
          <span style={{ flex: 1, fontSize: '1.1rem', fontWeight: 600 }}>{selectedChats.length}</span>
          
          <button 
            className="icon-btn" 
            onClick={handleDeleteSelected}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Trash2 size={20} />
          </button>
          
          <button 
            className="icon-btn" 
            onClick={handlePinSubmit}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={isAllSelectedPinned ? "Unpin" : "Pin"}
          >
            {isAllSelectedPinned ? <PinOff size={20} /> : <Pin size={20} />}
          </button>
          
          <button 
            className="icon-btn" 
            onClick={() => {
              if (isAllSelectedMuted) {
                handleMuteSubmit('unmute');
              } else {
                setIsMuteModalOpen(true);
              }
            }}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={isAllSelectedMuted ? "Unmute" : "Mute"}
          >
            {isAllSelectedMuted ? <Bell size={20} /> : <BellOff size={20} />}
          </button>

          <div style={{ position: 'relative' }}>
            <button 
              className="icon-btn" 
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <MoreVertical size={20} />
            </button>
            {isMoreMenuOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, background: '#202c33', border: '1px solid #2a3942', borderRadius: '8px', padding: '8px 0', minWidth: '150px', zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                <div onClick={handleSelectAll} style={{ padding: '12px 16px', cursor: 'pointer', fontSize: '0.9rem', color: '#e9edef' }} className="menu-item-hover">
                  Select all
                </div>
                {selectedChats.length === 1 && (
                  <div onClick={handleBlockUser} style={{ padding: '12px 16px', cursor: 'pointer', fontSize: '0.9rem', color: '#e9edef' }} className="menu-item-hover">
                    Block
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-secondary)', gap: '12px' }}>
          <div className="search-box" style={{ position: 'relative', flex: 1 }}>
            <Search size={16} className="search-icon" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
            <input
              type="text"
              className="search-input"
              placeholder="Search or start new chat"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '44px', width: '100%', height: '36px', background: 'var(--bg-primary)', border: 'none', borderRadius: '8px', color: 'var(--text-primary)', boxSizing: 'border-box' }}
            />
          </div>
          <button 
            className="icon-btn" 
            onClick={() => setIsNewChatModalOpen(true)}
            title="New Chat"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Edit size={20} />
          </button>
        </div>
      )}

      <div className="chat-tabs">
        <button
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>
        <button
          className={`tab-btn ${activeTab === 'unread' ? 'active' : ''}`}
          onClick={() => setActiveTab('unread')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
        >
          Unread
          {Object.values(unreadCounts).filter(count => count > 0).length > 0 && (
            <span style={{ 
              background: activeTab === 'unread' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', 
              color: activeTab === 'unread' ? '#fff' : 'var(--text-muted)', 
              fontSize: '0.65rem', 
              padding: '1px 6px', 
              borderRadius: '10px' 
            }}>
              {Object.values(unreadCounts).filter(count => count > 0).length}
            </span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          Groups
        </button>
        <button
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
        >
          Requests
          {pendingCount > 0 && (
            <span style={{ 
              background: '#f59e0b', 
              color: '#fff', 
              fontSize: '0.65rem', 
              padding: '1px 6px', 
              borderRadius: '10px' 
            }}>
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {search.trim() && (globalSearchResults.length > 0 || searchingGlobal) && (
        <div className="global-search-results" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
          <div style={{ padding: '12px 16px 4px 16px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Contacts
          </div>
          {searchingGlobal ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              Searching...
            </div>
          ) : (
            globalSearchResults.map(u => (
              <div
                key={u._id}
                className="conversation-item"
                onClick={() => handleStartGlobalChat(u._id)}
              >
                <div className="avatar-wrapper">
                  <img src={getAvatarUrl(u.profileImage, u.name)} alt={u.name} className="avatar-img" />
                </div>
                <div className="conv-details">
                  <div className="conv-top">
                    <span className="conv-name">{u.name}</span>
                  </div>
                  <div className="conv-bottom">
                    <span className="conv-message" style={{ color: 'var(--text-dim)' }}>{u.email}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Chat List */}
      <div className="conversation-list" style={{ overflowY: 'auto', flex: 1, padding: '12px' }}>
        {!conversationsLoaded ? (
          <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
            <Loader variant="orbit" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            {search ? 'No users or chats found.' : 'No conversations yet. Search for a user to start chatting!'}
          </div>
        ) : (
          filteredConversations.map((c) => {
            const isGroup = c.isGroup;
            const otherParticipant = !isGroup && Array.isArray(c.participants)
              ? c.participants.find((p) => (typeof p === 'object' ? p._id : p) !== user?._id)
              : null;
            const otherParticipantObj = typeof otherParticipant === 'object' && otherParticipant !== null
              ? otherParticipant
              : { _id: otherParticipant, name: 'User' };

            const isOnline = !isGroup && otherParticipantObj._id && onlineUsers?.includes(otherParticipantObj._id);

            const displayName = isGroup ? c.groupName : otherParticipantObj.name || 'User';
            const displayImage = isGroup
              ? getAvatarUrl(c.groupImage, displayName)
              : getAvatarUrl(otherParticipantObj.profileImage, displayName);

            const formatSidebarDate = (dateString) => {
              if (!dateString) return '';
              const date = new Date(dateString);
              const today = new Date();
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);

              if (date.toDateString() === today.toDateString()) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              } else if (date.toDateString() === yesterday.toDateString()) {
                return 'Yesterday';
              } else {
                return date.toLocaleDateString();
              }
            };

            const isSelected = selectedChats.includes(c._id);

            return (
              <div
                key={c._id}
                className={`conversation-item ${selectedChat?._id === c._id && selectedChats.length === 0 ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={(e) => {
                  if (longPressedChatId.current === c._id) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  if (selectedChats.length > 0) {
                    handleSelectChat(c._id);
                  } else {
                    setSelectedChat(c);
                  }
                }}
                onContextMenu={(e) => handleContextMenu(e, c._id)}
                onTouchStart={() => handleTouchStart(c._id)}
                onTouchEnd={handleTouchCancel}
                onTouchMove={handleTouchCancel}
                style={{ position: 'relative' }}
              >
                <div className="avatar-wrapper" style={{ position: 'relative' }}>
                  <img src={displayImage} alt={displayName} className="avatar-img" />
                  {isOnline && !isSelected && <div className="online-dot" />}
                  {isSelected && (
                    <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '20px', height: '20px', borderRadius: '50%', background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #111b21', animation: 'scaleIn 0.2s ease-out', zIndex: 5 }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#111b21" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  )}
                </div>

                <div className="conv-details">
                  <div className="conv-top">
                    <span className="conv-name">{displayName}</span>
                    <div className="conv-time">
                      {formatSidebarDate(c.lastMessage?.createdAt || c.updatedAt)}
                    </div>
                  </div>
                  <div className="conv-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span className="conv-message" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {typingUsers[c._id] ? (
                        <span style={{ color: '#22c55e', fontWeight: 500 }}>
                          {c.isGroup ? `${typingUsers[c._id]} is typing...` : 'typing...'}
                        </span>
                      ) : (
                        <>
                          {c.lastMessage && (typeof c.lastMessage.sender === 'object' ? c.lastMessage.sender?._id : c.lastMessage.sender) === user?._id && !c.lastMessage.isDeleted && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                              {(() => {
                                const isRead = c.lastMessage.readBy && c.lastMessage.readBy.some(r => {
                                   const rId = typeof r.user === 'object' ? r.user?._id : r.user;
                                   return rId && String(rId) !== String(user?._id);
                                });
                                return isRead ? <CheckCheck size={16} color="#34b7f1" /> : <CheckCheck size={16} color="#9ca3af" />;
                              })()}
                            </span>
                          )}
                          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.lastMessage
                              ? c.lastMessage.isDeleted
                                ? 'This message was deleted'
                                : (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {c.lastMessage.text || (c.lastMessage.file ? '📷 Attachment' : '')}
                                  </span>
                                )
                              : 'No messages yet'}
                            {c.lastMessage && !c.lastMessage.isDeleted && c.lastMessage.reactions && c.lastMessage.reactions.length > 0 && (
                              <span style={{ marginLeft: '4px' }}>
                                {c.lastMessage.reactions[c.lastMessage.reactions.length - 1].emoji}
                              </span>
                            )}
                          </span>
                        </>
                      )}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {(() => {
                        const isMuted = c.mutedBy && c.mutedBy.some(m => {
                          const mUser = typeof m.user === 'object' ? m.user?._id : m.user;
                          return mUser === user?._id;
                        });
                        return isMuted && (
                          <BellOff size={14} style={{ color: 'var(--text-dim)' }} />
                        );
                      })()}
                      {c.pinnedBy?.includes(user._id) && (
                        <Pin size={16} style={{ color: 'var(--text-dim)', transform: 'rotate(45deg)' }} />
                      )}
                      {unreadCounts[c._id] > 0 && (
                        <span className="unread-badge">
                          {unreadCounts[c._id]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Chat Modal */}
      <NewChatModal 
        isOpen={isNewChatModalOpen} 
        onClose={() => setIsNewChatModalOpen(false)} 
      />

      <MuteModal 
        isOpen={isMuteModalOpen}
        onClose={() => setIsMuteModalOpen(false)}
        onMute={handleMuteSubmit}
      />
      <DeleteChatModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleDeleteSubmit}
        chatType={selectedChats.length > 1 ? 'multiple' : (conversations.find(c => c._id === selectedChats[0])?.isGroup ? 'group' : 'chat')}
      />
    </aside>
  );
};

export default Sidebar;
