import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Project {
  _id: string;
  name: string;
  description: string;
  projectType: string;
  industry: string;
  scope: string;
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
}

interface PersonaFormData {
  name: string;
  role: string;
  projectId: string;
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
}

interface PersonaFormProps {
  onSubmit: (data: PersonaFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<PersonaFormData>;
  isLoading?: boolean;
}

const PersonaForm: React.FC<PersonaFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<PersonaFormData>({
    name: '',
    role: '',
    projectId: '',
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
    ...initialData,
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [suggestions, setSuggestions] = useState<PersonaSuggestion[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentTrait, setCurrentTrait] = useState('');
  const [currentPriority, setCurrentPriority] = useState('');
  const [currentGoal, setCurrentGoal] = useState('');

  // Load projects on component mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Load suggestions when project changes
  useEffect(() => {
    if (formData.projectId) {
      loadSuggestions();
    }
  }, [formData.projectId]);

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await axios.get('/api/projects', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setProjects(response.data.data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      setErrors({ projects: 'Failed to load projects' });
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadSuggestions = async () => {
    if (!formData.projectId) return;

    try {
      setLoadingSuggestions(true);
      const response = await axios.get(
        `/api/personas/suggestions/${formData.projectId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      setSuggestions(response.data.data || []);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setErrors({ suggestions: 'Failed to load suggestions' });
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }

    if (!formData.role.trim()) {
      newErrors.role = 'Role is required';
    }

    if (!formData.projectId) {
      newErrors.projectId = 'Project is required';
    }

    if (!formData.background.trim()) {
      newErrors.background = 'Background is required';
    } else if (formData.background.length < 50) {
      newErrors.background = 'Background must be at least 50 characters long';
    }

    if (formData.personality.traits.length < 3) {
      newErrors.traits = 'At least 3 personality traits are required';
    }

    if (formData.personality.priorities.length < 2) {
      newErrors.priorities = 'At least 2 priorities are required';
    }

    if (formData.personality.goals.length < 1) {
      newErrors.goals = 'At least 1 goal is required';
    }

    if (!formData.aiConfiguration.systemPrompt.trim()) {
      newErrors.systemPrompt = 'System prompt is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error creating persona:', error);
      setErrors({ submit: 'Failed to create persona' });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNestedChange = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof PersonaFormData],
        [field]: value,
      },
    }));
  };

  const addTrait = () => {
    if (currentTrait.trim() && formData.personality.traits.length < 10) {
      setFormData(prev => ({
        ...prev,
        personality: {
          ...prev.personality,
          traits: [...prev.personality.traits, currentTrait.trim()],
        },
      }));
      setCurrentTrait('');
      setErrors(prev => ({ ...prev, traits: '' }));
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
    if (currentPriority.trim() && formData.personality.priorities.length < 8) {
      setFormData(prev => ({
        ...prev,
        personality: {
          ...prev.personality,
          priorities: [...prev.personality.priorities, currentPriority.trim()],
        },
      }));
      setCurrentPriority('');
      setErrors(prev => ({ ...prev, priorities: '' }));
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
    if (currentGoal.trim() && formData.personality.goals.length < 5) {
      setFormData(prev => ({
        ...prev,
        personality: {
          ...prev.personality,
          goals: [...prev.personality.goals, currentGoal.trim()],
        },
      }));
      setCurrentGoal('');
      setErrors(prev => ({ ...prev, goals: '' }));
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

  const applySuggestion = (suggestion: PersonaSuggestion) => {
    setFormData(prev => ({
      ...prev,
      role: suggestion.role,
      background: suggestion.background,
      personality: suggestion.personality,
    }));
  };

  const generateSystemPrompt = () => {
    const prompt = `You are ${formData.name}, a ${formData.role} working on a project. 

Background: ${formData.background}

Personality Traits: ${formData.personality.traits.join(', ')}
Communication Style: ${formData.personality.communicationStyle}
Decision Making Style: ${formData.personality.decisionMakingStyle}

Priorities: ${formData.personality.priorities.join(', ')}
Goals: ${formData.personality.goals.join(', ')}

Respond as this persona would, maintaining consistency with their background, personality, and goals. Be helpful, professional, and authentic to the character.`;

    setFormData(prev => ({
      ...prev,
      aiConfiguration: {
        ...prev.aiConfiguration,
        systemPrompt: prompt,
      },
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {initialData ? 'Edit Persona' : 'Create New Persona'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Persona Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter persona name"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project *
            </label>
            <select
              value={formData.projectId}
              onChange={e => handleInputChange('projectId', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.projectId ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={loadingProjects}
            >
              <option value="">Select a project</option>
              {projects.map(project => (
                <option key={project._id} value={project._id}>
                  {project.name} - {project.industry}
                </option>
              ))}
            </select>
            {errors.projectId && (
              <p className="text-red-500 text-sm mt-1">{errors.projectId}</p>
            )}
          </div>
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role *
          </label>
          <input
            type="text"
            value={formData.role}
            onChange={e => handleInputChange('role', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.role ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Product Manager, UX Designer, Developer"
          />
          {errors.role && (
            <p className="text-red-500 text-sm mt-1">{errors.role}</p>
          )}
        </div>

        {/* Project-Based Suggestions */}
        {formData.projectId && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">
              AI-Generated Suggestions
            </h3>
            {loadingSuggestions ? (
              <p className="text-blue-600">Loading suggestions...</p>
            ) : suggestions.length > 0 ? (
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="bg-white p-4 rounded border border-blue-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-blue-800">
                        {suggestion.role}
                      </h4>
                      <button
                        type="button"
                        onClick={() => applySuggestion(suggestion)}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {suggestion.reasoning}
                    </p>
                    <div className="text-xs text-gray-500">
                      <p>
                        <strong>Traits:</strong>{' '}
                        {suggestion.personality.traits.join(', ')}
                      </p>
                      <p>
                        <strong>Style:</strong>{' '}
                        {suggestion.personality.communicationStyle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-blue-600">
                No suggestions available for this project.
              </p>
            )}
          </div>
        )}

        {/* Background */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Background *
          </label>
          <textarea
            value={formData.background}
            onChange={e => handleInputChange('background', e.target.value)}
            rows={4}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.background ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Describe the persona's background, experience, and context..."
          />
          {errors.background && (
            <p className="text-red-500 text-sm mt-1">{errors.background}</p>
          )}
        </div>

        {/* Personality Traits */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Personality Traits * (3-10 traits)
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={currentTrait}
              onChange={e => setCurrentTrait(e.target.value)}
              onKeyPress={e =>
                e.key === 'Enter' && (e.preventDefault(), addTrait())
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add a personality trait"
            />
            <button
              type="button"
              onClick={addTrait}
              disabled={
                !currentTrait.trim() || formData.personality.traits.length >= 10
              }
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.personality.traits.map((trait, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {trait}
                <button
                  type="button"
                  onClick={() => removeTrait(index)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          {errors.traits && (
            <p className="text-red-500 text-sm mt-1">{errors.traits}</p>
          )}
        </div>

        {/* Communication and Decision Making Styles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <option value="formal">Formal</option>
              <option value="casual">Casual</option>
              <option value="technical">Technical</option>
              <option value="collaborative">Collaborative</option>
              <option value="authoritative">Authoritative</option>
              <option value="supportive">Supportive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <option value="consensus-driven">Consensus-driven</option>
              <option value="authoritative">Authoritative</option>
              <option value="risk-averse">Risk-averse</option>
              <option value="risk-taking">Risk-taking</option>
            </select>
          </div>
        </div>

        {/* Priorities */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priorities * (2-8 priorities)
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={currentPriority}
              onChange={e => setCurrentPriority(e.target.value)}
              onKeyPress={e =>
                e.key === 'Enter' && (e.preventDefault(), addPriority())
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add a priority"
            />
            <button
              type="button"
              onClick={addPriority}
              disabled={
                !currentPriority.trim() ||
                formData.personality.priorities.length >= 8
              }
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.personality.priorities.map((priority, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
              >
                {priority}
                <button
                  type="button"
                  onClick={() => removePriority(index)}
                  className="ml-2 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          {errors.priorities && (
            <p className="text-red-500 text-sm mt-1">{errors.priorities}</p>
          )}
        </div>

        {/* Goals */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Goals * (1-5 goals)
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={currentGoal}
              onChange={e => setCurrentGoal(e.target.value)}
              onKeyPress={e =>
                e.key === 'Enter' && (e.preventDefault(), addGoal())
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add a goal"
            />
            <button
              type="button"
              onClick={addGoal}
              disabled={
                !currentGoal.trim() || formData.personality.goals.length >= 5
              }
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.personality.goals.map((goal, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
              >
                {goal}
                <button
                  type="button"
                  onClick={() => removeGoal(index)}
                  className="ml-2 text-purple-600 hover:text-purple-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          {errors.goals && (
            <p className="text-red-500 text-sm mt-1">{errors.goals}</p>
          )}
        </div>

        {/* AI Configuration */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            AI Configuration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Model
              </label>
              <select
                value={formData.aiConfiguration.model}
                onChange={e =>
                  handleNestedChange('aiConfiguration', 'model', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3">Claude-3</option>
                <option value="claude-2">Claude-2</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature: {formData.aiConfiguration.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={formData.aiConfiguration.temperature}
                onChange={e =>
                  handleNestedChange(
                    'aiConfiguration',
                    'temperature',
                    parseFloat(e.target.value)
                  )
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Focused</span>
                <span>Creative</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              System Prompt *
            </label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={generateSystemPrompt}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                Auto-Generate
              </button>
            </div>
            <textarea
              value={formData.aiConfiguration.systemPrompt}
              onChange={e =>
                handleNestedChange(
                  'aiConfiguration',
                  'systemPrompt',
                  e.target.value
                )
              }
              rows={6}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.systemPrompt ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter the system prompt that will guide the AI's responses..."
            />
            {errors.systemPrompt && (
              <p className="text-red-500 text-sm mt-1">{errors.systemPrompt}</p>
            )}
          </div>
        </div>

        {/* Availability */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Availability Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Response Time (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="1440"
                value={formData.availability.responseTime}
                onChange={e =>
                  handleNestedChange(
                    'availability',
                    'responseTime',
                    parseInt(e.target.value)
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={formData.availability.workingHours.start}
                onChange={e =>
                  handleNestedChange('availability', 'workingHours', {
                    ...formData.availability.workingHours,
                    start: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time
              </label>
              <input
                type="time"
                value={formData.availability.workingHours.end}
                onChange={e =>
                  handleNestedChange('availability', 'workingHours', {
                    ...formData.availability.workingHours,
                    end: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading
              ? 'Creating...'
              : initialData
                ? 'Update Persona'
                : 'Create Persona'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PersonaForm;
