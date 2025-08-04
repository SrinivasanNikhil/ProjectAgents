import React, { useState, useEffect, useCallback } from 'react';
import { 
  CalendarIcon, 
  PlusIcon, 
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  TrashIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface Project {
  _id: string;
  name: string;
  description: string;
}

interface Persona {
  _id: string;
  name: string;
  role: string;
}

interface Requirement {
  title: string;
  description: string;
  isRequired: boolean;
  type: 'file' | 'text' | 'link' | 'presentation';
}

interface RubricCriterion {
  criterion: string;
  weight: number;
  maxScore: number;
  description: string;
}

interface MilestoneFormData {
  name: string;
  description: string;
  dueDate: string;
  type: 'deliverable' | 'review' | 'presentation' | 'feedback';
  requirements: Requirement[];
  personaSignOffs: string[];
  evaluation: {
    rubric: RubricCriterion[];
  };
  settings: {
    requireAllPersonaApprovals: boolean;
    allowResubmission: boolean;
    maxResubmissions: number;
    autoCloseAfterDays: number;
  };
}

interface MilestoneFormProps {
  projectId: string;
  milestone?: any; // Existing milestone for editing
  onSubmit: (data: MilestoneFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const defaultFormData: MilestoneFormData = {
  name: '',
  description: '',
  dueDate: '',
  type: 'deliverable',
  requirements: [],
  personaSignOffs: [],
  evaluation: {
    rubric: [],
  },
  settings: {
    requireAllPersonaApprovals: true,
    allowResubmission: true,
    maxResubmissions: 3,
    autoCloseAfterDays: 7,
  },
};

const defaultRequirement: Requirement = {
  title: '',
  description: '',
  isRequired: true,
  type: 'file',
};

const defaultRubricCriterion: RubricCriterion = {
  criterion: '',
  weight: 25,
  maxScore: 10,
  description: '',
};

const MilestoneForm: React.FC<MilestoneFormProps> = ({
  projectId,
  milestone,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<MilestoneFormData>(defaultFormData);
  const [project, setProject] = useState<Project | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'requirements' | 'evaluation' | 'settings'>('basic');

  // Load project and personas
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectResponse, personasResponse] = await Promise.all([
          fetch(`/api/projects/${projectId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          }),
          fetch(`/api/personas?project=${projectId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          }),
        ]);

        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          setProject(projectData.data);
        }

        if (personasResponse.ok) {
          const personasData = await personasResponse.json();
          setPersonas(personasData.data.personas || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [projectId]);

  // Initialize form data for editing
  useEffect(() => {
    if (milestone) {
      setFormData({
        name: milestone.name || '',
        description: milestone.description || '',
        dueDate: milestone.dueDate ? new Date(milestone.dueDate).toISOString().split('T')[0] : '',
        type: milestone.type || 'deliverable',
        requirements: milestone.requirements || [],
        personaSignOffs: milestone.personaSignOffs?.map((signOff: any) => signOff.persona._id || signOff.persona) || [],
        evaluation: {
          rubric: milestone.evaluation?.rubric || [],
        },
        settings: {
          requireAllPersonaApprovals: milestone.settings?.requireAllPersonaApprovals ?? true,
          allowResubmission: milestone.settings?.allowResubmission ?? true,
          maxResubmissions: milestone.settings?.maxResubmissions ?? 3,
          autoCloseAfterDays: milestone.settings?.autoCloseAfterDays ?? 7,
        },
      });
    }
  }, [milestone]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    } else {
      const dueDate = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDate < today) {
        newErrors.dueDate = 'Due date cannot be in the past';
      }
    }

    // Validate requirements
    formData.requirements.forEach((req, index) => {
      if (!req.title.trim()) {
        newErrors[`requirement_${index}_title`] = 'Requirement title is required';
      }
      if (!req.description.trim()) {
        newErrors[`requirement_${index}_description`] = 'Requirement description is required';
      }
    });

    // Validate rubric criteria
    formData.evaluation.rubric.forEach((criterion, index) => {
      if (!criterion.criterion.trim()) {
        newErrors[`rubric_${index}_criterion`] = 'Criterion name is required';
      }
      if (!criterion.description.trim()) {
        newErrors[`rubric_${index}_description`] = 'Criterion description is required';
      }
      if (criterion.weight <= 0 || criterion.weight > 100) {
        newErrors[`rubric_${index}_weight`] = 'Weight must be between 1 and 100';
      }
      if (criterion.maxScore <= 0) {
        newErrors[`rubric_${index}_maxScore`] = 'Max score must be greater than 0';
      }
    });

    // Validate total rubric weight
    if (formData.evaluation.rubric.length > 0) {
      const totalWeight = formData.evaluation.rubric.reduce((sum, criterion) => sum + criterion.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        newErrors.rubricWeight = 'Rubric criteria weights must sum to 100%';
      }
    }

    // Validate settings
    if (formData.settings.maxResubmissions < 0 || formData.settings.maxResubmissions > 10) {
      newErrors.maxResubmissions = 'Max resubmissions must be between 0 and 10';
    }

    if (formData.settings.autoCloseAfterDays < 1 || formData.settings.autoCloseAfterDays > 90) {
      newErrors.autoCloseAfterDays = 'Auto close days must be between 1 and 90';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleInputChange = (field: keyof MilestoneFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNestedChange = (parent: keyof MilestoneFormData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as any),
        [field]: value,
      },
    }));
  };

  const handleArrayChange = (field: keyof MilestoneFormData, index: number, subField: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as any[]).map((item, i) => 
        i === index ? { ...item, [subField]: value } : item
      ),
    }));
  };

  const addRequirement = () => {
    setFormData(prev => ({
      ...prev,
      requirements: [...prev.requirements, { ...defaultRequirement }],
    }));
  };

  const removeRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index),
    }));
  };

  const addRubricCriterion = () => {
    setFormData(prev => ({
      ...prev,
      evaluation: {
        ...prev.evaluation,
        rubric: [...prev.evaluation.rubric, { ...defaultRubricCriterion }],
      },
    }));
  };

  const removeRubricCriterion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      evaluation: {
        ...prev.evaluation,
        rubric: prev.evaluation.rubric.filter((_, i) => i !== index),
      },
    }));
  };

  const handlePersonaToggle = (personaId: string) => {
    setFormData(prev => ({
      ...prev,
      personaSignOffs: prev.personaSignOffs.includes(personaId)
        ? prev.personaSignOffs.filter(id => id !== personaId)
        : [...prev.personaSignOffs, personaId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const submitData = {
        ...formData,
        project: projectId,
      };
      
      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting milestone:', error);
    }
  };

  const getCurrentWeightSum = () => {
    return formData.evaluation.rubric.reduce((sum, criterion) => sum + (criterion.weight || 0), 0);
  };

  const tabs = [
    { id: 'basic', name: 'Basic Info', icon: InformationCircleIcon },
    { id: 'requirements', name: 'Requirements', icon: ClockIcon },
    { id: 'evaluation', name: 'Evaluation', icon: CalendarIcon },
    { id: 'settings', name: 'Settings', icon: InformationCircleIcon },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm max-w-4xl mx-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {milestone ? 'Edit Milestone' : 'Create New Milestone'}
            </h2>
            {project && (
              <p className="text-sm text-gray-600 mt-1">Project: {project.name}</p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-6">
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Milestone Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter milestone name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe the milestone objectives and expectations"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.dueDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.dueDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="deliverable">Deliverable</option>
                  <option value="review">Review</option>
                  <option value="presentation">Presentation</option>
                  <option value="feedback">Feedback</option>
                </select>
              </div>
            </div>

            {/* Persona Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Persona Sign-offs
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Select which personas must approve this milestone before it can be marked as complete.
              </p>
              
              {personas.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600">No personas available for this project.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                  {personas.map((persona) => (
                    <label key={persona._id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.personaSignOffs.includes(persona._id)}
                        onChange={() => handlePersonaToggle(persona._id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm text-gray-700">
                        <span className="font-medium">{persona.name}</span>
                        <span className="text-gray-500"> ({persona.role})</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Requirements Tab */}
        {activeTab === 'requirements' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Milestone Requirements</h3>
                <p className="text-sm text-gray-600">Define what students need to submit for this milestone.</p>
              </div>
              <button
                type="button"
                onClick={addRequirement}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Requirement
              </button>
            </div>

            {formData.requirements.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-md">
                <p className="text-gray-600">No requirements added yet.</p>
                <button
                  type="button"
                  onClick={addRequirement}
                  className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add First Requirement
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.requirements.map((requirement, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-gray-900">
                        Requirement {index + 1}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeRequirement(index)}
                        className="text-red-400 hover:text-red-500 focus:outline-none"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Title *
                        </label>
                        <input
                          type="text"
                          value={requirement.title}
                          onChange={(e) => handleArrayChange('requirements', index, 'title', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`requirement_${index}_title`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="Requirement title"
                        />
                        {errors[`requirement_${index}_title`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`requirement_${index}_title`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type
                        </label>
                        <select
                          value={requirement.type}
                          onChange={(e) => handleArrayChange('requirements', index, 'type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="file">File Upload</option>
                          <option value="text">Text Response</option>
                          <option value="link">Link/URL</option>
                          <option value="presentation">Presentation</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description *
                      </label>
                      <textarea
                        value={requirement.description}
                        onChange={(e) => handleArrayChange('requirements', index, 'description', e.target.value)}
                        rows={2}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors[`requirement_${index}_description`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Describe what students need to provide"
                      />
                      {errors[`requirement_${index}_description`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`requirement_${index}_description`]}</p>
                      )}
                    </div>

                    <div className="mt-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={requirement.isRequired}
                          onChange={(e) => handleArrayChange('requirements', index, 'isRequired', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Required (students must complete this)</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Evaluation Tab */}
        {activeTab === 'evaluation' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Evaluation Rubric</h3>
                <p className="text-sm text-gray-600">Define criteria and scoring for this milestone.</p>
              </div>
              <button
                type="button"
                onClick={addRubricCriterion}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Criterion
              </button>
            </div>

            {formData.evaluation.rubric.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <InformationCircleIcon className="w-5 h-5 text-blue-400" />
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      Current weight total: <span className="font-medium">{getCurrentWeightSum()}%</span>
                      {getCurrentWeightSum() !== 100 && (
                        <span className="text-blue-600"> (should equal 100%)</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {errors.rubricWeight && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{errors.rubricWeight}</p>
                  </div>
                </div>
              </div>
            )}

            {formData.evaluation.rubric.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-md">
                <p className="text-gray-600">No evaluation criteria added yet.</p>
                <button
                  type="button"
                  onClick={addRubricCriterion}
                  className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add First Criterion
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.evaluation.rubric.map((criterion, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-gray-900">
                        Criterion {index + 1}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeRubricCriterion(index)}
                        className="text-red-400 hover:text-red-500 focus:outline-none"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Criterion Name *
                        </label>
                        <input
                          type="text"
                          value={criterion.criterion}
                          onChange={(e) => handleArrayChange('evaluation', index, 'criterion', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`rubric_${index}_criterion`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="e.g., Code Quality"
                        />
                        {errors[`rubric_${index}_criterion`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`rubric_${index}_criterion`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Weight (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={criterion.weight}
                          onChange={(e) => handleArrayChange('evaluation', index, 'weight', parseInt(e.target.value) || 0)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`rubric_${index}_weight`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {errors[`rubric_${index}_weight`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`rubric_${index}_weight`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Score
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={criterion.maxScore}
                          onChange={(e) => handleArrayChange('evaluation', index, 'maxScore', parseInt(e.target.value) || 1)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`rubric_${index}_maxScore`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {errors[`rubric_${index}_maxScore`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`rubric_${index}_maxScore`]}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description *
                      </label>
                      <textarea
                        value={criterion.description}
                        onChange={(e) => handleArrayChange('evaluation', index, 'description', e.target.value)}
                        rows={2}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors[`rubric_${index}_description`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Describe what this criterion evaluates"
                      />
                      {errors[`rubric_${index}_description`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`rubric_${index}_description`]}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Milestone Settings</h3>
              <p className="text-sm text-gray-600">Configure how this milestone behaves.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Resubmissions
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.settings.maxResubmissions}
                  onChange={(e) => handleNestedChange('settings', 'maxResubmissions', parseInt(e.target.value) || 0)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.maxResubmissions ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.maxResubmissions && (
                  <p className="mt-1 text-sm text-red-600">{errors.maxResubmissions}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Number of times students can resubmit after feedback
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auto-close After (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={formData.settings.autoCloseAfterDays}
                  onChange={(e) => handleNestedChange('settings', 'autoCloseAfterDays', parseInt(e.target.value) || 7)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.autoCloseAfterDays ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.autoCloseAfterDays && (
                  <p className="mt-1 text-sm text-red-600">{errors.autoCloseAfterDays}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Days after due date to automatically close milestone
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.settings.requireAllPersonaApprovals}
                    onChange={(e) => handleNestedChange('settings', 'requireAllPersonaApprovals', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    Require all persona approvals before completion
                  </span>
                </label>
                <p className="ml-7 text-sm text-gray-500">
                  When checked, all selected personas must approve before milestone is marked complete
                </p>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.settings.allowResubmission}
                    onChange={(e) => handleNestedChange('settings', 'allowResubmission', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    Allow resubmissions
                  </span>
                </label>
                <p className="ml-7 text-sm text-gray-500">
                  When checked, students can resubmit their work after receiving feedback
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                {milestone ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                {milestone ? 'Update Milestone' : 'Create Milestone'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MilestoneForm;