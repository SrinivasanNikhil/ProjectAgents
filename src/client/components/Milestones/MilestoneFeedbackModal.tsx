import React, { useEffect, useState } from 'react';

interface MilestoneFeedbackModalProps {
  milestoneId: string;
  isOpen: boolean;
  onClose: () => void;
  evaluatorId: string; // current user id
  recipientId: string; // student id
  onSubmitted?: (updatedMilestone: any) => void;
  defaultSubmissionId?: string;
}

const MilestoneFeedbackModal: React.FC<MilestoneFeedbackModalProps> = ({
  milestoneId,
  isOpen,
  onClose,
  evaluatorId,
  recipientId,
  onSubmitted,
  defaultSubmissionId,
}) => {
  const [rating, setRating] = useState<number>(3);
  const [comments, setComments] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRating(3);
      setComments('');
      setSubmitting(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const submitFeedback = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch(`/api/milestones/${milestoneId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          from: evaluatorId,
          to: recipientId,
          rating,
          comments: comments.trim(),
          submissionId: defaultSubmissionId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to submit feedback');
      }

      onSubmitted?.(data.data);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Submit Formal Feedback</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded w-28"
            >
              {[1,2,3,4,5].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              placeholder="Provide detailed feedback..."
            />
          </div>
        </div>
        <div className="px-6 py-3 border-t border-gray-200 flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-100 text-gray-800 hover:bg-gray-200 text-sm">Cancel</button>
          <button
            onClick={submitFeedback}
            disabled={submitting || comments.trim().length === 0}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MilestoneFeedbackModal;