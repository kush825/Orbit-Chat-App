import React, { useState } from 'react';

const MuteModal = ({ isOpen, onClose, onMute }) => {
  const [selectedDuration, setSelectedDuration] = useState('always');

  if (!isOpen) return null;

  const handleSubmit = () => {
    onMute(selectedDuration);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '350px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '1.25rem', fontWeight: 600 }}>
          Mute message notifications
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <input 
              type="radio" 
              name="muteDuration" 
              value="8_hours"
              checked={selectedDuration === '8_hours'}
              onChange={(e) => setSelectedDuration(e.target.value)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
            />
            <span style={{ fontSize: '1rem', color: 'var(--text-main)' }}>8 hours</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <input 
              type="radio" 
              name="muteDuration" 
              value="1_day"
              checked={selectedDuration === '1_day'}
              onChange={(e) => setSelectedDuration(e.target.value)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
            />
            <span style={{ fontSize: '1rem', color: 'var(--text-main)' }}>1 day</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <input 
              type="radio" 
              name="muteDuration" 
              value="1_week"
              checked={selectedDuration === '1_week'}
              onChange={(e) => setSelectedDuration(e.target.value)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
            />
            <span style={{ fontSize: '1rem', color: 'var(--text-main)' }}>1 week</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <input 
              type="radio" 
              name="muteDuration" 
              value="always"
              checked={selectedDuration === 'always'}
              onChange={(e) => setSelectedDuration(e.target.value)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
            />
            <span style={{ fontSize: '1rem', color: 'var(--text-main)' }}>Always</span>
          </label>
        </div>
        
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
              color: 'var(--accent-primary)', 
              fontWeight: 500, 
              fontSize: '0.95rem',
              cursor: 'pointer' 
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default MuteModal;
