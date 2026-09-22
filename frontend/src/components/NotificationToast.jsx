import React from 'react';
import { MessageSquare, X } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const NotificationToast = () => {
  const { notificationToast, dismissToast, selectChatById } = useChat();

  if (!notificationToast) return null;

  const handleClick = () => {
    selectChatById(notificationToast.conversationId);
    dismissToast();
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'fixed',
        top: '80px',
        right: '24px',
        background: 'rgba(18, 24, 38, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(99, 102, 241, 0.4)',
        borderRadius: '16px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        maxWidth: '380px',
        minWidth: '280px',
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.6), 0 0 20px rgba(99, 102, 241, 0.25)',
        zIndex: 1000,
        cursor: 'pointer',
        animation: 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <img
          src={notificationToast.senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${notificationToast.senderName}`}
          alt={notificationToast.senderName}
          style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            background: 'var(--accent-gradient)',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MessageSquare size={10} color="#fff" />
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
            {notificationToast.senderName}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Just now</span>
        </div>
        <div
          style={{
            fontSize: '0.825rem',
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {notificationToast.text}
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          dismissToast();
        }}
        className="icon-btn"
        style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0 }}
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default NotificationToast;
