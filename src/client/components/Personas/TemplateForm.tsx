import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface TemplateFormData {
  name: string;
  description: string;
  category: string;
  isPublic: boolean;
  tags: string[];
  template: {
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
  };
}

interface TemplateFormProps {
  onSubmit: (data: TemplateFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<TemplateFormData>;
  isLoading?: boolean;
  isEditing?: boolean;
}

const TemplateForm: React.FC<TemplateFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  isEditing = false,
}) => {
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    category: 'client',
    isPublic: false,
    tags: [],
    template: {
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
    },
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentTrait, setCurrentTrait] = useState('');
  const [currentPriority, setCurrentPriority] = useState('');
  const [currentGoal, setCurrentGoal] = useState('');
  const [currentTag, setCurrentTag] = useState('');

  const categories = [
    { value: 'client', label: 'Client' },
    { value: 'stakeholder', label: 'Stakeholder' },
    { value: 'user', label: 'User' },
    { value: 'manager', label: 'Manager' },
    { value: 'developer', label: 'Developer' },
    { value: 'designer', label: 'Designer' },
    { value: 'tester', label: 'Tester' },
    { value: 'business-analyst', label: 'Business Analyst' },
    { value: 'product-owner', label: 'Product Owner' },
    { value: 'scrum-master', label: 'Scrum Master' },
    { value: 'other', label: 'Other' },
  ];

  const communicationStyles = [
    'formal',
    'casual',
    'technical',
    'collaborative',
    'authoritative',
    'supportive',
  ];

  const decisionMakingStyles = [
    'analytical',
    'intuitive',
    'consensus-driven',
    'authoritative',
    'risk-averse',
    'risk-taking',
  ];

  const aiModels = ['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'claude-2'];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic validation
    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Template name must be at least 3 characters long';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters long';
    }

    if (!formData.template.role.trim()) {
      newErrors.role = 'Role is required';
    }

    if (!formData.template.background.trim()) {
      newErrors.background = 'Background is required';
    } else if (formData.template.background.length < 50) {
      newErrors.background = 'Background must be at least 50 characters long';
    }

    if (formData.template.personality.traits.length < 3) {
      newErrors.traits = 'At least 3 personality traits are required';
    }

    if (formData.template.personality.priorities.length < 2) {
      newErrors.priorities = 'At least 2 priorities are required';
    }

    if (formData.template.personality.goals.length < 1) {
      newErrors.goals = 'At least 1 goal is required';
    }

    if (!formData.template.aiConfiguration.systemPrompt.trim()) {
      newErrors.systemPrompt = 'System prompt is required';
    } else if (formData.template.aiConfiguration.systemPrompt.length < 50) {
      newErrors.systemPrompt =
        'System prompt must be at least 50 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting template:', error);
      setErrors({ submit: 'Failed to save template' });
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
        ...(prev[parent as keyof TemplateFormData] || {}),
        [field]: value,
      },
    }));
  };

  const handleTemplateChange = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      template: {
        ...prev.template,
        [parent]: {
          ...(prev.template as any)[parent],
          [field]: value,
        },
      },
    }));
  };

  const addTrait = () => {
    if (
      currentTrait.trim() &&
      formData.template.personality.traits.length < 10
    ) {
      setFormData(prev => ({
        ...prev,
        template: {
          ...prev.template,
          personality: {
            ...prev.template.personality,
            traits: [...prev.template.personality.traits, currentTrait.trim()],
          },
        },
      }));
      setCurrentTrait('');
    }
  };

  const removeTrait = (index: number) => {
    setFormData(prev => ({
      ...prev,
      template: {
        ...prev.template,
        personality: {
          ...prev.template.personality,
          traits: prev.template.personality.traits.filter(
            (_, i) => i !== index
          ),
        },
      },
    }));
  };

  const addPriority = () => {
    if (
      currentPriority.trim() &&
      formData.template.personality.priorities.length < 8
    ) {
      setFormData(prev => ({
        ...prev,
        template: {
          ...prev.template,
          personality: {
            ...prev.template.personality,
            priorities: [
              ...prev.template.personality.priorities,
              currentPriority.trim(),
            ],
          },
        },
      }));
      setCurrentPriority('');
    }
  };

  const removePriority = (index: number) => {
    setFormData(prev => ({
      ...prev,
      template: {
        ...prev.template,
        personality: {
          ...prev.template.personality,
          priorities: prev.template.personality.priorities.filter(
            (_, i) => i !== index
          ),
        },
      },
    }));
  };

  const addGoal = () => {
    if (currentGoal.trim() && formData.template.personality.goals.length < 5) {
      setFormData(prev => ({
        ...prev,
        template: {
          ...prev.template,
          personality: {
            ...prev.template.personality,
            goals: [...prev.template.personality.goals, currentGoal.trim()],
          },
        },
      }));
      setCurrentGoal('');
    }
  };

  const removeGoal = (index: number) => {
    setFormData(prev => ({
      ...prev,
      template: {
        ...prev.template,
        personality: {
          ...prev.template.personality,
          goals: prev.template.personality.goals.filter((_, i) => i !== index),
        },
      },
    }));
  };

  const addTag = () => {
    if (currentTag.trim() && formData.tags.length < 10) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()],
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  };

  const generateSystemPrompt = () => {
    const prompt = `You are ${formData.template.role}. 

Background: ${formData.template.background}

Personality Traits: ${formData.template.personality.traits.join(', ')}
Communication Style: ${formData.template.personality.communicationStyle}
Decision Making Style: ${formData.template.personality.decisionMakingStyle}

Priorities: ${formData.template.personality.priorities.join(', ')}
Goals: ${formData.template.personality.goals.join(', ')}

Respond in character as this persona, maintaining consistency with the defined personality traits, communication style, and priorities. Be helpful, professional, and authentic to the role.`;

    setFormData(prev => ({
      ...prev,
      template: {
        ...prev.template,
        aiConfiguration: {
          ...prev.template.aiConfiguration,
          systemPrompt: prompt,
        },
      },
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {isEditing ? 'Edit Template' : 'Create New Template'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Basic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="template-name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Template Name *
              </label>
              <input
                id="template-name"
                type="text"
                value={formData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter template name"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="template-category"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Category *
              </label>
              <select
                id="template-category"
                value={formData.category}
                onChange={e => handleInputChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label
              htmlFor="template-description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description *
            </label>
            <textarea
              id="template-description"
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Describe the template and its intended use..."
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description}</p>
            )}
          </div>

          <div className="mt-4">
            <label
              htmlFor="template-tags"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                id="template-tags"
                type="text"
                value={currentTag}
                onChange={e => setCurrentTag(e.target.value)}
                onKeyPress={e =>
                  e.key === 'Enter' && (e.preventDefault(), addTag())
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a tag"
              />
              <button
                type="button"
                onClick={addTag}
                disabled={!currentTag.trim() || formData.tags.length >= 10}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Tag
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(index)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={e => handleInputChange('isPublic', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">
                Make this template public (visible to all users)
              </span>
            </label>
          </div>
        </div>

        {/* Persona Configuration */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Persona Configuration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="template-role"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Role *
              </label>
              <input
                id="template-role"
                type="text"
                value={formData.template.role}
                onChange={e =>
                  handleTemplateChange('role', 'role', e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.role ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Product Manager, UX Designer, Developer"
              />
              {errors.role && (
                <p className="text-red-500 text-sm mt-1">{errors.role}</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label
              htmlFor="template-background"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Background *
            </label>
            <textarea
              id="template-background"
              value={formData.template.background}
              onChange={e =>
                handleTemplateChange('background', 'background', e.target.value)
              }
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
          <div className="mt-4">
            <label
              htmlFor="template-traits"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Personality Traits * (3-10 traits)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                id="template-traits"
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
                  !currentTrait.trim() ||
                  formData.template.personality.traits.length >= 10
                }
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Trait
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.template.personality.traits.map((trait, index) => (
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label
                htmlFor="template-communication-style"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Communication Style
              </label>
              <select
                id="template-communication-style"
                value={formData.template.personality.communicationStyle}
                onChange={e =>
                  handleTemplateChange(
                    'personality',
                    'communicationStyle',
                    e.target.value
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {communicationStyles.map(style => (
                  <option key={style} value={style}>
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="template-decision-making-style"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Decision Making Style
              </label>
              <select
                id="template-decision-making-style"
                value={formData.template.personality.decisionMakingStyle}
                onChange={e =>
                  handleTemplateChange(
                    'personality',
                    'decisionMakingStyle',
                    e.target.value
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {decisionMakingStyles.map(style => (
                  <option key={style} value={style}>
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priorities */}
          <div className="mt-4">
            <label
              htmlFor="template-priorities"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Priorities * (2-8 priorities)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                id="template-priorities"
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
                  formData.template.personality.priorities.length >= 8
                }
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Priority
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.template.personality.priorities.map(
                (priority, index) => (
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
                )
              )}
            </div>
            {errors.priorities && (
              <p className="text-red-500 text-sm mt-1">{errors.priorities}</p>
            )}
          </div>

          {/* Goals */}
          <div className="mt-4">
            <label
              htmlFor="template-goals"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Goals * (1-5 goals)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                id="template-goals"
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
                  !currentGoal.trim() ||
                  formData.template.personality.goals.length >= 5
                }
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Goal
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.template.personality.goals.map((goal, index) => (
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
        </div>

        {/* AI Configuration */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            AI Configuration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="template-ai-model"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                AI Model
              </label>
              <select
                id="template-ai-model"
                value={formData.template.aiConfiguration.model}
                onChange={e =>
                  handleTemplateChange(
                    'aiConfiguration',
                    'model',
                    e.target.value
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {aiModels.map(model => (
                  <option key={model} value={model}>
                    {model.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="template-temperature"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Temperature: {formData.template.aiConfiguration.temperature}
              </label>
              <input
                id="template-temperature"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={formData.template.aiConfiguration.temperature}
                onChange={e =>
                  handleTemplateChange(
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

          <div className="mt-4">
            <label
              htmlFor="template-system-prompt"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
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
              id="template-system-prompt"
              value={formData.template.aiConfiguration.systemPrompt}
              onChange={e =>
                handleTemplateChange(
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
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Availability Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="template-response-time"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Response Time (minutes)
              </label>
              <input
                id="template-response-time"
                type="number"
                min="1"
                max="1440"
                value={formData.template.availability.responseTime}
                onChange={e =>
                  handleTemplateChange(
                    'availability',
                    'responseTime',
                    parseInt(e.target.value)
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="template-start-time"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Start Time
              </label>
              <input
                id="template-start-time"
                type="time"
                value={formData.template.availability.workingHours.start}
                onChange={e =>
                  handleTemplateChange('availability', 'workingHours', {
                    ...formData.template.availability.workingHours,
                    start: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="template-end-time"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                End Time
              </label>
              <input
                id="template-end-time"
                type="time"
                value={formData.template.availability.workingHours.end}
                onChange={e =>
                  handleTemplateChange('availability', 'workingHours', {
                    ...formData.template.availability.workingHours,
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
              ? 'Saving...'
              : isEditing
                ? 'Update Template'
                : 'Create Template'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TemplateForm;
