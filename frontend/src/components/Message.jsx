import React, { useState, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { Check, CheckCheck, Reply, Trash2, Smile, FileText, Forward, Image as ImageIcon, ChevronDown, Copy, Pin, Flag } from 'lucide-react';
import CustomAudioPlayer from './CustomAudioPlayer';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';
import { useConfirm } from '../context/ConfirmContext';
import { getAvatarUrl } from '../utils/getAvatarUrl';
import ImageViewer from './ImageViewer';
import ReportModal from './ReportModal';
import api from '../services/api';

const Message = ({ message, selectionMode, isSelected, isSingleSelection, toggleSelection }) => {
  const { user } = useAuth();
  const { selectedChat, setReplyTo, setMessageToForward, toggleReaction, deleteMessage, handleTogglePinMessage } = useChat();
  const { theme } = useTheme();
  const confirm = useConfirm();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [viewerImages, setViewerImages] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [showDesktopMenu, setShowDesktopMenu] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [pickerPosition, setPickerPosition] = useState('top');
  const dropdownRef = useRef(null);
  const messageRef = useRef(null);

  const handleToggleEmojiPicker = (e) => {
    e.stopPropagation();
    if (!showEmojiPicker) {
      if (messageRef.current) {
        const rect = messageRef.current.getBoundingClientRect();
        if (rect.top < 380) {
          setPickerPosition('bottom');
        } else {
          setPickerPosition('top');
        }
      }
    }
    setShowEmojiPicker(!showEmojiPicker);
    setShowDesktopMenu(false);
  };
  
  const isAdmin = selectedChat?.isGroup && (
    selectedChat.groupAdmin === user?._id || 
    selectedChat.groupAdmin?._id === user?._id ||
    selectedChat.groupAdmins?.includes(user?._id) || 
    selectedChat.groupAdmins?.some(a => a?._id === user?._id)
  );

  const isPinned = selectedChat?.pinnedMessages?.some(p => String(p._id || p) === String(message._id));

  // Find current user's reaction
  const myReaction = message.reactions?.find(
    (r) => (r.user?._id || r.user) === user?._id
  );
  
  const autoDownloadMedia = user?.settings?.chat?.autoDownloadMedia ?? true;
  
  // Check local storage to see if this specific message's media was already manually downloaded
  const [isMediaDownloaded, setIsMediaDownloaded] = useState(() => {
    const downloadedList = JSON.parse(localStorage.getItem('downloaded_media') || '[]');
    return downloadedList.includes(message._id) || false;
  });
  const [isMediaDownloading, setIsMediaDownloading] = useState(false);

  // Swipe to reply state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const isScrolling = useRef(null);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isScrolling.current = null;
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!touchStartX.current || !touchStartY.current) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;

    if (isScrolling.current === null) {
      isScrolling.current = Math.abs(deltaY) > Math.abs(deltaX);
    }

    if (isScrolling.current) return;

    if (deltaX > 0) {
      setSwipeOffset(Math.min(deltaX * 0.5, 60)); // 0.5 factor for resistance, max 60px
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset >= 50) {
      setReplyTo(message);
    }
    setSwipeOffset(0);
    setIsSwiping(false);
    touchStartX.current = null;
    touchStartY.current = null;
    isScrolling.current = null;
  };

  const senderId = typeof message.sender === 'object' ? message.sender?._id : message.sender;
  const currentUserId = typeof user === 'object' ? user?._id : user;
  const isSentByMe = Boolean(senderId && currentUserId && String(senderId) === String(currentUserId));

  const handleDelete = async () => {
    const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
    const msgTime = new Date(message.createdAt).getTime();
    const isWithinTimeLimit = (Date.now() - msgTime) < FORTY_EIGHT_HOURS;
    const action = await confirm('Delete message?', { type: 'delete', allowDeleteForEveryone: isSentByMe && isWithinTimeLimit });
    if (action === 'for_me' || action === 'for_everyone') {
      deleteMessage(message._id, action);
    }
  };

  const handleAdminDelete = async () => {
    if (await confirm('As an admin, delete this message for everyone?', { type: 'delete', allowDeleteForEveryone: true })) {
      try {
        await api.delete(`/groups/${selectedChat._id}/messages/${message._id}`);
        toast.success('Message deleted for everyone');
      } catch (err) {
        toast.error('Failed to delete message');
      }
    }
  };

  const handlePin = async () => {
    try {
      await handleTogglePinMessage(selectedChat._id, message._id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReport = () => {
    setIsReporting(true);
    setShowDesktopMenu(false);
  };

  const handleReportSubmit = async (reason, description) => {
    try {
      await api.post(`/groups/${selectedChat._id}/messages/${message._id}/report`, { reason, description });
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        throw new Error(err.response.data.message);
      }
      throw new Error('Failed to report message');
    }
  };

  // Auto-download logic: Set to true initially if sent by me OR autoDownload is enabled
  if (isMediaDownloaded === false && (isSentByMe || autoDownloadMedia)) {
    setIsMediaDownloaded(true);
  }

  const handleDownload = () => {
    if (isMediaDownloading) return;
    setIsMediaDownloading(true);
    
    const img = new Image();
    img.src = `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}${message.file}`;
    img.onload = () => {
      setIsMediaDownloaded(true);
      setIsMediaDownloading(false);
      // Save to localStorage so it remembers it's downloaded
      const downloadedList = JSON.parse(localStorage.getItem('downloaded_media') || '[]');
      if (!downloadedList.includes(message._id)) {
        downloadedList.push(message._id);
        localStorage.setItem('downloaded_media', JSON.stringify(downloadedList));
      }
    };
    img.onerror = () => {
      setIsMediaDownloading(false);
    };
  };

  // Determine read status for receipt
  const isReadByOthers = message.readBy && message.readBy.some((r) => {
    const rUserId = typeof r.user === 'object' ? r.user?._id : r.user;
    return rUserId && String(rUserId) !== String(currentUserId);
  });

  // Map the font size setting to actual CSS rem values
  const fontSizeMap = { small: '0.85rem', medium: '0.95rem', large: '1.15rem' };
  const messageFontSize = fontSizeMap[user?.settings?.chat?.fontSize] || '0.95rem';

  const getReplyPreviewText = (replyMsg) => {
    if (replyMsg.text) return replyMsg.text;
    
    const PhotoLabel = () => <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ImageIcon size={14} /> Photo</div>;
    const AlbumLabel = () => <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ImageIcon size={14} /> Album</div>;
    const DocumentLabel = () => <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FileText size={14} /> Document</div>;

    if (message.replyToAttachmentUrl) return <PhotoLabel />;
    const hasMultipleAttachments = replyMsg.attachments && replyMsg.attachments.length > 1;
    const isImage = replyMsg.attachments?.some(a => a.type?.startsWith('image/')) || replyMsg.fileType?.startsWith('image/');
    
    if (hasMultipleAttachments) return <AlbumLabel />;
    if (isImage) return <PhotoLabel />;
    if (replyMsg.file) return <DocumentLabel />;
    
    return 'Attachment';
  };

  const getReplyThumbnail = (replyMsg) => {
    if (message.replyToAttachmentUrl) {
      return message.replyToAttachmentUrl.startsWith('http') ? message.replyToAttachmentUrl : `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}${message.replyToAttachmentUrl}`;
    }
    const firstImage = replyMsg.attachments?.find(a => a.type?.startsWith('image/'));
    if (firstImage && firstImage.url) {
      return firstImage.url.startsWith('http') ? firstImage.url : `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}${firstImage.url}`;
    }
    if (replyMsg.fileType?.startsWith('image/') && replyMsg.file) {
      return replyMsg.file.startsWith('http') ? replyMsg.file : `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}${replyMsg.file}`;
    }
    return null;
  };

  if (message.messageType === 'system') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0', width: '100%' }}>
        <div style={{ 
          background: 'var(--bg-glass)', 
          padding: '6px 16px', 
          borderRadius: '16px', 
          fontSize: '0.8rem', 
          color: 'var(--text-muted)',
          border: '1px solid var(--border-glass)',
          textAlign: 'center',
          maxWidth: '80%',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <>
    <div 
      ref={messageRef}
      id={`message-${message._id}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ 
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box',
        zIndex: (showEmojiPicker || showDesktopMenu) ? 100 : 1
      }}
    >
      <div 
        style={{ width: '100%', position: 'relative' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setShowDesktopMenu(false); }}
      >
      {/* Swipe to reply icon */}
      <div style={{
        position: 'absolute',
        left: '16px',
        top: '50%',
        transform: `translateY(-50%) scale(${swipeOffset > 10 ? Math.min(swipeOffset / 50, 1) : 0})`,
        opacity: swipeOffset > 10 ? Math.min(swipeOffset / 50, 1) : 0,
        transition: isSwiping ? 'none' : 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-glass)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        zIndex: 0
      }}>
        <Reply size={18} color="var(--text-main)" />
      </div>

      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center',
          width: '100%',
          padding: '0 8px',
          cursor: selectionMode ? 'pointer' : 'default',
          background: selectionMode && isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), background 0.3s',
          transform: `translateX(${swipeOffset}px)`,
          position: 'relative',
          zIndex: showDesktopMenu ? 50 : 1,
          boxSizing: 'border-box'
        }}
        onClick={(e) => {
          if (selectionMode) toggleSelection(message._id);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (!selectionMode) toggleSelection(message._id);
        }}
      >
        {/* WhatsApp-style Reaction Popup */}
        {selectionMode && isSelected && isSingleSelection && (
          <div style={{
            position: 'absolute',
            top: '-50px',
            [isSentByMe ? 'right' : 'left']: '40px',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-glass)',
            borderRadius: '24px',
            padding: '6px 12px',
            display: 'flex',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            zIndex: 50,
            animation: 'popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => {
              const isSelectedReaction = myReaction?.emoji === emoji;
              return (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleReaction(message._id, emoji);
                    toggleSelection(message._id); // Exit selection mode
                  }}
                  style={{
                    background: isSelectedReaction ? 'rgba(99, 102, 241, 0.2)' : 'none', 
                    border: 'none', 
                    fontSize: '1.5rem', 
                    cursor: 'pointer',
                    padding: '4px 8px', 
                    borderRadius: '12px',
                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transform: isSelectedReaction ? 'scale(1.1)' : 'scale(1)'
                  }}
                  onMouseEnter={e => { if (!isSelectedReaction) e.currentTarget.style.transform = 'scale(1.2)' }}
                  onMouseLeave={e => { if (!isSelectedReaction) e.currentTarget.style.transform = 'scale(1)' }}
                >
                  {emoji}
                </button>
              );
            })}
            <div style={{ width: '1px', background: 'var(--border-glass)', margin: '0 4px' }} />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleEmojiPicker();
                toggleSelection(message._id);
              }}
              style={{
                background: 'var(--bg-glass)', border: 'none', borderRadius: '50%',
                width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-main)', fontSize: '1.2rem',
                alignSelf: 'center'
              }}
            >
              +
            </button>
          </div>
        )}

        <div 
          className={`message-item ${isSentByMe ? 'sent' : 'received'}`} 
          style={{ 
            opacity: selectionMode && !isSelected ? 0.7 : 1,
            minWidth: 0, // Prevent flex overflow
            marginLeft: isSentByMe ? 'auto' : '0'
          }}
        >
        {!isSentByMe && (
          <img
            src={getAvatarUrl(message.sender?.profileImage, message.sender?.name)}
            alt={message.sender?.name}
            style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }}
          />
        )}

        <div className="message-content">
          {!isSentByMe && <span className="message-sender-name">{message.sender?.name}</span>}

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flexDirection: isSentByMe ? 'row-reverse' : 'row' }}>
            <div 
              className="message-bubble" 
              style={{ 
                fontSize: messageFontSize,
                position: 'relative'
              }}
            >
              {/* Desktop Hover Menu Button */}
              {isHovered && !selectionMode && (
                <div 
                  className="desktop-only"
                  onClick={(e) => { e.stopPropagation(); setShowDesktopMenu(!showDesktopMenu); }}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: 'rgba(0,0,0,0.5)',
                    borderRadius: '50%',
                    padding: '2px',
                    cursor: 'pointer',
                    zIndex: 10,
                    backdropFilter: 'blur(4px)',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                  }}
                >
                  <ChevronDown size={16} color="#fff" />
                </div>
              )}

              {/* Desktop Dropdown Menu */}
              {showDesktopMenu && (
                <div 
                  className="desktop-only"
                  style={{
                    position: 'absolute',
                    top: '28px',
                    [isSentByMe ? 'right' : 'left']: '4px',
                    zIndex: 60,
                    display: 'flex',
                    flexDirection: 'column',
                    width: 'max-content'
                  }}
                >
                  {/* Reaction Bar (Floating above) */}
                  <div style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 8px)',
                    [isSentByMe ? 'right' : 'left']: '0',
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '999px',
                    padding: '8px 14px',
                    gap: '12px',
                    boxShadow: 'var(--shadow-md, 0 4px 12px rgba(0,0,0,0.2))',
                    fontSize: '1.25rem'
                  }}>
                    {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                      <span 
                        key={emoji}
                        onClick={(e) => { e.stopPropagation(); toggleReaction(message._id, emoji); setShowDesktopMenu(false); }}
                        style={{ cursor: 'pointer', transition: 'transform 0.2s', lineHeight: 1 }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      >{emoji}</span>
                    ))}
                    <span 
                      onClick={(e) => { e.stopPropagation(); handleToggleEmojiPicker(); setShowDesktopMenu(false); }}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '1.2rem', lineHeight: 1, paddingLeft: '4px' }}
                    >+</span>
                  </div>

                  {/* Vertical Menu */}
                  <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '12px',
                    padding: '8px 0',
                    boxShadow: 'var(--shadow-md, 0 4px 12px rgba(0,0,0,0.2))',
                    minWidth: '180px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <button 
                      className="menu-item"
                      onClick={(e) => { e.stopPropagation(); setReplyTo(message); setShowDesktopMenu(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 20px', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '0.95rem' }}
                    >
                      <Reply size={18} /> Reply
                    </button>
                    {message.text && (
                      <button 
                        className="menu-item"
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(message.text); setShowDesktopMenu(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 20px', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '0.95rem' }}
                      >
                        <Copy size={18} /> Copy
                      </button>
                    )}
                    <button 
                      className="menu-item"
                      onClick={handleToggleEmojiPicker}
                      style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 20px', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '0.95rem' }}
                    >
                      <Smile size={18} /> React
                    </button>
                    <button 
                      className="menu-item"
                      onClick={(e) => { e.stopPropagation(); setMessageToForward(message); setShowDesktopMenu(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 20px', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '0.95rem' }}
                    >
                      <Forward size={18} /> Forward
                    </button>
                    {isSentByMe ? (
                      <button 
                        className="menu-item"
                        onClick={(e) => { e.stopPropagation(); handleDelete(); setShowDesktopMenu(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 20px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '0.95rem' }}
                      >
                        <Trash2 size={18} /> Delete
                      </button>
                    ) : isAdmin && selectedChat?.isGroup ? (
                      <button 
                        className="menu-item"
                        onClick={(e) => { e.stopPropagation(); handleAdminDelete(); setShowDesktopMenu(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 20px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '0.95rem' }}
                      >
                        <Trash2 size={18} /> Delete for Everyone
                      </button>
                    ) : null}
                    
                    <button 
                      className="menu-item"
                      onClick={(e) => { e.stopPropagation(); handlePin(); setShowDesktopMenu(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 20px', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '0.95rem' }}
                    >
                      <Pin size={18} /> {isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    
                    {!isSentByMe && selectedChat?.isGroup && (
                      <button 
                        className="menu-item"
                        onClick={(e) => { e.stopPropagation(); handleReport(); setShowDesktopMenu(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 20px', background: 'transparent', border: 'none', color: '#f59e0b', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '0.95rem' }}
                      >
                        <Flag size={18} /> Report
                      </button>
                    )}
                  </div>
                </div>
              )}

            {message.isForwarded && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontStyle: 'italic', fontSize: '0.75rem', opacity: 0.7, marginBottom: '6px' }}>
                <Forward size={12} />
                <span>Forwarded</span>
              </div>
            )}
          {/* Reply reference banner */}
          {message.replyTo && (
            <div 
              className="reply-reference" 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                const targetId = typeof message.replyTo === 'object' ? message.replyTo._id : message.replyTo;
                const el = document.getElementById(`message-${targetId}`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  
                  // Pulse the entire message row background like WhatsApp
                  const originalBg = el.style.background;
                  const originalTransition = el.style.transition;
                  
                  el.style.transition = 'background 0.3s ease';
                  el.style.background = 'rgba(16, 185, 129, 0.15)'; // subtle light green highlight
                  
                  setTimeout(() => {
                    el.style.transition = 'background 3s ease';
                    el.style.background = originalBg || 'transparent';
                    
                    setTimeout(() => {
                      el.style.transition = originalTransition;
                    }, 3000);
                  }, 2000);
                }
              }}
            >
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '2px', color: 'var(--accent-primary)' }}>
                  {(() => {
                    const sender = message.replyTo.sender;
                    if (!sender) return 'User';
                    
                    const senderId = typeof sender === 'object' && sender !== null ? (sender._id || sender) : sender;
                    const myId = user?._id;
                    
                    if (String(senderId) === String(myId)) return 'You';
                    
                    if (typeof sender === 'object' && sender !== null && sender.name) {
                      return sender.name;
                    }
                    
                    return 'User';
                  })()}
                </div>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {getReplyPreviewText(message.replyTo)}
                </div>
              </div>
              {getReplyThumbnail(message.replyTo) && (
                <div style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                  <img src={getReplyThumbnail(message.replyTo)} alt="Reply preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                </div>
              )}
            </div>
          )}

          {/* Attachments Preview */}
          {message.attachments && message.attachments.length > 0 ? (
            <div style={{ marginBottom: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '400px', borderRadius: '12px', overflow: 'hidden' }}>
              {message.attachments.map((att, idx) => {
                const isImage = att.type && att.type.startsWith('image/');
                return isImage ? (
                  <div key={idx} style={{ position: 'relative', flex: message.attachments.length === 1 ? '1 1 100%' : '1 1 calc(50% - 4px)', minWidth: '120px' }}>
                    <img
                      src={`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}${att.url}`}
                      alt="Attachment"
                      style={{ width: '100%', height: message.attachments.length === 1 ? 'auto' : '150px', maxHeight: '300px', objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                      onClick={() => {
                        const imageAtts = message.attachments.filter(a => a.type && a.type.startsWith('image/'));
                        const clickedIndex = imageAtts.findIndex(a => a.url === att.url);
                        setViewerImages(imageAtts.map(a => ({ url: `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}${a.url}`, name: a.name })));
                        setViewerIndex(clickedIndex >= 0 ? clickedIndex : 0);
                      }}
                    />
                  </div>
                ) : (att.type && att.type.startsWith('audio/')) || (att.name && att.name.toLowerCase().endsWith('.webm')) || (att.url && att.url.toLowerCase().endsWith('.webm')) ? (
                  <div key={idx} style={{ padding: '2px', width: '100%' }}>
                    <CustomAudioPlayer audioSrc={`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}${att.url}`} sender={message.sender} />
                  </div>
                ) : (
                  <a
                    key={idx}
                    href={`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}${att.url}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', color: 'inherit', textDecoration: 'none', marginBottom: '4px' }}
                  >
                    <FileText size={18} />
                    <span style={{ fontSize: '0.85rem' }}>{att.name || 'Download File'}</span>
                  </a>
                );
              })}
            </div>
          ) : message.file ? (
            <div style={{ marginBottom: '8px', position: 'relative' }}>
              {message.messageType === 'image' ? (
                <div style={{ position: 'relative', width: 'fit-content' }}>
                  {isMediaDownloaded ? (
                    <img
                      src={`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}${message.file}`}
                      alt="Attachment"
                      style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '12px', cursor: 'pointer' }}
                      onClick={() => {
                        setViewerImages([{ url: `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}${message.file}`, name: message.fileName }]);
                        setViewerIndex(0);
                      }}
                    />
                  ) : (
                    <div style={{ 
                      width: '240px', 
                      height: '240px', 
                      background: 'linear-gradient(135deg, rgba(20,40,60,0.8), rgba(10,20,30,0.9))', 
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '12px', 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center',
                      cursor: isMediaDownloading ? 'default' : 'pointer',
                      overflow: 'hidden',
                      position: 'relative'
                    }} onClick={!isMediaDownloading ? handleDownload : undefined}>
                      
                      {/* WhatsApp style blurred background effect */}
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', filter: 'blur(20px)' }}></div>
                      
                      {isMediaDownloading ? (
                        <div style={{ position: 'relative', zIndex: 2, background: 'rgba(0,0,0,0.5)', padding: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div className="spinner" style={{ width: '30px', height: '30px', borderWidth: '3px', borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }}></div>
                        </div>
                      ) : (
                        <div style={{ position: 'relative', zIndex: 2, background: 'rgba(0,0,0,0.5)', padding: '10px 16px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                          <FileText size={18} />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Download</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (message.messageType === 'audio' || (message.file && message.file.endsWith('.webm'))) ? (
                <div style={{ padding: '2px' }}>
                  <CustomAudioPlayer audioSrc={`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}${message.file}`} sender={message.sender} />
                </div>
              ) : (
                <a
                  href={`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}${message.file}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', color: 'inherit', textDecoration: 'none' }}
                >
                  <FileText size={18} />
                  <span style={{ fontSize: '0.85rem' }}>{message.fileName || 'Download File'}</span>
                </a>
              )}
            </div>
          ) : null}

          {/* Message Text */}
          <div style={{ fontStyle: message.isDeleted ? 'italic' : 'normal', opacity: message.isDeleted ? 0.7 : 1 }}>
            {message.text}
          </div>

          {/* Message Footer: timestamp + read receipts */}
          <div className="message-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', width: '100%', marginTop: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {isPinned && <Pin size={14} color="var(--text-muted)" fill="var(--text-muted)" style={{ opacity: 0.8 }} />}
              <span>
                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {message.isEdited && <span style={{ opacity: 0.6 }}>(edited)</span>}
              {isSentByMe && (
                <span className={`read-receipt ${isReadByOthers ? 'read' : ''}`}>
                  {isReadByOthers ? <CheckCheck size={16} color="#34b7f1" /> : <CheckCheck size={16} color="#9ca3af" />}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

        {/* Reaction Pills */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="reactions-bar">
            {message.reactions.map((r, idx) => {
              const isMyReaction = (r.user?._id || r.user) === user?._id;
              return (
                <span 
                  key={idx} 
                  className="reaction-pill" 
                  title={r.user?.name || 'Reaction'}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleReaction(message._id, r.emoji);
                  }}
                  style={{
                    cursor: 'pointer',
                    background: isMyReaction ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-glass)',
                    border: isMyReaction ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid var(--border-glass)'
                  }}
                >
                  {r.emoji}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Emoji Popover */}
      {showEmojiPicker && (
        <>
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }} 
            onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(false); toggleSelection(message._id); }}
          />
          <div
            style={{
              position: 'absolute',
              ...(pickerPosition === 'bottom' ? { top: '100%', marginTop: '8px' } : { bottom: '100%', marginBottom: '8px' }),
              [isSentByMe ? 'right' : 'left']: '40px',
              zIndex: 51
            }}
            onClick={e => e.stopPropagation()}
          >
            <EmojiPicker 
              onEmojiClick={(emojiObject) => {
                toggleReaction(message._id, emojiObject.emoji);
                setShowEmojiPicker(false);
                toggleSelection(message._id); // Exit selection mode
              }}
              theme={theme === 'dark' ? 'dark' : 'light'}
              lazyLoadEmojis={true}
              skinTonesDisabled
              searchDisabled
              height={350}
            />
          </div>
        </>
      )}
        </div>
      </div>
      </div>
    </div>
    {viewerImages && (
      <ImageViewer 
        images={viewerImages} 
        initialIndex={viewerIndex} 
        onClose={() => setViewerImages(null)}
        sender={message.sender}
        timestamp={message.createdAt}
        onReply={(currentImageUrl) => {
          setReplyTo({ ...message, specificAttachmentUrl: currentImageUrl });
          setViewerImages(null);
        }}
        onForward={() => {
          setMessageToForward(message);
          setViewerImages(null);
        }}
        onReact={(emoji) => {
          toggleReaction(message._id, emoji);
        }}
      />
    )}
      {isReporting && (
        <ReportModal
          onClose={() => setIsReporting(false)}
          onSubmit={handleReportSubmit}
        />
      )}
    </>
  );
};

export default Message;
