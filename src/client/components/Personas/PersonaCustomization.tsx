import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface PersonaCustomizationData {
  id: string;
  name: string;
  role: string;
  personality: {
    traits: string[];
    communicationStyle: string;
    decisionMakingStyle: string;
    priorities: string[];
    goals: string[];
    consistencyLevel: number; // 0-100
    adaptabilityLevel: number; // 0-100
    conflictStyle:
      | 'avoidant'
      | 'confrontational'
      | 'collaborative'
      | 'compromising';
    stressResponse: 'withdraw' | 'confront' | 'delegate' | 'analyze';
  };
  mood: {
    current: number; // -100 to 100
    baseline: number; // -100 to 100
    volatility: number; // 0-100
    recoveryRate: number; // 0-100
    triggers: Array<{
      type: string;
      description: string;
      impact: number; // -100 to 100
    }>;
  };
  responseStyle: {
    verbosity: 'concise' | 'moderate' | 'detailed';
    formality: 'casual' | 'professional' | 'formal';
    empathy: number; // 0-100
    assertiveness: number; // 0-100
    humor: number; // 0-100
    technicalDepth: number; // 0-100
    questionFrequency: number; // 0-100
  };
  aiConfiguration: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    contextWindow: number;
    personalityWeight: number; // 0-100
    contextWeight: number; // 0-100
    creativityWeight: number; // 0-100
  };
  scenarios: Array<{
    id: string;
    name: string;
    description: string;
    personalityAdjustments: {
      traits: string[];
      communicationStyle?: string;
      priorities: string[];
    };
    responseStyle: {
      verbosity?: string;
      formality?: string;
      empathy?: number;
      assertiveness?: number;
    };
    isActive: boolean;
  }>;
  availability: {
    responseTime: number;
    workingHours: {
      start: string;
      end: string;
      timezone: string;
    };
    availabilityMode: 'always' | 'working-hours' | 'custom';
    customAvailability: Array<{
      day: string;
      start: string;
      end: string;
      isAvailable: boolean;
    }>;
  };
}

