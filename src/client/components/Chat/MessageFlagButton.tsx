import React, { useState } from 'react';
import './MessageFlagButton.css';

interface MessageFlagButtonProps {
  messageId: string;
  onFlag: (
    messageId: string,
    reason: string,
    severity: 'low' | 'medium' | 'high'
  ) => Promise<void>;
  disabled?: boolean;
}

const MessageFlagButton: React.FC<MessageFlagButtonProps> = ({
  messageId,
  onFlag,
  disabled = false,
}) => {
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFlagClick = () => {
    setShowFlagModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    try {
      const finalReason =
        reason === 'other' ? customReason.trim() : reason.trim();
      await onFlag(messageId, finalReason, severity);
      setShowFlagModal(false);
      setReason('');
      setCustomReason('');
      setSeverity('medium');
    } catch (error) {
      console.error('Error flagging message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowFlagModal(false);
    setReason('');
    setCustomReason('');
    setSeverity('medium');
  };

  return (
    <>
      <button
        className="message-flag-button"
        onClick={handleFlagClick}
        disabled={disabled}
        title="Flag message for moderation"
      >
        🚩
      </button>

      {showFlagModal && (
        <div className="flag-modal-overlay">
          <div className="flag-modal">
            <div className="flag-modal-header">
              <h3>Flag Message for Moderation</h3>
              <button
                className="flag-modal-close"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flag-modal-form">
              <div className="flag-form-group">
                <label htmlFor="flag-reason">Reason for flagging:</label>
                <select
                  id="flag-reason"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Select a reason...</option>
                  <option value="inappropriate-language">
                    Inappropriate language
                  </option>
                  <option value="spam">Spam or unwanted content</option>
                  <option value="harassment">Harassment or bullying</option>
                  <option value="off-topic">Off-topic or irrelevant</option>
                  <option value="personal-information">
                    Personal information shared
                  </option>
                  <option value="other">Other (please specify)</option>
                </select>
              </div>

              {reason === 'other' && (
                <div className="flag-form-group">
                  <label htmlFor="flag-custom-reason">Custom reason:</label>
                  <textarea
                    id="flag-custom-reason"
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    placeholder="Please describe the issue..."
                    required
                    disabled={isSubmitting}
                    rows={3}
                  />
                </div>
              )}

              <div className="flag-form-group">
                <label htmlFor="flag-severity">Severity level:</label>
                <select
                  id="flag-severity"
                  value={severity}
                  onChange={e =>
                    setSeverity(e.target.value as 'low' | 'medium' | 'high')
                  }
                  disabled={isSubmitting}
                >
                  <option value="low">Low - Minor issue</option>
                  <option value="medium">Medium - Moderate concern</option>
                  <option value="high">High - Serious violation</option>
                </select>
              </div>

              <div className="flag-modal-actions">
                <button
                  type="button"
                  className="flag-cancel-button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flag-submit-button"
                  disabled={
                    isSubmitting ||
                    !reason.trim() ||
                    (reason === 'other' && !customReason.trim())
                  }
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Flag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default MessageFlagButton;
