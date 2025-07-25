import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PersonaForm from './PersonaForm';
import PersonaCustomization from './PersonaCustomization';
import TemplateLibrary from './TemplateLibrary';
import { PersonaEditModal } from './PersonaEditModal';
import PersonaMoodConsistency from './PersonaMoodConsistency';

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
  mood: {
    current: number;
    history: Array<{
      value: number;
      timestamp: Date;
      reason: string;
    }>;
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
  stats: {
    totalConversations: number;
    totalMessages: number;
    averageResponseTime: number;
    lastInteraction: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface Project {
  _id: string;
  name: string;
  status: string;
}

interface PersonaManagementDashboardProps {
  userId: string;
}

export const PersonaManagementDashboard: React.FC<
  PersonaManagementDashboardProps
> = ({ userId }) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPersonaId, setEditingPersonaId] = useState<string | null>(null);
  const [showMoodConsistency, setShowMoodConsistency] = useState(false);
  const [selectedPersonaForMood, setSelectedPersonaForMood] = useState<
    string | null
  >(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [personasResponse, projectsResponse] = await Promise.all([
        axios.get('/api/personas'),
        axios.get('/api/projects'),
      ]);

      setPersonas(personasResponse.data.data);
      setProjects(projectsResponse.data.data);
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeletePersona = async (personaId: string) => {
    if (!confirm('Are you sure you want to delete this persona?')) {
      return;
    }

    try {
      await axios.delete(`/api/personas/${personaId}`);
      setPersonas(personas.filter(p => p._id !== personaId));
    } catch (err) {
      setError('Failed to delete persona');
      console.error('Error deleting persona:', err);
    }
  };

  const handleToggleAvailability = async (
    personaId: string,
    isActive: boolean
  ) => {
    try {
      await axios.put(`/api/personas/${personaId}`, {
        availability: { isActive: !isActive },
      });

      setPersonas(
        personas.map(p =>
          p._id === personaId
            ? { ...p, availability: { ...p.availability, isActive: !isActive } }
            : p
        )
      );
    } catch (err) {
      setError('Failed to update persona availability');
      console.error('Error updating persona:', err);
    }
  };

  const handleEditPersona = (personaId: string) => {
    setEditingPersonaId(personaId);
    setShowEditModal(true);
  };

  const handlePersonaUpdated = (updatedPersona: Persona) => {
    setPersonas(
      personas.map(p => (p._id === updatedPersona._id ? updatedPersona : p))
    );
    setShowEditModal(false);
    setEditingPersonaId(null);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingPersonaId(null);
  };

  const handleOpenMoodConsistency = (personaId: string) => {
    setSelectedPersonaForMood(personaId);
    setShowMoodConsistency(true);
  };

  const handleCloseMoodConsistency = () => {
    setShowMoodConsistency(false);
    setSelectedPersonaForMood(null);
  };

  const getMoodColor = (mood: number) => {
    if (mood >= 60) return 'text-green-600';
    if (mood >= 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMoodDescription = (mood: number) => {
    if (mood >= 80) return 'Very Positive';
    if (mood >= 60) return 'Positive';
    if (mood >= 40) return 'Neutral';
    if (mood >= 20) return 'Slightly Negative';
    if (mood >= 0) return 'Negative';
    return 'Very Negative';
  };

  const getAvailabilityStatus = (persona: Persona) => {
    if (!persona.availability?.isActive) return 'Inactive';

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      timeZone: persona.availability.workingHours.timezone,
    });

    return currentTime >= persona.availability.workingHours.start &&
      currentTime <= persona.availability.workingHours.end
      ? 'Available'
      : 'Outside Hours';
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'Available':
        return 'text-green-600';
      case 'Outside Hours':
        return 'text-yellow-600';
      case 'Inactive':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredPersonas = personas
    .filter(persona => {
      const matchesProject =
        selectedProject === 'all' || persona.project._id === selectedProject;
      const matchesSearch =
        persona.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (persona.role &&
          persona.role.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && persona.availability.isActive) ||
        (filterStatus === 'inactive' && !persona.availability.isActive);

      return matchesProject && matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'role':
          comparison = a.role.localeCompare(b.role);
          break;
        case 'mood':
          comparison = a.mood.current - b.mood.current;
          break;
        case 'conversations':
          comparison = a.stats.totalConversations - b.stats.totalConversations;
          break;
        case 'lastInteraction':
          comparison =
            new Date(a.stats.lastInteraction).getTime() -
            new Date(b.stats.lastInteraction).getTime();
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  if (loading) {
    return (
      <div
        className="flex justify-center items-center h-64"
        role="status"
        aria-label="Loading personas"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="sr-only">Loading personas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
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
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Persona Management Dashboard
            </h1>
            <p className="text-gray-600">
              Manage and monitor all personas across your projects
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowTemplateLibrary(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              Template Library
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Create New Persona
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project
            </label>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Name</option>
              <option value="role">Role</option>
              <option value="mood">Mood</option>
              <option value="conversations">Conversations</option>
              <option value="lastInteraction">Last Interaction</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search personas..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center space-x-4">
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
          </button>
          <span className="text-sm text-gray-500">
            {filteredPersonas.length} persona
            {filteredPersonas.length !== 1 ? 's' : ''} found
          </span>
        </div>
      </div>

      {/* Personas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPersonas.map(persona => (
          <div
            key={persona._id}
            className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {persona.name}
                </h3>
                <p className="text-sm text-gray-600">{persona.role}</p>
                <p className="text-xs text-gray-500">
                  {persona.project?.name || 'Unknown Project'}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditPersona(persona._id)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    setSelectedPersona(persona);
                    setShowCustomization(true);
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Customize
                </button>
                <button
                  onClick={() => handleOpenMoodConsistency(persona._id)}
                  className="text-purple-600 hover:text-purple-800 text-sm"
                >
                  Mood & Consistency
                </button>
                <button
                  onClick={() =>
                    handleToggleAvailability(
                      persona._id,
                      persona.availability?.isActive || false
                    )
                  }
                  className={`text-sm ${
                    persona.availability?.isActive
                      ? 'text-green-600 hover:text-green-800'
                      : 'text-red-600 hover:text-red-800'
                  }`}
                >
                  {persona.availability?.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDeletePersona(persona._id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Mood:</span>
                <span
                  className={`text-sm font-medium ${getMoodColor(persona.mood?.current || 50)}`}
                >
                  {getMoodDescription(persona.mood?.current || 50)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status:</span>
                <span
                  className={`text-sm font-medium ${getAvailabilityColor(getAvailabilityStatus(persona))}`}
                >
                  {getAvailabilityStatus(persona)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Conversations:</span>
                <span className="text-sm font-medium text-gray-900">
                  {persona.stats?.totalConversations || 0}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Messages:</span>
                <span className="text-sm font-medium text-gray-900">
                  {persona.stats?.totalMessages || 0}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg Response:</span>
                <span className="text-sm font-medium text-gray-900">
                  {(persona.stats?.averageResponseTime || 0).toFixed(1)} min
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                Last interaction:{' '}
                {persona.stats?.lastInteraction
                  ? new Date(persona.stats.lastInteraction).toLocaleDateString()
                  : 'Never'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPersonas.length === 0 && (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No personas found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new persona or adjusting your filters.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Create New Persona
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Create New Persona</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <PersonaForm
              onSubmit={async data => {
                // Handle form submission
                setShowCreateForm(false);
                fetchData();
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </div>
      )}

      {showCustomization && selectedPersona && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Customize Persona: {selectedPersona.name}
              </h2>
              <button
                onClick={() => setShowCustomization(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <PersonaCustomization
              personaId={selectedPersona._id}
              onSave={async data => {
                // Handle customization save
                setShowCustomization(false);
                fetchData();
              }}
              onCancel={() => setShowCustomization(false)}
            />
          </div>
        </div>
      )}

      {showTemplateLibrary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Template Library</h2>
              <button
                onClick={() => setShowTemplateLibrary(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <TemplateLibrary
              onSelectTemplate={template => {
                setShowTemplateLibrary(false);
                setShowCreateForm(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingPersonaId && (
        <PersonaEditModal
          personaId={editingPersonaId}
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
          onPersonaUpdated={handlePersonaUpdated}
        />
      )}

      {/* Mood & Consistency Modal */}
      {showMoodConsistency && selectedPersonaForMood && (
        <PersonaMoodConsistency
          personaId={selectedPersonaForMood}
          onClose={handleCloseMoodConsistency}
        />
      )}
    </div>
  );
};