interface PersonaCustomizationProps {
  personaId: string;
  onSave: (data: PersonaCustomizationData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const PersonaCustomization: React.FC<PersonaCustomizationProps> = ({
  personaId,
  onSave,
  onCancel,
  isLoading = false,
}) => {
  const [customizationData, setCustomizationData] =
    useState<PersonaCustomizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('personality');
  const [newScenario, setNewScenario] = useState({
    name: '',
    description: '',
    isActive: false,
  });
  const [newTrigger, setNewTrigger] = useState({
    type: '',
    description: '',
    impact: 0,
  });
  const [currentPriority, setCurrentPriority] = useState('');
  const [currentGoal, setCurrentGoal] = useState('');

  useEffect(() => {
    loadPersonaData();
  }, [personaId]);

  const loadPersonaData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/personas/${personaId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const persona = response.data.data;

      // Transform persona data to customization format
      const customizationData: PersonaCustomizationData = {
        id: persona._id,
        name: persona.name,
        role: persona.role,
        personality: {
          traits: persona.personality.traits,
          communicationStyle: persona.personality.communicationStyle,
          decisionMakingStyle: persona.personality.decisionMakingStyle,
          priorities: persona.personality.priorities,
          goals: persona.personality.goals,
          consistencyLevel: 75, // Default values
          adaptabilityLevel: 60,
          conflictStyle: 'collaborative',
          stressResponse: 'analyze',
        },
        mood: {
          current: persona.mood.current,
          baseline: persona.mood.current,
          volatility: 30,
          recoveryRate: 50,
          triggers: [],
        },
        responseStyle: {
          verbosity: 'moderate',
          formality: 'professional',
          empathy: 70,
          assertiveness: 60,
          humor: 30,
          technicalDepth: 60,
          questionFrequency: 40,
        },
        aiConfiguration: {
          model: persona.aiConfiguration.model,
          temperature: persona.aiConfiguration.temperature,
          maxTokens: persona.aiConfiguration.maxTokens,
          systemPrompt: persona.aiConfiguration.systemPrompt,
          contextWindow: persona.aiConfiguration.contextWindow,
          personalityWeight: 70,
          contextWeight: 60,
          creativityWeight: 50,
        },
        scenarios: [],
        availability: {
          responseTime: persona.availability.responseTime,
          workingHours: persona.availability.workingHours,
          availabilityMode: 'working-hours',
          customAvailability: [],
        },
      };

      setCustomizationData(customizationData);
    } catch (error) {
      console.error('Error loading persona data:', error);
      setErrors({ load: 'Failed to load persona data' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (section: string, field: string, value: any) => {
    if (!customizationData) return;

    setCustomizationData(prev => ({
      ...prev!,
      [section]: {
        ...prev![section as keyof PersonaCustomizationData],
        [field]: value,
      },
    }));
  };

  const handleNestedChange = (
    section: string,
    subsection: string,
    field: string,
    value: any
  ) => {
    if (!customizationData) return;

    setCustomizationData(prev => ({
      ...prev!,
      [section]: {
        ...prev![section as keyof PersonaCustomizationData],
        [subsection]: {
          ...(prev![section as keyof PersonaCustomizationData] as any)[
            subsection
          ],
          [field]: value,
        },
      },
    }));
  };

  const addScenario = () => {
    if (!customizationData || !newScenario.name.trim()) return;

    const scenario = {
      id: Date.now().toString(),
      name: newScenario.name,
      description: newScenario.description,
      personalityAdjustments: {
        traits: [],
        priorities: [],
      },
      responseStyle: {},
      isActive: newScenario.isActive,
    };

    setCustomizationData(prev => ({
      ...prev!,
      scenarios: [...prev!.scenarios, scenario],
    }));

    setNewScenario({ name: '', description: '', isActive: false });
  };

  const removeScenario = (scenarioId: string) => {
    if (!customizationData) return;

    setCustomizationData(prev => ({
      ...prev!,
      scenarios: prev!.scenarios.filter(s => s.id !== scenarioId),
    }));
  };

  const addTrigger = () => {
    if (!customizationData || !newTrigger.type.trim()) return;

    const trigger = {
      type: newTrigger.type,
      description: newTrigger.description,
      impact: newTrigger.impact,
    };

    setCustomizationData(prev => ({
      ...prev!,
      mood: {
        ...prev!.mood,
        triggers: [...prev!.mood.triggers, trigger],
      },
    }));

    setNewTrigger({ type: '', description: '', impact: 0 });
  };

  const removeTrigger = (index: number) => {
    if (!customizationData) return;

    setCustomizationData(prev => ({
      ...prev!,
      mood: {
        ...prev!.mood,
        triggers: prev!.mood.triggers.filter((_, i) => i !== index),
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customizationData) return;

    try {
      await onSave(customizationData);
    } catch (error) {
      console.error('Error saving customization:', error);
      setErrors({ save: 'Failed to save customization' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading persona data...</div>
      </div>
    );
  }

  if (!customizationData) {
    return (
      <div className="text-center text-red-600">
        Failed to load persona data
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Customize Persona: {customizationData.name}
        </h2>
        <div className="text-sm text-gray-600">
          Role: {customizationData.role}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'personality', label: 'Personality' },
            { id: 'mood', label: 'Mood & Behavior' },
            { id: 'response', label: 'Response Style' },
            { id: 'ai', label: 'AI Configuration' },
            { id: 'scenarios', label: 'Scenarios' },
            { id: 'goals-priorities', label: 'Goals & Priorities' },
            { id: 'availability', label: 'Availability' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personality Tab */}
        {activeTab === 'personality' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personality Consistency Level
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={customizationData.personality.consistencyLevel}
                    onChange={e =>
                      handleInputChange(
                        'personality',
                        'consistencyLevel',
                        parseInt(e.target.value)
                      )
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Adaptable</span>
                    <span>Consistent</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Current: {customizationData.personality.consistencyLevel}%
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adaptability Level
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={customizationData.personality.adaptabilityLevel}
                    onChange={e =>
                      handleInputChange(
                        'personality',
                        'adaptabilityLevel',
                        parseInt(e.target.value)
                      )
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Rigid</span>
                    <span>Flexible</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Current: {customizationData.personality.adaptabilityLevel}%
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conflict Resolution Style
                </label>
                <select
                  value={customizationData.personality.conflictStyle}
                  onChange={e =>
                    handleInputChange(
                      'personality',
                      'conflictStyle',
                      e.target.value
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="avoidant">Avoidant</option>
                  <option value="confrontational">Confrontational</option>
                  <option value="collaborative">Collaborative</option>
                  <option value="compromising">Compromising</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stress Response
                </label>
                <select
                  value={customizationData.personality.stressResponse}
                  onChange={e =>
                    handleInputChange(
                      'personality',
                      'stressResponse',
                      e.target.value
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="withdraw">Withdraw</option>
                  <option value="confront">Confront</option>
                  <option value="delegate">Delegate</option>
                  <option value="analyze">Analyze</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Mood & Behavior Tab */}
        {activeTab === 'mood' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Baseline Mood: {customizationData.mood.baseline}
                </label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={customizationData.mood.baseline}
                  onChange={e =>
                    handleInputChange(
                      'mood',
                      'baseline',
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Negative</span>
                  <span>Neutral</span>
                  <span>Positive</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mood Volatility: {customizationData.mood.volatility}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={customizationData.mood.volatility}
                  onChange={e =>
                    handleInputChange(
                      'mood',
                      'volatility',
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Stable</span>
                  <span>Variable</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mood Recovery Rate: {customizationData.mood.recoveryRate}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={customizationData.mood.recoveryRate}
                onChange={e =>
                  handleInputChange(
                    'mood',
                    'recoveryRate',
                    parseInt(e.target.value)
                  )
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Slow</span>
                <span>Fast</span>
              </div>
            </div>

            {/* Mood Triggers */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Mood Triggers
              </h3>
              <div className="space-y-3">
                {customizationData.mood.triggers.map((trigger, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{trigger.type}</div>
                      <div className="text-sm text-gray-600">
                        {trigger.description}
                      </div>
                      <div className="text-xs text-gray-500">
                        Impact: {trigger.impact}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTrigger(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 border border-gray-300 rounded">
                <h4 className="font-medium mb-3">Add New Trigger</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Trigger type"
                    value={newTrigger.type}
                    onChange={e =>
                      setNewTrigger(prev => ({ ...prev, type: e.target.value }))
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={newTrigger.description}
                    onChange={e =>
                      setNewTrigger(prev => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="number"
                    placeholder="Impact (-100 to 100)"
                    value={newTrigger.impact}
                    onChange={e =>
                      setNewTrigger(prev => ({
                        ...prev,
                        impact: parseInt(e.target.value),
                      }))
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <button
                  type="button"
                  onClick={addTrigger}
                  disabled={!newTrigger.type.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300"
                >
                  Add Trigger
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Response Style Tab */}
        {activeTab === 'response' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Response Verbosity
                </label>
                <select
                  value={customizationData.responseStyle.verbosity}
                  onChange={e =>
                    handleInputChange(
                      'responseStyle',
                      'verbosity',
                      e.target.value
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="concise">Concise</option>
                  <option value="moderate">Moderate</option>
                  <option value="detailed">Detailed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Formality Level
                </label>
                <select
                  value={customizationData.responseStyle.formality}
                  onChange={e =>
                    handleInputChange(
                      'responseStyle',
                      'formality',
                      e.target.value
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="casual">Casual</option>
                  <option value="professional">Professional</option>
                  <option value="formal">Formal</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Empathy Level: {customizationData.responseStyle.empathy}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={customizationData.responseStyle.empathy}
                  onChange={e =>
                    handleInputChange(
                      'responseStyle',
                      'empathy',
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assertiveness: {customizationData.responseStyle.assertiveness}
                  %
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={customizationData.responseStyle.assertiveness}
                  onChange={e =>
                    handleInputChange(
                      'responseStyle',
                      'assertiveness',
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Humor Level: {customizationData.responseStyle.humor}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={customizationData.responseStyle.humor}
                  onChange={e =>
                    handleInputChange(
                      'responseStyle',
                      'humor',
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Technical Depth:{' '}
                  {customizationData.responseStyle.technicalDepth}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={customizationData.responseStyle.technicalDepth}
                  onChange={e =>
                    handleInputChange(
                      'responseStyle',
                      'technicalDepth',
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Frequency:{' '}
                  {customizationData.responseStyle.questionFrequency}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={customizationData.responseStyle.questionFrequency}
                  onChange={e =>
                    handleInputChange(
                      'responseStyle',
                      'questionFrequency',
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* AI Configuration Tab */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Model
                </label>
                <select
                  value={customizationData.aiConfiguration.model}
                  onChange={e =>
                    handleInputChange(
                      'aiConfiguration',
                      'model',
                      e.target.value
                    )
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
                  Temperature: {customizationData.aiConfiguration.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={customizationData.aiConfiguration.temperature}
                  onChange={e =>
                    handleInputChange(
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personality Weight:{' '}
                  {customizationData.aiConfiguration.personalityWeight}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={customizationData.aiConfiguration.personalityWeight}
                  onChange={e =>
                    handleInputChange(
                      'aiConfiguration',
                      'personalityWeight',
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Context Weight:{' '}
                  {customizationData.aiConfiguration.contextWeight}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={customizationData.aiConfiguration.contextWeight}
                  onChange={e =>
                    handleInputChange(
                      'aiConfiguration',
                      'contextWeight',
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Creativity Weight:{' '}
                  {customizationData.aiConfiguration.creativityWeight}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={customizationData.aiConfiguration.creativityWeight}
                  onChange={e =>
                    handleInputChange(
                      'aiConfiguration',
                      'creativityWeight',
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                System Prompt
              </label>
              <textarea
                value={customizationData.aiConfiguration.systemPrompt}
                onChange={e =>
                  handleInputChange(
                    'aiConfiguration',
                    'systemPrompt',
                    e.target.value
                  )
                }
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Customize the system prompt for AI responses..."
              />
            </div>
          </div>
        )}

        {/* Scenarios Tab */}
        {activeTab === 'scenarios' && (
          <div className="space-y-6">
            <div className="space-y-3">
              {customizationData.scenarios.map(scenario => (
                <div
                  key={scenario.id}
                  className="p-4 border border-gray-300 rounded"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{scenario.name}</h4>
                      <p className="text-sm text-gray-600">
                        {scenario.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={scenario.isActive}
                          onChange={e => {
                            const updatedScenarios =
                              customizationData.scenarios.map(s =>
                                s.id === scenario.id
                                  ? { ...s, isActive: e.target.checked }
                                  : s
                              );
                            setCustomizationData(prev => ({
                              ...prev!,
                              scenarios: updatedScenarios,
                            }));
                          }}
                          className="mr-2"
                        />
                        Active
                      </label>
                      <button
                        type="button"
                        onClick={() => removeScenario(scenario.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border border-gray-300 rounded">
              <h4 className="font-medium mb-3">Add New Scenario</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Scenario name"
                  value={newScenario.name}
                  onChange={e =>
                    setNewScenario(prev => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <textarea
                  placeholder="Scenario description"
                  value={newScenario.description}
                  onChange={e =>
                    setNewScenario(prev => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <div className="flex items-center gap-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newScenario.isActive}
                      onChange={e =>
                        setNewScenario(prev => ({
                          ...prev,
                          isActive: e.target.checked,
                        }))
                      }
                      className="mr-2"
                    />
                    Active by default
                  </label>
                </div>
                <button
                  type="button"
                  onClick={addScenario}
                  disabled={!newScenario.name.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300"
                >
                  Add Scenario
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Goals & Priorities Tab */}
        {activeTab === 'goals-priorities' && (
          <div className="space-y-8">
            {/* Priorities */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priorities (2-8)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={currentPriority}
                  onChange={e => setCurrentPriority(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (
                        currentPriority.trim() &&
                        customizationData.personality.priorities.length < 8
                      ) {
                        handleInputChange('personality', 'priorities', [
                          ...customizationData.personality.priorities,
                          currentPriority.trim(),
                        ]);
                        setCurrentPriority('');
                      }
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a priority"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (
                      currentPriority.trim() &&
                      customizationData.personality.priorities.length < 8
                    ) {
                      handleInputChange('personality', 'priorities', [
                        ...customizationData.personality.priorities,
                        currentPriority.trim(),
                      ]);
                      setCurrentPriority('');
                    }
                  }}
                  disabled={
                    !currentPriority.trim() ||
                    customizationData.personality.priorities.length >= 8
                  }
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Add Priority
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {customizationData.personality.priorities.map((priority, index) => (
                  <span
                    key={`${priority}-${index}`}
                    className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    {priority}
                    <button
                      type="button"
                      onClick={() => {
                        const next = customizationData.personality.priorities.filter(
                          (_, i) => i !== index
                        );
                        handleInputChange('personality', 'priorities', next);
                      }}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Goals */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Goals (1-5)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={currentGoal}
                  onChange={e => setCurrentGoal(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (
                        currentGoal.trim() &&
                        customizationData.personality.goals.length < 5
                      ) {
                        handleInputChange('personality', 'goals', [
                          ...customizationData.personality.goals,
                          currentGoal.trim(),
                        ]);
                        setCurrentGoal('');
                      }
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a goal"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (
                      currentGoal.trim() &&
                      customizationData.personality.goals.length < 5
                    ) {
                      handleInputChange('personality', 'goals', [
                        ...customizationData.personality.goals,
                        currentGoal.trim(),
                      ]);
                      setCurrentGoal('');
                    }
                  }}
                  disabled={
                    !currentGoal.trim() ||
                    customizationData.personality.goals.length >= 5
                  }
                  className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Add Goal
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {customizationData.personality.goals.map((goal, index) => (
                  <span
                    key={`${goal}-${index}`}
                    className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                  >
                    {goal}
                    <button
                      type="button"
                      onClick={() => {
                        const next = customizationData.personality.goals.filter(
                          (_, i) => i !== index
                        );
                        handleInputChange('personality', 'goals', next);
                      }}
                      className="ml-2 text-purple-600 hover:text-purple-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Availability Tab */}
        {activeTab === 'availability' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Availability Mode
              </label>
              <select
                value={customizationData.availability.availabilityMode}
                onChange={e =>
                  handleInputChange(
                    'availability',
                    'availabilityMode',
                    e.target.value
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="always">Always Available</option>
                <option value="working-hours">Working Hours Only</option>
                <option value="custom">Custom Schedule</option>
              </select>
            </div>

            {customizationData.availability.availabilityMode ===
              'working-hours' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Response Time (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={customizationData.availability.responseTime}
                    onChange={e =>
                      handleInputChange(
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
                    value={customizationData.availability.workingHours.start}
                    onChange={e =>
                      handleNestedChange(
                        'availability',
                        'workingHours',
                        'start',
                        e.target.value
                      )
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
                    value={customizationData.availability.workingHours.end}
                    onChange={e =>
                      handleNestedChange(
                        'availability',
                        'workingHours',
                        'end',
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {errors.save && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.save}
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
            {isLoading ? 'Saving...' : 'Save Customization'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PersonaCustomization;
