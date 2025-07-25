import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Project {
  _id: string;
  name: string;
  description: string;
  projectType: string;
  industry: string;
  scope: string;
  timeline: {
    startDate: string;
    endDate: string;
  };
  status: string;
  metadata: {
    totalPersonas: number;
    totalConversations: number;
    totalMilestones: number;
  };
}

interface ExistingPersona {
  _id: string;
  name: string;
  role: string;
  background: string;
  personality: {
    traits: string[];
    communicationStyle: string;
    decisionMakingStyle: string;
    priorities: string[];
    goals: string[];
  };
}

interface PersonaSuggestion {
  role: string;
  background: string;
  personality: {
    traits: string[];
    communicationStyle: string;
    decisionMakingStyle: string;
    priorities: string[];
    goals: string[];
  };
  reasoning: string;
  conflictPotential: string;
}

interface MidProjectPersonaData {
  name: string;
  role: string;
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
    responseTime: number;
    workingHours: {
      start: string;
      end: string;
      timezone: string;
    };
  };
  midProjectContext: {
    introductionReason: string;
    impactOnExistingPersonas: string;
    newRequirements: string[];
    conflictScenarios: string[];
  };
}

interface MidProjectPersonaAdditionProps {
  projectId: string;
  onPersonaAdded: (persona: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const MidProjectPersonaAddition: React.FC<MidProjectPersonaAdditionProps> = ({
  projectId,
  onPersonaAdded,
  onCancel,
  isLoading = false,
}) => {
  const [project, setProject] = useState<Project | null>(null);
  const [existingPersonas, setExistingPersonas] = useState<ExistingPersona[]>(
    []
  );
  const [suggestions, setSuggestions] = useState<PersonaSuggestion[]>([]);
  const [formData, setFormData] = useState<MidProjectPersonaData>({
    name: '',
    role: '',
    background: '',
    personality: {
      traits: [],
      communicationStyle: 'collaborative',
      decisionMakingStyle: 'analytical',
      priorities: [],
      goals: [],
    },
    aiConfiguration: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      systemPrompt: '',
      contextWindow: 10,
    },
    availability: {
      responseTime: 5,
      workingHours: {
        start: '09:00',
        end: '17:00',
        timezone: 'UTC',
      },
    },
    midProjectContext: {
      introductionReason: '',
      impactOnExistingPersonas: '',
      newRequirements: [],
      conflictScenarios: [],
    },
  });

  const [loadingProject, setLoadingProject] = useState(false);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [newTrait, setNewTrait] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newRequirement, setNewRequirement] = useState('');
  const [newConflictScenario, setNewConflictScenario] = useState('');

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setLoadingProject(true);
      setLoadingPersonas(true);

      // Load project details
      const projectResponse = await axios.get(`/api/projects/${projectId}`);
      setProject(projectResponse.data.data);

      // Load existing personas
      const personasResponse = await axios.get(
        `/api/personas/project/${projectId}`
      );
      setExistingPersonas(personasResponse.data.data);

