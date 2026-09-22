import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmContext = createContext();

export const useConfirm = () => {
  return useContext(ConfirmContext);
};

export const ConfirmProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [options, setOptions] = useState(null);
  const [resolveFn, setResolveFn] = useState(null);

  const confirm = useCallback((msg, opts = null) => {
    setMessage(msg);
    setOptions(opts);
    setIsOpen(true);
    return new Promise((resolve) => {
      setResolveFn(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    if (resolveFn) resolveFn(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolveFn) resolveFn(false);
    setIsOpen(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {isOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ 
            width: '400px', 
            maxWidth: '90vw', 
            padding: '24px', 
            display: 'flex', 
            flexDirection: 'column',
            gap: '20px',
            animation: 'modalSlideIn 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '12px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444'
              }}>
                <AlertTriangle size={24} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', flex: 1, lineHeight: '1.4' }}>
                {message}
              </h3>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button 
                onClick={handleCancel}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-main)',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = 'var(--bg-glass)'}
                onMouseOut={(e) => e.target.style.background = 'transparent'}
              >
                Cancel
              </button>
              
              {options?.type === 'delete' ? (
                <>
                  <button 
                    onClick={() => { if (resolveFn) resolveFn('for_me'); setIsOpen(false); }}
                    style={{
                      background: 'transparent',
                      border: '1px solid #ef4444',
                      color: '#ef4444',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.target.style.background = '#ef4444'; e.target.style.color = '#fff'; }}
                    onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#ef4444'; }}
                  >
                    Delete for me
                  </button>
                  {options.allowDeleteForEveryone && (
                    <button 
                      onClick={() => { if (resolveFn) resolveFn('for_everyone'); setIsOpen(false); }}
                      style={{
                        background: '#ef4444',
                        border: 'none',
                        color: '#ffffff',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.background = '#dc2626'}
                      onMouseOut={(e) => e.target.style.background = '#ef4444'}
                    >
                      Delete for everyone
                    </button>
                  )}
                </>
              ) : (
                <button 
                  onClick={handleConfirm}
                  style={{
                    background: '#ef4444',
                    border: 'none',
                    color: '#ffffff',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#dc2626'}
                  onMouseOut={(e) => e.target.style.background = '#ef4444'}
                >
                  Confirm
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
