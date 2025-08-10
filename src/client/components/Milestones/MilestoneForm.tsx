import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarIcon,
  PlusIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  TrashIcon,
  ClockIcon,
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
  const [activeTab, setActiveTab] = useState<
    'basic' | 'requirements' | 'evaluation' | 'settings' | 'checkpoints'
  >('basic');
  const [checkpoints, setCheckpoints] = useState<any[]>(milestone?.checkpoints || []);
  const [isAddingCheckpoint, setIsAddingCheckpoint] = useState(false);
  const [newCheckpoint, setNewCheckpoint] = useState({
    title: '',
    description: '',
    dueDate: '',
    requirements: [] as Array<{ title: string; description: string; isRequired: boolean; type: 'file' | 'text' | 'link' | 'presentation' }>,
    personaSignOffs: [] as string[],
  });

  // Load project and personas
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectResponse, personasResponse] = await Promise.all([
          fetch(`/api/projects/${projectId}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }),
          fetch(`/api/personas?project=${projectId}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
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
        dueDate: milestone.dueDate
          ? new Date(milestone.dueDate).toISOString().split('T')[0]
          : '',
        type: milestone.type || 'deliverable',
        requirements: milestone.requirements || [],
        personaSignOffs:
          milestone.personaSignOffs?.map(
            (signOff: any) => signOff.persona._id || signOff.persona
          ) || [],
        evaluation: {
          rubric: milestone.evaluation?.rubric || [],
        },
        settings: {
          requireAllPersonaApprovals:
            milestone.settings?.requireAllPersonaApprovals ?? true,
          allowResubmission: milestone.settings?.allowResubmission ?? true,
          maxResubmissions: milestone.settings?.maxResubmissions ?? 3,
          autoCloseAfterDays: milestone.settings?.autoCloseAfterDays ?? 7,
        },
      });
      setCheckpoints(milestone.checkpoints || []);
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
        newErrors[`requirement_${index}_title`] =
          'Requirement title is required';
      }
      if (!req.description.trim()) {
        newErrors[`requirement_${index}_description`] =
          'Requirement description is required';
      }
    });

    // Validate rubric criteria
    formData.evaluation.rubric.forEach((criterion, index) => {
      if (!criterion.criterion.trim()) {
        newErrors[`rubric_${index}_criterion`] = 'Criterion name is required';
      }
      if (!criterion.description.trim()) {
        newErrors[`rubric_${index}_description`] =
          'Criterion description is required';
      }
      if (criterion.weight <= 0 || criterion.weight > 100) {
        newErrors[`rubric_${index}_weight`] =
          'Weight must be between 1 and 100';
      }
      if (criterion.maxScore <= 0) {
        newErrors[`rubric_${index}_maxScore`] =
          'Max score must be greater than 0';
      }
    });

    // Validate total rubric weight
    if (formData.evaluation.rubric.length > 0) {
      const totalWeight = formData.evaluation.rubric.reduce(
        (sum, criterion) => sum + criterion.weight,
        0
      );
      if (Math.abs(totalWeight - 100) > 0.01) {
        newErrors.rubricWeight = 'Rubric criteria weights must sum to 100%';
      }
    }

    // Validate settings
    if (
      formData.settings.maxResubmissions < 0 ||
      formData.settings.maxResubmissions > 10
    ) {
      newErrors.maxResubmissions = 'Max resubmissions must be between 0 and 10';
    }

    if (
      formData.settings.autoCloseAfterDays < 1 ||
      formData.settings.autoCloseAfterDays > 90
    ) {
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

  const handleNestedChange = (
    parent: keyof MilestoneFormData,
    field: string,
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as any),
        [field]: value,
      },
    }));

    // Clear error when user starts typing
    const errorKey = field;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: '' }));
    }
  };

  const handleArrayChange = (
    field: keyof MilestoneFormData,
    index: number,
    subField: string,
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: Array.isArray(prev[field])
        ? (prev[field] as any[]).map((item, i) =>
            i === index ? { ...item, [subField]: value } : item
          )
        : prev[field],
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
    return formData.evaluation.rubric.reduce(
      (sum, criterion) => sum + (criterion.weight || 0),
      0
    );
  };

  const tabs = [
    { id: 'basic', name: 'Basic Info', icon: InformationCircleIcon },
    { id: 'requirements', name: 'Requirements', icon: ClockIcon },
    { id: 'evaluation', name: 'Evaluation', icon: CalendarIcon },
    { id: 'checkpoints', name: 'Checkpoints', icon: ClockIcon },
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
              <p className="text-sm text-gray-600 mt-1">
                Project: {project.name}
              </p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map(tab => {
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
              <label
                htmlFor="milestone-name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Milestone Name *
              </label>
              <input
                id="milestone-name"
                type="text"
                value={formData.name}
                onChange={e => handleInputChange('name', e.target.value)}
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
              <label
                htmlFor="milestone-description"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Description *
              </label>
              <textarea
                id="milestone-description"
                value={formData.description}
                onChange={e => handleInputChange('description', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe the milestone objectives and expectations"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="milestone-due-date"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Due Date *
                </label>
                <input
                  id="milestone-due-date"
                  type="date"
                  value={formData.dueDate}
                  onChange={e => handleInputChange('dueDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.dueDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.dueDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="milestone-type"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Type *
                </label>
                <select
                  id="milestone-type"
                  value={formData.type}
                  onChange={e =>
                    handleInputChange('type', e.target.value as any)
                  }
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
                Select which personas must approve this milestone before it can
                be marked as complete.
              </p>

              {personas.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600">
                    No personas available for this project.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                  {personas.map(persona => (
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
                <h3 className="text-lg font-medium text-gray-900">
                  Milestone Requirements
                </h3>
                <p className="text-sm text-gray-600">
                  Define what students need to submit for this milestone.
                </p>
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
                  <div
                    key={index}
                    className="border border-gray-200 rounded-md p-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-gray-900">
                        Requirement {index + 1}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeRequirement(index)}
                        className="text-red-400 hover:text-red-500 focus:outline-none"
                        aria-label="Remove requirement"
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
                          onChange={e =>
                            handleArrayChange(
                              'requirements',
                              index,
                              'title',
                              e.target.value
                            )
                          }
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`requirement_${index}_title`]
                              ? 'border-red-300'
                              : 'border-gray-300'
                          }`}
                          placeholder="Requirement title"
                        />
                        {errors[`requirement_${index}_title`] && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors[`requirement_${index}_title`]}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type
                        </label>
                        <select
                          value={requirement.type}
                          onChange={e =>
                            handleArrayChange(
                              'requirements',
                              index,
                              'type',
                              e.target.value
                            )
                          }
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
                        onChange={e =>
                          handleArrayChange(
                            'requirements',
                            index,
                            'description',
                            e.target.value
                          )
                        }
                        rows={2}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors[`requirement_${index}_description`]
                            ? 'border-red-300'
                            : 'border-gray-300'
                        }`}
                        placeholder="Describe what students need to provide"
                      />
                      {errors[`requirement_${index}_description`] && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors[`requirement_${index}_description`]}
                        </p>
                      )}
                    </div>

                    <div className="mt-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={requirement.isRequired}
                          onChange={e =>
                            handleArrayChange(
                              'requirements',
                              index,
                              'isRequired',
                              e.target.checked
                            )
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Required (students must complete this)
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Checkpoints Tab */}
        {activeTab === 'checkpoints' && (
          <div className="space-y-6">
            {!milestone && (
              <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
                You can manage checkpoints after creating the milestone.
              </div>
            )}

            {milestone && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Checkpoints</h3>
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => setIsAddingCheckpoint(true)}
                  >
                    <PlusIcon className="w-4 h-4 mr-2" /> Add Checkpoint
                  </button>
                </div>

                {isAddingCheckpoint && (
                  <div className="border rounded-md p-4 space-y-4" data-testid="add-checkpoint-form">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                      <input
                        type="text"
                        value={newCheckpoint.title}
                        onChange={(e) => setNewCheckpoint({ ...newCheckpoint, title: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                        placeholder="Checkpoint title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                      <textarea
                        value={newCheckpoint.description}
                        onChange={(e) => setNewCheckpoint({ ...newCheckpoint, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                        placeholder="Checkpoint description"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                      <input
                        type="date"
                        value={newCheckpoint.dueDate}
                        onChange={(e) => setNewCheckpoint({ ...newCheckpoint, dueDate: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Personas for Sign-off</label>
                      <div className="space-y-2 max-h-40 overflow-auto border rounded p-2">
                        {personas.map(p => (
                          <label key={p._id} className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={newCheckpoint.personaSignOffs.includes(p._id)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setNewCheckpoint((prev) => ({
                                  ...prev,
                                  personaSignOffs: checked
                                    ? [...prev.personaSignOffs, p._id]
                                    : prev.personaSignOffs.filter(id => id !== p._id),
                                }));
                              }}
                            />
                            <span>{p.name} ({p.role})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!newCheckpoint.title.trim() || !newCheckpoint.description.trim() || !newCheckpoint.dueDate) {
                            return;
                          }
                          try {
                            const response = await fetch(`/api/milestones/${milestone._id}/checkpoints`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${localStorage.getItem('token')}`,
                              },
                              body: JSON.stringify({
                                title: newCheckpoint.title.trim(),
                                description: newCheckpoint.description.trim(),
                                dueDate: newCheckpoint.dueDate,
                                requirements: newCheckpoint.requirements,
                                personaSignOffs: newCheckpoint.personaSignOffs,
                              }),
                            });
                            if (response.ok) {
                              const data = await response.json();
                              setCheckpoints(data.data.checkpoints || []);
                              setIsAddingCheckpoint(false);
                              setNewCheckpoint({ title: '', description: '', dueDate: '', requirements: [], personaSignOffs: [] });
                            }
                          } catch (err) {
                            console.error('Failed to add checkpoint', err);
                          }
                        }}
                        className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Save Checkpoint
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCheckpoint(false);
                          setNewCheckpoint({ title: '', description: '', dueDate: '', requirements: [], personaSignOffs: [] });
                        }}
                        className="px-3 py-2 text-sm rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3" data-testid="checkpoint-list">
                  {checkpoints.length === 0 && (
                    <div className="text-sm text-gray-600">No checkpoints yet.</div>
                  )}
                  {checkpoints.map((cp: any) => (
                    <CheckpointItem
                      key={cp._id || cp.title}
                      milestoneId={milestone._id}
                      checkpoint={cp}
                      onUpdated={(updated) => setCheckpoints(updated)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Evaluation Tab */}
        {activeTab === 'evaluation' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Evaluation Rubric
                </h3>
                <p className="text-sm text-gray-600">
                  Define criteria and scoring for this milestone.
                </p>
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
                      Current weight total:{' '}
                      <span className="font-medium">
                        {getCurrentWeightSum()}%
                      </span>
                      {getCurrentWeightSum() !== 100 && (
                        <span className="text-blue-600">
                          {' '}
                          (should equal 100%)
                        </span>
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
                    <p className="text-sm text-red-700">
                      {errors.rubricWeight}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {formData.evaluation.rubric.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-md">
                <p className="text-gray-600">
                  No evaluation criteria added yet.
                </p>
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
                  <div
                    key={index}
                    className="border border-gray-200 rounded-md p-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-gray-900">
                        Criterion {index + 1}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeRubricCriterion(index)}
                        className="text-red-400 hover:text-red-500 focus:outline-none"
                        aria-label="Remove criterion"
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
                          onChange={e =>
                            handleArrayChange(
                              'evaluation',
                              index,
                              'criterion',
                              e.target.value
                            )
                          }
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`rubric_${index}_criterion`]
                              ? 'border-red-300'
                              : 'border-gray-300'
                          }`}
                          placeholder="e.g., Code Quality"
                        />
                        {errors[`rubric_${index}_criterion`] && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors[`rubric_${index}_criterion`]}
                          </p>
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
                          onChange={e =>
                            handleArrayChange(
                              'evaluation',
                              index,
                              'weight',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`rubric_${index}_weight`]
                              ? 'border-red-300'
                              : 'border-gray-300'
                          }`}
                        />
                        {errors[`rubric_${index}_weight`] && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors[`rubric_${index}_weight`]}
                          </p>
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
                          onChange={e =>
                            handleArrayChange(
                              'evaluation',
                              index,
                              'maxScore',
                              parseInt(e.target.value) || 1
                            )
                          }
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`rubric_${index}_maxScore`]
                              ? 'border-red-300'
                              : 'border-gray-300'
                          }`}
                        />
                        {errors[`rubric_${index}_maxScore`] && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors[`rubric_${index}_maxScore`]}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description *
                      </label>
                      <textarea
                        value={criterion.description}
                        onChange={e =>
                          handleArrayChange(
                            'evaluation',
                            index,
                            'description',
                            e.target.value
                          )
                        }
                        rows={2}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors[`rubric_${index}_description`]
                            ? 'border-red-300'
                            : 'border-gray-300'
                        }`}
                        placeholder="Describe what this criterion evaluates"
                      />
                      {errors[`rubric_${index}_description`] && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors[`rubric_${index}_description`]}
                        </p>
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
              <h3 className="text-lg font-medium text-gray-900">
                Milestone Settings
              </h3>
              <p className="text-sm text-gray-600">
                Configure how this milestone behaves.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="max-resubmissions"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Maximum Resubmissions
                </label>
                <input
                  id="max-resubmissions"
                  type="number"
                  min="0"
                  max="10"
                  value={formData.settings.maxResubmissions}
                  onChange={e =>
                    handleNestedChange(
                      'settings',
                      'maxResubmissions',
                      parseInt(e.target.value) || 0
                    )
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.maxResubmissions
                      ? 'border-red-300'
                      : 'border-gray-300'
                  }`}
                />
                {errors.maxResubmissions && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.maxResubmissions}
                  </p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Number of times students can resubmit after feedback
                </p>
              </div>

              <div>
                <label
                  htmlFor="auto-close-days"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Auto-close After (days)
                </label>
                <input
                  id="auto-close-days"
                  type="number"
                  min="1"
                  max="90"
                  value={formData.settings.autoCloseAfterDays}
                  onChange={e =>
                    handleNestedChange(
                      'settings',
                      'autoCloseAfterDays',
                      parseInt(e.target.value) || 7
                    )
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.autoCloseAfterDays
                      ? 'border-red-300'
                      : 'border-gray-300'
                  }`}
                />
                {errors.autoCloseAfterDays && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.autoCloseAfterDays}
                  </p>
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
                    onChange={e =>
                      handleNestedChange(
                        'settings',
                        'requireAllPersonaApprovals',
                        e.target.checked
                      )
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    Require all persona approvals before completion
                  </span>
                </label>
                <p className="ml-7 text-sm text-gray-500">
                  When checked, all selected personas must approve before
                  milestone is marked complete
                </p>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.settings.allowResubmission}
                    onChange={e =>
                      handleNestedChange(
                        'settings',
                        'allowResubmission',
                        e.target.checked
                      )
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    Allow resubmissions
                  </span>
                </label>
                <p className="ml-7 text-sm text-gray-500">
                  When checked, students can resubmit their work after receiving
                  feedback
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="mt-8 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
              isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? (milestone ? 'Updating...' : 'Creating...') : milestone ? 'Update Milestone' : 'Create Milestone'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MilestoneForm;

// Checkpoint item sub-component
const CheckpointItem: React.FC<{
  milestoneId: string;
  checkpoint: any;
  onUpdated: (updatedCheckpoints: any[]) => void;
}> = ({ milestoneId, checkpoint, onUpdated }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [local, setLocal] = useState({
    title: checkpoint.title || '',
    description: checkpoint.description || '',
    dueDate: checkpoint.dueDate ? new Date(checkpoint.dueDate).toISOString().split('T')[0] : '',
    status: checkpoint.status || 'pending',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/milestones/${milestoneId}/checkpoints/${checkpoint._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          title: local.title,
          description: local.description,
          dueDate: local.dueDate,
          status: local.status,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        onUpdated(data.data.checkpoints || []);
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Failed to update checkpoint', err);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm('Delete this checkpoint?')) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/milestones/${milestoneId}/checkpoints/${checkpoint._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        onUpdated(data.data.checkpoints || []);
      }
    } catch (err) {
      console.error('Failed to delete checkpoint', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="border rounded-md p-4">
      {!isEditing ? (
        <div className="flex items-start justify-between">
          <div>
            <div className="font-medium text-gray-900">{checkpoint.title}</div>
            <div className="text-sm text-gray-600 mt-1">{checkpoint.description}</div>
            <div className="text-xs text-gray-500 mt-1">Due: {new Date(checkpoint.dueDate).toISOString().split('T')[0]}</div>
            <div className="text-xs mt-1">
              <span className={`inline-block px-2 py-0.5 rounded ${
                checkpoint.status === 'completed' ? 'bg-green-100 text-green-800' :
                checkpoint.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                checkpoint.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {checkpoint.status}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              className="px-2 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </button>
            <button
              type="button"
              className="px-2 py-1 text-sm rounded bg-red-600 text-white hover:bg-red-700"
              onClick={remove}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={local.title}
              onChange={(e) => setLocal({ ...local, title: e.target.value })}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
              placeholder="Title"
            />
            <input
              type="date"
              value={local.dueDate}
              onChange={(e) => setLocal({ ...local, dueDate: e.target.value })}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
            />
            <select
              value={local.status}
              onChange={(e) => setLocal({ ...local, status: e.target.value as any })}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <textarea
            value={local.description}
            onChange={(e) => setLocal({ ...local, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
            placeholder="Description"
          />
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-2 text-sm rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
