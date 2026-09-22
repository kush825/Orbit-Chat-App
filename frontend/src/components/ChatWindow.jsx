import React, { useRef, useEffect, useState } from 'react';
import { MessageSquare, Users, Shield, Info, ArrowLeft, Trash2, Forward, Copy, Reply, Smile, Download, ChevronDown, Pin } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useChat } from '../context/ChatContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import Message from './Message';
import MessageInput from './MessageInput';
import GroupInfoModal from './GroupInfoModal';
import UserProfileSidebar from './UserProfileSidebar';
import ForwardMessageModal from './ForwardMessageModal';
import api from '../services/api';
import { getAvatarUrl } from '../utils/getAvatarUrl';
import Loader from './Loader';

const ChatWindow = () => {
  const { user } = useAuth();
  const { onlineUsers } = useSocket();
  const { selectedChat, setSelectedChat, messages, setMessages, loadingMessages, typingUsers, messageToForward, setMessageToForward, deleteMessage, setReplyTo, handleTogglePinMessage } = useChat();
  const toast = useToast();
  const confirm = useConfirm();

  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const messagesEndRef = useRef(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [currentPinnedIndex, setCurrentPinnedIndex] = useState(0);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Show button if we scroll up more than 150px from the bottom
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollButton(isScrolledUp);
  };

  useEffect(() => {
    setShowUserProfile(false);
    setShowGroupInfo(false);
    setSelectionMode(false);
    setSelectedMessages([]);
    setCurrentPinnedIndex(0);
  }, [selectedChat?._id]);

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Smooth scroll for new messages and typing indicators
  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages.length, typingUsers]);

  // Instant scroll when switching chats or after messages load
  useEffect(() => {
    if (!loadingMessages) {
      // Small delay to ensure DOM has updated with the messages
      const timer = setTimeout(() => scrollToBottom('auto'), 50);
      return () => clearTimeout(timer);
    }
  }, [selectedChat?._id, loadingMessages]);

  const handleAccept = async () => {
    try {
      const res = await api.put(`/conversations/${selectedChat._id}/accept`);
      setSelectedChat(res.data);
    } catch (err) {
      toast.error('Failed to accept request');
    }
  };

  const handleReject = async () => {
    try {
      const res = await api.put(`/conversations/${selectedChat._id}/reject`);
      setSelectedChat(res.data);
    } catch (err) {
      toast.error('Failed to reject request');
    }
  };

  const toggleSelection = (msgId) => {
    if (!selectionMode) setSelectionMode(true);
    setSelectedMessages(prev => 
      prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId]
    );
  };

  // Exit selection mode if no messages are selected
  useEffect(() => {
    if (selectionMode && selectedMessages.length === 0) {
      setSelectionMode(false);
    }
  }, [selectedMessages, selectionMode]);

  const handleBulkDelete = async () => {
    if (selectedMessages.length === 0) return;

    const msgs = messages.filter(m => selectedMessages.includes(m._id));
    const allSentByMe = msgs.every(m => {
      const senderId = typeof m.sender === 'object' ? m.sender?._id : m.sender;
      return String(senderId) === String(user?._id);
    });

    const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
    const allWithinTimeLimit = msgs.every(m => {
      const msgTime = new Date(m.createdAt).getTime();
      return (Date.now() - msgTime) < FORTY_EIGHT_HOURS;
    });

    const allowDeleteForEveryone = allSentByMe && allWithinTimeLimit;

    const action = await confirm(`Delete ${selectedMessages.length} message(s)?`, { 
      type: 'delete', 
      allowDeleteForEveryone 
    });

    if (action === 'for_me' || action === 'for_everyone') {
      try {
        for (const id of selectedMessages) {
          await deleteMessage(id, action);
        }
        setSelectionMode(false);
        setSelectedMessages([]);
        toast.success('Messages deleted');
      } catch (error) {
        console.error("Failed to bulk delete:", error);
        toast.error('Failed to delete some messages');
      }
    }
  };

  const handleBulkForward = () => {
    try {
      const msgsToForward = messages.filter(m => selectedMessages.includes(m._id));
      setMessageToForward(msgsToForward);
      setSelectionMode(false);
      setSelectedMessages([]);
    } catch (err) {
      console.error(err);
      toast.error('Failed to prepare messages for forwarding');
    }
  };

  const handleBulkCopy = () => {
    const msgsToCopy = messages.filter(m => selectedMessages.includes(m._id)).map(m => m.text).join('\n');
    navigator.clipboard.writeText(msgsToCopy);
    toast.success('Copied to clipboard');
    setSelectionMode(false);
    setSelectedMessages([]);
  };

  const handleBulkReply = () => {
    if (selectedMessages.length === 1) {
      const msgToReply = messages.find(m => m._id === selectedMessages[0]);
      setReplyTo(msgToReply);
      setSelectionMode(false);
      setSelectedMessages([]);
    }
  };

  const handleBulkDownload = () => {
    const msgsToDownload = messages.filter(m => selectedMessages.includes(m._id));
    let filesToDownload = [];
    
    msgsToDownload.forEach(msg => {
      if (msg.attachments && msg.attachments.length > 0) {
        msg.attachments.forEach(att => {
          filesToDownload.push({ url: att.url, name: att.name || 'download' });
        });
      }
      if (msg.file) {
        filesToDownload.push({ url: msg.file, name: msg.fileName || 'download' });
      }
    });

    if (filesToDownload.length === 0) {
      toast.error('No downloadable files found in selected messages');
      return;
    }

    toast.success(`Downloading ${filesToDownload.length} file(s)...`);
    
    filesToDownload.forEach((file, idx) => {
      setTimeout(async () => {
        try {
          const url = file.url.startsWith('http') ? file.url : `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}${file.url}`;
          const response = await fetch(url);
          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          
          let filename = file.name;
          if (filename === 'download' || !filename.match(/\.(jpg|jpeg|png|gif|webp|pdf|mp4|mp3|wav|doc|docx|zip|rar)$/i)) {
            if (blob.type.startsWith('image/')) filename += '.jpg';
          }

          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
        } catch (error) {
          console.error('Download failed:', error);
          const url = file.url.startsWith('http') ? file.url : `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}${file.url}`;
          window.open(url, '_blank');
        }
      }, idx * 500);
    });

    setSelectionMode(false);
    setSelectedMessages([]);
  };

  if (!selectedChat) {
    return (
      <div className="chat-window-wrapper" style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
        <div className="chat-window empty-state">
          <div className="empty-icon">
            <MessageSquare size={40} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
            Welcome to Orbit
          </h2>
          <p style={{ maxWidth: '360px', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Select an existing conversation from the sidebar or search for a user to start messaging in real-time.
          </p>
        </div>
      </div>
    );
  }

  const isAdmin = selectedChat?.isGroup && (
    (typeof selectedChat.groupAdmin === 'object' ? selectedChat.groupAdmin?._id : selectedChat.groupAdmin) === user?._id ||
    selectedChat.groupAdmins?.some(a => (typeof a === 'object' ? a._id : a) === user?._id)
  );

  const canSendMessage = !selectedChat?.isGroup || isAdmin || (
    !selectedChat.announcementMode && 
    (selectedChat.permissions?.sendMessages !== false)
  );

  const pinnedMessages = selectedChat?.pinnedMessages && Array.isArray(selectedChat.pinnedMessages)
    ? messages.filter(m => selectedChat.pinnedMessages.some(p => (typeof p === 'object' ? p._id : p) === m._id))
    : [];

  const isGroup = selectedChat.isGroup;
  const otherParticipant = !isGroup && Array.isArray(selectedChat.participants)
    ? selectedChat.participants.find((p) => (typeof p === 'object' ? p._id : p) !== user?._id)
    : null;
  const otherParticipantObj = typeof otherParticipant === 'object' && otherParticipant !== null 
    ? otherParticipant 
    : { _id: otherParticipant, name: 'User' };

  const isOnline = !isGroup && otherParticipantObj._id && onlineUsers?.includes(otherParticipantObj._id);

  const chatTitle = isGroup ? selectedChat.groupName : otherParticipantObj.name || 'User';
  const chatAvatar = isGroup
    ? getAvatarUrl(selectedChat.groupImage, chatTitle)
    : getAvatarUrl(otherParticipantObj.profileImage, chatTitle);

  const currentTypingUser = typingUsers[selectedChat._id];
  const typingUserObj = currentTypingUser && Array.isArray(selectedChat.participants)
    ? selectedChat.participants.find(p => (typeof p === 'object' ? p.name : '') === currentTypingUser) 
    : null;
  const typingUserAvatar = currentTypingUser ? getAvatarUrl(typingUserObj?.profileImage, currentTypingUser) : null;

  const isPendingGroupInvite = isGroup && Array.isArray(selectedChat.pendingParticipants) && selectedChat.pendingParticipants.some(p => (typeof p === 'object' ? p._id : p) === user?._id);
  const isPendingOneOnOne = !isGroup && selectedChat.status === 'pending';
  const isPending = isPendingGroupInvite || isPendingOneOnOne;
  const isRejected = !isGroup && selectedChat.status === 'rejected';

  const headerClickable = !isPending && !isRejected;

  const hasDownloadableMedia = messages.some(m => 
    selectedMessages.includes(m._id) && (m.file || (m.attachments && m.attachments.length > 0))
  );

  return (
    <div className="chat-window-wrapper" style={{ display: 'flex', flex: 1, flexDirection: 'row', minWidth: 0, width: '100%' }}>
      <div className="chat-window" style={{ flex: 1, borderRight: showUserProfile && !isGroup ? '1px solid rgba(255,255,255,0.05)' : 'none', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Chat Header / Bulk Action Bar */}
        {selectionMode ? (
          <div className="chat-header" style={{ background: 'var(--bg-card-hover)' }}>
            <div className="chat-header-info" style={{ cursor: 'default' }}>
              <button className="back-btn icon-btn" onClick={() => { setSelectionMode(false); setSelectedMessages([]); }}>
                <ArrowLeft size={24} />
              </button>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                  {selectedMessages.length}
                </span>
              </div>
            </div>
            <div className="chat-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
              {selectedMessages.length === 1 && (
                <>
                  <button className="icon-btn" onClick={handleBulkReply} title="Reply">
                    <Reply size={22} />
                  </button>
                  <button className="icon-btn" onClick={async () => {
                    const msgId = selectedMessages[0];
                    try {
                      await handleTogglePinMessage(selectedChat._id, msgId);
                      setSelectionMode(false);
                      setSelectedMessages([]);
                    } catch (err) {
                      console.error(err);
                    }
                  }} title={selectedChat?.pinnedMessages?.some(p => String(p._id || p) === String(selectedMessages[0])) ? "Unpin" : "Pin"}>
                    <Pin size={22} fill={selectedChat?.pinnedMessages?.some(p => String(p._id || p) === String(selectedMessages[0])) ? "currentColor" : "none"} />
                  </button>
                </>
              )}
              <button className="icon-btn" onClick={handleBulkCopy} title="Copy">
                <Copy size={22} />
              </button>
              <button className="icon-btn" onClick={handleBulkForward} title="Forward">
                <Forward size={22} />
              </button>
              {hasDownloadableMedia && (
                <button className="icon-btn" onClick={handleBulkDownload} title="Download">
                  <Download size={22} />
                </button>
              )}
              <button className="icon-btn" onClick={handleBulkDelete} style={{ color: '#ef4444' }} title="Delete">
                <Trash2 size={22} />
              </button>
            </div>
          </div>
        ) : (
          <div className="chat-header">
            <div 
              className="chat-header-info"
              style={{ cursor: headerClickable ? 'pointer' : 'default', padding: '4px', borderRadius: '8px', transition: 'background 0.2s' }}
              onClick={() => {
                if (!headerClickable) return;
                if (isGroup) {
                  setShowGroupInfo(true);
                } else {
                  setShowUserProfile(!showUserProfile);
                }
              }}
              title={headerClickable ? (isGroup ? 'Click for Group Info' : 'Click for User Info') : ''}
              onMouseEnter={(e) => { if (headerClickable) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <button 
                className="mobile-back-btn" 
                onClick={(e) => { e.stopPropagation(); setSelectedChat(null); }}
                style={{ 
                  background: 'transparent', border: 'none', color: 'var(--text-main)', 
                  cursor: 'pointer', marginRight: '8px', display: 'flex', alignItems: 'center'
                }}
              >
                <ArrowLeft size={20} />
              </button>
              <div className="avatar-wrapper" style={{ width: '40px', height: '40px' }}>
                <img src={chatAvatar} alt={chatTitle} className="avatar-img" />
                {isOnline && <div className="online-dot" />}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {chatTitle}
                  {isGroup && <Users size={14} color="var(--accent-primary)" />}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {isGroup ? (
                    `${selectedChat.participants.length} members`
                  ) : isOnline ? (
                    <span style={{ color: 'var(--status-online)', fontWeight: 600 }}>🟢 Online</span>
                  ) : (
                    'Offline'
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Pinned Messages Banner */}
      {pinnedMessages.length > 0 && (() => {
        const activeIndex = (pinnedMessages.length - 1) - (currentPinnedIndex % pinnedMessages.length);
        const activeMessage = pinnedMessages[activeIndex];
        const isImage = activeMessage?.messageType === 'image' || activeMessage?.attachments?.some(a => a.type?.startsWith('image/'));
        const hasThumb = isImage || activeMessage?.replyToAttachmentUrl;
        
        // Find thumbnail if available
        let thumbUrl = null;
        if (activeMessage?.file && activeMessage.messageType === 'image') thumbUrl = activeMessage.file;
        else if (activeMessage?.attachments?.find(a => a.type?.startsWith('image/'))) thumbUrl = activeMessage.attachments.find(a => a.type?.startsWith('image/')).url;
        
        return (
          <div style={{ 
            background: 'var(--bg-glass)', 
            borderBottom: '1px solid var(--border-glass)', 
            padding: '8px 16px', 
            display: 'flex', 
            alignItems: 'center',
            gap: '12px', 
            cursor: 'pointer',
            height: '48px'
          }} onClick={() => {
            const msgEl = document.getElementById(`message-${activeMessage._id}`);
            if (msgEl) {
              msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              
              // Flash highlight effect
              const originalBg = msgEl.style.background;
              const originalTransition = msgEl.style.transition;
              msgEl.style.transition = 'background 0.3s ease';
              msgEl.style.background = 'rgba(var(--accent-primary-rgb, 99, 102, 241), 0.3)';
              
              setTimeout(() => {
                msgEl.style.background = originalBg || 'transparent';
                setTimeout(() => {
                  msgEl.style.transition = originalTransition;
                }, 300);
              }, 1000);
            }
            setCurrentPinnedIndex(prev => (prev + 1) % pinnedMessages.length);
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '2px',
              height: '100%',
              width: '12px',
              alignItems: 'center'
            }}>
              {pinnedMessages.map((_, idx) => (
                <div key={idx} style={{
                  width: '4px',
                  flex: 1,
                  maxHeight: '12px',
                  background: (pinnedMessages.length - 1 - idx) === activeIndex ? 'var(--accent-primary)' : 'var(--text-muted)',
                  opacity: (pinnedMessages.length - 1 - idx) === activeIndex ? 1 : 0.4,
                  borderRadius: '2px',
                  transition: 'background 0.2s, opacity 0.2s'
                }} />
              ))}
            </div>
            
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                Pinned Message
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeMessage.text || (isImage ? '📷 Photo' : '📎 Attachment')}
              </div>
            </div>

            {hasThumb && thumbUrl && (
              <div style={{ width: '32px', height: '32px', flexShrink: 0, borderRadius: '4px', overflow: 'hidden' }}>
                <img src={`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}${thumbUrl}`} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </div>
        );
      })()}

      {/* Message Feed */}
      <div className="message-feed" onScroll={handleScroll}>
        {loadingMessages ? (
          <Loader text="Loading message history..." variant="orbit" />
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            No messages yet. Send a 👋 to break the ice!
          </div>
        ) : (
          messages.map((msg, index) => {
            const currentMsgDate = new Date(msg.createdAt).toDateString();
            const prevMsgDate = index > 0 ? new Date(messages[index - 1].createdAt).toDateString() : null;
            const showDivider = currentMsgDate !== prevMsgDate;

            let dividerText = '';
            if (showDivider) {
              const date = new Date(msg.createdAt);
              const today = new Date();
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              
              if (date.toDateString() === today.toDateString()) {
                dividerText = 'Today';
              } else if (date.toDateString() === yesterday.toDateString()) {
                dividerText = 'Yesterday';
              } else {
                dividerText = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
              }
            }

            return (
              <React.Fragment key={msg._id}>
                {showDivider && (
                  <div className="date-divider">
                    <span>{dividerText}</span>
                  </div>
                )}
                <Message 
                  message={msg} 
                  selectionMode={selectionMode}
                  isSelected={selectedMessages.includes(msg._id)}
                  isSingleSelection={selectedMessages.length === 1}
                  toggleSelection={toggleSelection}
                />
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom('smooth')}
          style={{
            position: 'absolute',
            bottom: '90px',
            right: '20px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-glass)',
            color: 'var(--text-main)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-card-hover)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-card)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          title="Scroll to bottom"
        >
          <ChevronDown size={24} />
        </button>
      )}

      {/* Conditional Message Input or Request Status */}
      {isPending ? (
        <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          {isPendingOneOnOne && selectedChat.initiatedBy === user._id ? (
            <p style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
              Contact Request sent. Waiting for {chatTitle} to accept...
            </p>
          ) : (
            <div>
              {isGroup ? (
                <p style={{ marginBottom: '16px', fontWeight: 600 }}>
                  You have been invited to join the group <strong>{chatTitle}</strong> ({selectedChat.participants?.length + (selectedChat.pendingParticipants?.length || 0)} members).
                </p>
              ) : (
                <p style={{ marginBottom: '16px', fontWeight: 600 }}>{chatTitle} wants to connect with you.</p>
              )}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                <button onClick={handleReject} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '8px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                  Reject
                </button>
                <button onClick={handleAccept} style={{ background: '#6366f1', color: '#fff', padding: '8px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                  Accept Request
                </button>
              </div>
            </div>
          )}
        </div>
      ) : isRejected ? (
        <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <p style={{ color: '#f87171', fontWeight: 600 }}>This contact request was rejected.</p>
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%' }}>
          {/* Floating Snapchat-style Typing Indicator */}
          {currentTypingUser && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: '20px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-glass)',
              backdropFilter: 'blur(10px)',
              padding: '6px 14px 6px 6px',
              borderRadius: '24px',
              borderBottomLeftRadius: '4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              border: '1px solid var(--border-glass)',
              zIndex: 10,
              animation: 'slideUp 0.3s ease-out'
            }}>
              <img 
                src={typingUserAvatar} 
                alt={currentTypingUser} 
                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', marginRight: '10px' }} 
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600, marginRight: '8px' }}>
                {currentTypingUser}
              </span>
              <div className="typing-dots-animation">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}
          {canSendMessage ? (
            <MessageInput />
          ) : (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', background: 'var(--bg-glass)', borderRadius: '12px', margin: '0 16px 16px 16px' }}>
              {selectedChat.announcementMode ? 'Only admins can send messages' : 'You do not have permission to send messages'}
            </div>
          )}
        </div>
      )}

      {showGroupInfo && isGroup && (
        <GroupInfoModal onClose={() => setShowGroupInfo(false)} />
      )}
      </div>

      {/* Right Sidebar for User Profile */}
      {showUserProfile && !isGroup && otherParticipant && selectedChat.status === 'accepted' && (
        <UserProfileSidebar 
          user={otherParticipant} 
          onClose={() => setShowUserProfile(false)} 
        />
      )}

      {/* Forward Message Modal */}
      {messageToForward && <ForwardMessageModal />}
    </div>
  );
};

export default ChatWindow;