      // Load AI suggestions for mid-project persona
      await loadMidProjectSuggestions(
        projectResponse.data.data,
        personasResponse.data.data
      );
    } catch (error) {
      console.error('Error loading project data:', error);
    } finally {
      setLoadingProject(false);
      setLoadingPersonas(false);
    }
  };

  const loadMidProjectSuggestions = async (
    projectData: Project,
    existingPersonasData: ExistingPersona[]
  ) => {
    try {
      setLoadingSuggestions(true);

      const response = await axios.post(
        '/api/personas/mid-project-suggestions',
        {
          projectId,
          projectData,
          existingPersonas: existingPersonasData,
        }
      );

      setSuggestions(response.data.data);
    } catch (error) {
      console.error('Error loading mid-project suggestions:', error);
      // Fallback to basic suggestions
      setSuggestions(
        getFallbackMidProjectSuggestions(projectData, existingPersonasData)
      );
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const getFallbackMidProjectSuggestions = (
    projectData: Project,
    existingPersonasData: ExistingPersona[]
  ): PersonaSuggestion[] => {
    const existingRoles = existingPersonasData.map(p => p.role.toLowerCase());

    const suggestions: PersonaSuggestion[] = [];

    // Add suggestions based on project type and existing personas
    if (
      projectData.projectType === 'web-application' &&
      !existingRoles.includes('ui/ux designer')
    ) {
      suggestions.push({
        role: 'UI/UX Designer',
        background:
          'Experienced designer with focus on user experience and interface design',
        personality: {
          traits: ['creative', 'detail-oriented', 'user-focused'],
          communicationStyle: 'visual',
          decisionMakingStyle: 'user-centered',
          priorities: [
            'user experience',
            'accessibility',
            'design consistency',
          ],
          goals: [
            'create intuitive interfaces',
            'improve user satisfaction',
            'maintain design standards',
          ],
        },
        reasoning: 'Web applications benefit from dedicated UI/UX expertise',
        conflictPotential:
          'May conflict with developers on implementation details',
      });
    }

    if (
      projectData.projectType === 'mobile-app' &&
      !existingRoles.includes('mobile developer')
    ) {
      suggestions.push({
        role: 'Mobile Developer',
        background:
          'Specialized mobile developer with platform-specific expertise',
        personality: {
          traits: ['technical', 'platform-aware', 'performance-focused'],
          communicationStyle: 'technical',
          decisionMakingStyle: 'platform-optimized',
          priorities: [
            'performance',
            'platform guidelines',
            'app store compliance',
          ],
          goals: [
            'optimize mobile performance',
            'ensure platform compliance',
            'deliver smooth user experience',
          ],
        },
        reasoning: 'Mobile apps require specialized development expertise',
        conflictPotential:
          'May conflict with web developers on cross-platform decisions',
      });
    }

    if (!existingRoles.includes('qa tester') && projectData.scope !== 'small') {
      suggestions.push({
        role: 'QA Tester',
        background:
          'Quality assurance specialist focused on testing and validation',
        personality: {
          traits: ['thorough', 'systematic', 'quality-focused'],
          communicationStyle: 'detailed',
          decisionMakingStyle: 'evidence-based',
          priorities: [
            'quality assurance',
            'bug prevention',
            'user experience',
          ],
          goals: [
            'ensure product quality',
            'prevent critical bugs',
            'validate user workflows',
          ],
        },
        reasoning: 'Larger projects benefit from dedicated QA expertise',
        conflictPotential: 'May conflict with developers on release timelines',
      });
    }

    return suggestions;
  };

  const applySuggestion = (suggestion: PersonaSuggestion) => {
    setFormData(prev => ({
      ...prev,
      role: suggestion.role,
      background: suggestion.background,
      personality: suggestion.personality,
      midProjectContext: {
        ...prev.midProjectContext,
        introductionReason: `Adding ${suggestion.role} to address ${suggestion.reasoning.toLowerCase()}`,
        impactOnExistingPersonas: suggestion.conflictPotential,
      },
    }));
  };

  const addTrait = () => {
    if (newTrait.trim()) {
      setFormData(prev => ({
        ...prev,
        personality: {
          ...prev.personality,
          traits: [...prev.personality.traits, newTrait.trim()],
        },
      }));
      setNewTrait('');
    }
  };

  const removeTrait = (index: number) => {
    setFormData(prev => ({
      ...prev,
      personality: {
        ...prev.personality,
        traits: prev.personality.traits.filter((_, i) => i !== index),
      },
    }));
  };

  const addPriority = () => {
    if (newPriority.trim()) {
      setFormData(prev => ({
        ...prev,
        personality: {
          ...prev.personality,
          priorities: [...prev.personality.priorities, newPriority.trim()],
        },
      }));
      setNewPriority('');
    }
  };

  const removePriority = (index: number) => {
    setFormData(prev => ({
      ...prev,
      personality: {
        ...prev.personality,
        priorities: prev.personality.priorities.filter((_, i) => i !== index),
      },
    }));
  };

  const addGoal = () => {
    if (newGoal.trim()) {
      setFormData(prev => ({
        ...prev,
        personality: {
          ...prev.personality,
          goals: [...prev.personality.goals, newGoal.trim()],
        },
      }));
      setNewGoal('');
    }
  };

  const removeGoal = (index: number) => {
    setFormData(prev => ({
      ...prev,
      personality: {
        ...prev.personality,
        goals: prev.personality.goals.filter((_, i) => i !== index),
      },
    }));
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData(prev => ({
        ...prev,
        midProjectContext: {
          ...prev.midProjectContext,
          newRequirements: [
            ...prev.midProjectContext.newRequirements,
            newRequirement.trim(),
          ],
        },
      }));
      setNewRequirement('');
    }
  };

  const removeRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      midProjectContext: {
        ...prev.midProjectContext,
        newRequirements: prev.midProjectContext.newRequirements.filter(
          (_, i) => i !== index
        ),
      },
    }));
  };

  const addConflictScenario = () => {
    if (newConflictScenario.trim()) {
      setFormData(prev => ({
        ...prev,
        midProjectContext: {
          ...prev.midProjectContext,
          conflictScenarios: [
            ...prev.midProjectContext.conflictScenarios,
            newConflictScenario.trim(),
          ],
        },
      }));
      setNewConflictScenario('');
    }
  };

  const removeConflictScenario = (index: number) => {
    setFormData(prev => ({
      ...prev,
      midProjectContext: {
        ...prev.midProjectContext,
        conflictScenarios: prev.midProjectContext.conflictScenarios.filter(
          (_, i) => i !== index
        ),
      },
    }));
  };

  const validateForm = (): boolean => {
    return !!(
      formData.name.trim() &&
      formData.role.trim() &&
      formData.background.trim() &&
      formData.personality.traits.length > 0 &&
      formData.personality.priorities.length > 0 &&
      formData.personality.goals.length > 0 &&
      formData.midProjectContext.introductionReason.trim()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await axios.post('/api/personas/mid-project', {
        ...formData,
        projectId,
      });

      onPersonaAdded(response.data.data);
    } catch (error) {
      console.error('Error creating mid-project persona:', error);
      alert('Failed to create persona. Please try again.');
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNestedChange = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof MidProjectPersonaData],
        [field]: value,
      },
    }));
  };

  if (loadingProject) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading project data...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Add Persona Mid-Project
        </h2>
        <p className="text-gray-600">
          Add a new stakeholder persona to {project?.name} to introduce new
          requirements, conflicts, or perspectives to the project.
        </p>
      </div>

      {/* Project Context */}
      {project && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Project Context
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Project:</span> {project.name}
            </div>
            <div>
              <span className="font-medium">Type:</span> {project.projectType}
            </div>
            <div>
              <span className="font-medium">Industry:</span> {project.industry}
            </div>
            <div>
              <span className="font-medium">Scope:</span> {project.scope}
            </div>
            <div>
              <span className="font-medium">Existing Personas:</span>{' '}
              {existingPersonas.length}
            </div>
            <div>
              <span className="font-medium">Progress:</span>{' '}
              {project.getProgress?.() || 0}%
            </div>
          </div>
        </div>
      )}

      {/* Existing Personas Overview */}
      {existingPersonas.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Existing Personas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {existingPersonas.map(persona => (
              <div key={persona._id} className="p-3 bg-white rounded border">
                <div className="font-medium text-gray-900">{persona.name}</div>
                <div className="text-sm text-gray-600">{persona.role}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {persona.personality.traits.slice(0, 3).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg">
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            AI Suggestions for Mid-Project Addition
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-4 bg-white rounded border border-green-200"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-green-900">
                    {suggestion.role}
                  </h4>
                  <button
                    type="button"
                    onClick={() => applySuggestion(suggestion)}
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Apply
                  </button>
                </div>
                <p className="text-sm text-gray-700 mb-2">
                  {suggestion.background}
                </p>
                <p className="text-xs text-gray-600 mb-2">
                  <strong>Reasoning:</strong> {suggestion.reasoning}
                </p>
                <p className="text-xs text-orange-600">
                  <strong>Conflict Potential:</strong>{' '}
                  {suggestion.conflictPotential}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Persona Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter persona name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <input
              type="text"
              value={formData.role}
              onChange={e => handleInputChange('role', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., QA Tester, UI/UX Designer"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Background *
          </label>
          <textarea
            value={formData.background}
            onChange={e => handleInputChange('background', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe the persona's background, experience, and expertise"
            required
          />
        </div>

        {/* Mid-Project Context */}
        <div className="p-4 bg-yellow-50 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3">
            Mid-Project Context
          </h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Introduction *
            </label>
            <textarea
              value={formData.midProjectContext.introductionReason}
              onChange={e =>
                handleNestedChange(
                  'midProjectContext',
                  'introductionReason',
                  e.target.value
                )
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Why is this persona being added mid-project? What triggered this addition?"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Impact on Existing Personas
            </label>
            <textarea
              value={formData.midProjectContext.impactOnExistingPersonas}
              onChange={e =>
                handleNestedChange(
                  'midProjectContext',
                  'impactOnExistingPersonas',
                  e.target.value
                )
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="How will this persona affect existing stakeholders and their dynamics?"
            />
          </div>

          {/* New Requirements */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Requirements
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newRequirement}
                onChange={e => setNewRequirement(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add new requirement"
              />
              <button
                type="button"
                onClick={addRequirement}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            <div className="space-y-1">
              {formData.midProjectContext.newRequirements.map((req, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-white rounded border"
                >
                  <span className="flex-1 text-sm">{req}</span>
                  <button
                    type="button"
                    onClick={() => removeRequirement(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Conflict Scenarios */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Potential Conflict Scenarios
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newConflictScenario}
                onChange={e => setNewConflictScenario(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add potential conflict scenario"
              />
              <button
                type="button"
                onClick={addConflictScenario}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                Add
              </button>
            </div>
            <div className="space-y-1">
              {formData.midProjectContext.conflictScenarios.map(
                (scenario, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-white rounded border"
                  >
                    <span className="flex-1 text-sm">{scenario}</span>
                    <button
                      type="button"
                      onClick={() => removeConflictScenario(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Personality Traits */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Personality Traits *
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newTrait}
              onChange={e => setNewTrait(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add personality trait"
            />
            <button
              type="button"
              onClick={addTrait}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.personality.traits.map((trait, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {trait}
                <button
                  type="button"
                  onClick={() => removeTrait(index)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Communication and Decision Making */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Communication Style
            </label>
            <select
              value={formData.personality.communicationStyle}
              onChange={e =>
                handleNestedChange(
                  'personality',
                  'communicationStyle',
                  e.target.value
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="collaborative">Collaborative</option>
              <option value="direct">Direct</option>
              <option value="diplomatic">Diplomatic</option>
              <option value="technical">Technical</option>
              <option value="visual">Visual</option>
              <option value="formal">Formal</option>
              <option value="casual">Casual</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Decision Making Style
            </label>
            <select
              value={formData.personality.decisionMakingStyle}
              onChange={e =>
                handleNestedChange(
                  'personality',
                  'decisionMakingStyle',
                  e.target.value
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="analytical">Analytical</option>
              <option value="intuitive">Intuitive</option>
              <option value="consensus">Consensus</option>
              <option value="authoritative">Authoritative</option>
              <option value="data-driven">Data-driven</option>
              <option value="risk-averse">Risk-averse</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>
        </div>

        {/* Priorities */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priorities *
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newPriority}
              onChange={e => setNewPriority(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add priority"
            />
            <button
              type="button"
              onClick={addPriority}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Add
            </button>
          </div>
          <div className="space-y-1">
            {formData.personality.priorities.map((priority, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-green-50 rounded border"
              >
                <span className="flex-1 text-sm">{priority}</span>
                <button
                  type="button"
                  onClick={() => removePriority(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Goals */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Goals *
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newGoal}
              onChange={e => setNewGoal(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add goal"
            />
            <button
              type="button"
              onClick={addGoal}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Add
            </button>
          </div>
          <div className="space-y-1">
            {formData.personality.goals.map((goal, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-purple-50 rounded border"
              >
                <span className="flex-1 text-sm">{goal}</span>
                <button
                  type="button"
                  onClick={() => removeGoal(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!validateForm() || isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Add Persona'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MidProjectPersonaAddition;
