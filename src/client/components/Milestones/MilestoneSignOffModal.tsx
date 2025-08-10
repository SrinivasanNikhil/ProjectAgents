import React, { useEffect, useMemo, useState } from 'react';

interface PersonaRef {
  _id: string;
  name: string;
  role: string;
}

export type PersonaSignOffStatus = 'pending' | 'approved' | 'rejected' | 'requested-changes';

interface PersonaSignOffItem {
  _id: string;
  persona: PersonaRef;
  status: PersonaSignOffStatus;
  feedback?: string;
  satisfactionScore?: number;
}

interface MilestoneSignOffModalProps {
  milestoneId: string;
  personaSignOffs: PersonaSignOffItem[];
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (updatedMilestone: any) => void;
}

const statusOptions: PersonaSignOffStatus[] = [
  'pending',
  'approved',
  'rejected',
  'requested-changes',
];

const MilestoneSignOffModal: React.FC<MilestoneSignOffModalProps> = ({
  milestoneId,
  personaSignOffs,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [localSignOffs, setLocalSignOffs] = useState<Record<string, {
    status: PersonaSignOffStatus;
    feedback: string;
    satisfactionScore?: number;
  }>>({});
  const [savingForPersonaId, setSavingForPersonaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, { status: PersonaSignOffStatus; feedback: string; satisfactionScore?: number }> = {};
      for (const s of personaSignOffs) {
        initial[s.persona._id] = {
          status: s.status,
          feedback: s.feedback || '',
          satisfactionScore: s.satisfactionScore,
        };
      }
      setLocalSignOffs(initial);
      setError(null);
      setSavingForPersonaId(null);
    }
  }, [isOpen, personaSignOffs]);

  const handleChange = (personaId: string, field: 'status' | 'feedback' | 'satisfactionScore', value: any) => {
    setLocalSignOffs(prev => ({
      ...prev,
      [personaId]: {
        ...prev[personaId],
        [field]: field === 'satisfactionScore' ? (value === '' ? undefined : Number(value)) : value,
      },
    }));
  };

  const saveSignOff = async (personaId: string) => {
    const current = localSignOffs[personaId];
    if (!current) return;

    try {
      setSavingForPersonaId(personaId);
      setError(null);
      const response = await fetch(`/api/milestones/${milestoneId}/sign-off`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          personaId,
          status: current.status,
          feedback: current.feedback?.trim() || undefined,
          satisfactionScore: typeof current.satisfactionScore === 'number' ? current.satisfactionScore : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to update sign-off');
      }

      const data = await response.json();
      onUpdated?.(data.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update sign-off');
    } finally {
      setSavingForPersonaId(null);
    }
  };

  const completionPercentage = useMemo(() => {
    if (!personaSignOffs || personaSignOffs.length === 0) return 0;
    const approved = Object.entries(localSignOffs).filter(([id, s]) => s.status === 'approved').length;
    return Math.round((approved / personaSignOffs.length) * 100);
  }, [localSignOffs, personaSignOffs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Manage Persona Sign-offs</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
          )}

          <div>
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Overall Progress</span>
              <span>{completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className={`h-2 rounded-full ${completionPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${completionPercentage}%` }} />
            </div>
          </div>

          <ul className="divide-y divide-gray-200">
            {personaSignOffs.map((s) => (
              <li key={s._id} className="py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{s.persona.name}</div>
                    <div className="text-xs text-gray-500">{s.persona.role}</div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <select
                      aria-label={`status-${s.persona._id}`}
                      value={localSignOffs[s.persona._id]?.status || 'pending'}
                      onChange={(e) => handleChange(s.persona._id, 'status', e.target.value as PersonaSignOffStatus)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      {statusOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <input
                      aria-label={`score-${s.persona._id}`}
                      type="number"
                      min={1}
                      max={10}
                      placeholder="Score"
                      value={localSignOffs[s.persona._id]?.satisfactionScore ?? ''}
                      onChange={(e) => handleChange(s.persona._id, 'satisfactionScore', e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <button
                      onClick={() => saveSignOff(s.persona._id)}
                      disabled={savingForPersonaId === s.persona._id}
                      className="px-3 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
                    >
                      {savingForPersonaId === s.persona._id ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <textarea
                    aria-label={`feedback-${s.persona._id}`}
                    placeholder="Optional feedback"
                    value={localSignOffs[s.persona._id]?.feedback || ''}
                    onChange={(e) => handleChange(s.persona._id, 'feedback', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    rows={2}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-100 text-gray-800 hover:bg-gray-200 text-sm">Close</button>
        </div>
      </div>
    </div>
  );
};

export default MilestoneSignOffModal;