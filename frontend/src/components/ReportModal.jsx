import React, { useState } from 'react';
import { AlertTriangle, X, CheckCircle } from 'lucide-react';
import './ReportModal.css';

const REASONS = [
  'Spam',
  'Harassment',
  'Bullying',
  'Hate Speech',
  'Violence',
  'Sexual Content',
  'Scam/Fraud',
  'Fake Information',
  'Inappropriate Content',
  'Other'
];

const ReportModal = ({ onClose, onSubmit }) => {
  const [reason, setReason] = useState(REASONS[0]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit(reason, description);
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2500); // Auto close after 2.5s
    } catch (err) {
      setError(err.message || 'Failed to report. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="report-modal-overlay">
      <div className="report-modal-container" style={{ maxWidth: '500px' }}>
        {!isSuccess && (
          <button className="report-close-btn" onClick={onClose} disabled={isSubmitting}>
            <X size={20} />
          </button>
        )}
        
        {isSuccess ? (
          <div className="report-success-state">
            <div className="report-success-icon-wrapper">
              <CheckCircle size={48} color="#10b981" />
            </div>
            <h2>Success!</h2>
            <p>Your report has been submitted and will be reviewed by an administrator.</p>
          </div>
        ) : (
          <>
            <div className="report-modal-header">
              <div className="report-icon-wrapper">
                <AlertTriangle size={32} color="#f43f5e" />
              </div>
              <h2>Report Message</h2>
              <p>Please select a reason for reporting this message.</p>
            </div>

            <form onSubmit={handleSubmit} className="report-modal-form">
              <div className="report-form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>Reason</label>
                <select 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    marginBottom: '16px',
                    outline: 'none',
                    fontSize: '0.95rem'
                  }}
                >
                  {REASONS.map(r => (
                    <option key={r} value={r} style={{ background: '#1e293b' }}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="report-form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
                  Additional Details <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontWeight: 400 }}>(Optional, max 500 chars)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  placeholder="Provide any additional context..."
                  rows={4}
                  className="report-textarea"
                  disabled={isSubmitting}
                />
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                  {description.length}/500
                </div>
              </div>

              {error && <p className="report-error-text" style={{ marginTop: '0' }}>{error}</p>}
              <div className="report-modal-actions" style={{ marginTop: '24px' }}>
                <button type="button" className="report-btn-cancel" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="report-btn-submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportModal;
