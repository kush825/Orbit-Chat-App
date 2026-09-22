import React, { useState } from 'react';

const DeleteChatModal = ({ isOpen, onClose, onDelete, chatType }) => {
  const [alsoExitGroup, setAlsoExitGroup] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onDelete(alsoExitGroup);
    setAlsoExitGroup(false);
    onClose();
  };

  const isGroup = chatType === 'group';
  const isMultiple = chatType === 'multiple';

  let title = 'Delete this chat?';
  if (isGroup) title = 'Delete this group?';
  if (isMultiple) title = 'Delete these chats?';

  let submitText = 'Delete chat';
  if (isGroup) submitText = 'Delete group';
  if (isMultiple) submitText = 'Delete chats';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '350px' }}>
        <h3 style={{ marginBottom: isGroup ? '24px' : '32px', fontSize: '1.25rem', fontWeight: 600 }}>
          {title}
        </h3>
        
        {isGroup && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '32px' }}>
            <input 
              type="checkbox" 
              checked={alsoExitGroup}
              onChange={(e) => setAlsoExitGroup(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
            />
            <span style={{ fontSize: '1rem', color: 'var(--text-main)' }}>Also exit group</span>
          </label>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '24px' }}>
          <button 
            onClick={onClose}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-muted)', 
              fontWeight: 500, 
              fontSize: '0.95rem',
              cursor: 'pointer' 
            }}
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#ef4444', 
              fontWeight: 500, 
              fontSize: '0.95rem',
              cursor: 'pointer' 
            }}
          >
            {submitText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteChatModal;
