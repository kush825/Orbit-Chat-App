import React, { useState, useEffect } from 'react';
import { X, Users, Check } from 'lucide-react';
import { createGroupConversation } from '../services/conversationService';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getAvatarUrl } from '../utils/getAvatarUrl';

const GroupModal = ({ onClose }) => {
  const { user } = useAuth();
  const { conversations, setSelectedChat, loadConversations } = useChat();
  const toast = useToast();
  const [groupName, setGroupName] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const contacts = conversations
      .filter((c) => !c.isGroup && c.status === 'accepted')
      .map((c) => c.participants.find((p) => p._id !== user._id))
      .filter(Boolean)
      .filter(u => {
        const isBlocked = user?.blockedUsers?.some(b => 
          (typeof b === 'object' ? b._id : b) === u._id
        );
        return !isBlocked;
      });
    
    // Deduplicate
    const uniqueContacts = Array.from(new Map(contacts.map(item => [item._id, item])).values());
    
    setAvailableUsers(uniqueContacts);
  }, [conversations, user._id]);

  const toggleUserSelection = (userId) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUserIds.length < 1) {
      toast.error('Please enter a group name and select at least 1 member');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', groupName);
      formData.append('users', JSON.stringify(selectedUserIds));

      const newGroup = await createGroupConversation(formData);
      setSelectedChat(newGroup);
      await loadConversations();
      onClose();
    } catch (err) {
      console.error('Failed to create group:', err);
      toast.error(err.response?.data?.message || 'Error creating group');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="var(--accent-primary)" />
            Create Group Chat
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Group Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Project Team 🚀"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Select Group Members</label>
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {availableUsers.map((u) => {
                const isSelected = selectedUserIds.includes(u._id);
                return (
                  <div
                    key={u._id}
                    onClick={() => toggleUserSelection(u._id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(99,102,241,0.2)' : 'var(--bg-glass)',
                      border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-glass)'}`,
                      cursor: 'pointer',
                    }}
                  >
                    <img
                      src={getAvatarUrl(u.profileImage, u.name)}
                      alt={u.name}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name)}`;
                      }}
                    />
                    <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600 }}>{u.name}</div>
                    {isSelected && <Check size={16} color="var(--accent-primary)" />}
                  </div>
                );
              })}
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={submitting} style={{ marginTop: '16px' }}>
            {submitting ? 'Creating Group...' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GroupModal;
