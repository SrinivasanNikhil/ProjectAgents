import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PersonaForm from './PersonaForm';

interface Persona {
  _id: string;
  name: string;
  role: string;
  project: {
    _id: string;
    name: string;
  };
  background: string;
  personality: {
    traits: string[];
    communicationStyle: string;
    decisionMakingStyle: string;
    priorities: string[];
    goals: string[];
  };
  aiConfiguration: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    contextWindow: number;
  };
  availability: {
    isActive: boolean;
    responseTime: number;
    workingHours: {
      start: string;
      end: string;
      timezone: string;
    };
  };
  mood: {
    current: number;
    history: Array<{
      value: number;
      timestamp: Date;
      reason: string;
    }>;
  };
  stats: {
    totalConversations: number;
    totalMessages: number;
    averageResponseTime: number;
    lastInteraction: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface PersonaEditModalProps {
  personaId: string;
  isOpen: boolean;
  onClose: () => void;
  onPersonaUpdated: (persona: Persona) => void;
}

export const PersonaEditModal: React.FC<PersonaEditModalProps> = ({
  personaId,
  isOpen,
  onClose,
  onPersonaUpdated,
}) => {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch persona data when modal opens
  useEffect(() => {
    if (isOpen && personaId) {
      fetchPersona();
    }
  }, [isOpen, personaId]);

  const fetchPersona = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`/api/personas/${personaId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.data.success) {
        setPersona(response.data.data);
      } else {
        setError('Failed to fetch persona data');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch persona data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: any) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.put(`/api/personas/${personaId}`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.data.success) {
        onPersonaUpdated(response.data.data);
        onClose();
      } else {
        setError('Failed to update persona');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update persona');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Edit Persona: {persona?.name || 'Loading...'}
            </h3>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {loading && !persona ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">
                Loading persona data...
              </span>
            </div>
          ) : persona ? (
            <div className="max-h-96 overflow-y-auto">
              <PersonaForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                initialData={{
                  name: persona.name,
                  role: persona.role,
                  projectId: persona.project._id,
                  background: persona.background,
                  personality: persona.personality,
                  aiConfiguration: persona.aiConfiguration,
                  availability: persona.availability,
                }}
                isLoading={loading}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No persona data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
