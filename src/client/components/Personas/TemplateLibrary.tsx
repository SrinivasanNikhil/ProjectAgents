import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface PersonaTemplate {
  _id: string;
  name: string;
  description: string;
  category: string;
  createdBy: {
    _id: string;
    name: string;
  };
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
  usage: {
    totalUses: number;
    lastUsed: Date;
    projects: string[];
  };
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  usageDescription: string;
  lastUsedDescription: string;
}

interface TemplateLibraryProps {
  onSelectTemplate: (template: PersonaTemplate) => void;
  onEditTemplate?: (template: PersonaTemplate) => void;
  onDeleteTemplate?: (templateId: string) => void;
  onCloneTemplate?: (template: PersonaTemplate) => void;
  showCreateButton?: boolean;
  onCreateTemplate?: () => void;
  projectId?: string;
}

const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  onSelectTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onCloneTemplate,
  showCreateButton = false,
  onCreateTemplate,
  projectId,
}) => {
  const [templates, setTemplates] = useState<PersonaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<
    'name' | 'createdAt' | 'usage' | 'category'
  >('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showPublicOnly, setShowPublicOnly] = useState(false);

  const categories = [
    { value: 'all', label: 'All Categories' },
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

  useEffect(() => {
    loadTemplates();
  }, [projectId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (projectId) {
        params.append('projectId', projectId);
      }
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (selectedTags.length > 0) {
        params.append('tags', selectedTags.join(','));
      }
      if (showPublicOnly) {
        params.append('public', 'true');
      }

      const response = await axios.get(`/api/personas/templates?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      setTemplates(response.data.data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [selectedCategory, searchTerm, selectedTags, showPublicOnly]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  const handleSort = (field: 'name' | 'createdAt' | 'usage' | 'category') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const getSortedTemplates = () => {
    return [...templates].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'usage':
          aValue = a.usage.totalUses;
          bValue = b.usage.totalUses;
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const getAllTags = () => {
    const tagSet = new Set<string>();
    templates.forEach(template => {
      template.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  };

  const getFilteredTemplates = () => {
    let filtered = getSortedTemplates();

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        template =>
          template.name.toLowerCase().includes(term) ||
          template.description.toLowerCase().includes(term) ||
          template.template.role.toLowerCase().includes(term) ||
          template.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(template =>
        selectedTags.every(tag => template.tags.includes(tag))
      );
    }

    return filtered;
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!onDeleteTemplate) return;

    if (
      window.confirm(
        'Are you sure you want to delete this template? This action cannot be undone.'
      )
    ) {
      try {
        await axios.delete(`/api/personas/templates/${templateId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        onDeleteTemplate(templateId);
        loadTemplates(); // Refresh the list
      } catch (error) {
        console.error('Error deleting template:', error);
        setError('Failed to delete template');
      }
    }
  };

  const handleCloneTemplate = async (template: PersonaTemplate) => {
    if (!onCloneTemplate) return;

    try {
      const response = await axios.post(
        `/api/personas/templates/${template._id}/clone`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      onCloneTemplate(response.data.data);
      loadTemplates(); // Refresh the list
    } catch (error) {
      console.error('Error cloning template:', error);
      setError('Failed to clone template');
    }
  };

  const filteredTemplates = getFilteredTemplates();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Template Library</h2>
        <div className="flex items-center gap-4">
          {showCreateButton && onCreateTemplate && (
            <button
              onClick={onCreateTemplate}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Create Template
            </button>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={e => handleCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={e => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="usage-desc">Most Used</option>
              <option value="usage-asc">Least Used</option>
              <option value="category-asc">Category (A-Z)</option>
            </select>
          </div>

          {/* Public Only Toggle */}
          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showPublicOnly}
                onChange={e => setShowPublicOnly(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">
                Public templates only
              </span>
            </label>
          </div>
        </div>

        {/* Tags Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {getAllTags().map(tag => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredTemplates.length} of {templates.length} templates
      </div>

      {/* Templates Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <TemplateCard
              key={template._id}
              template={template}
              onSelect={onSelectTemplate}
              onEdit={onEditTemplate}
              onDelete={onDeleteTemplate}
              onClone={onCloneTemplate}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTemplates.map(template => (
            <TemplateListItem
              key={template._id}
              template={template}
              onSelect={onSelectTemplate}
              onEdit={onEditTemplate}
              onDelete={onDeleteTemplate}
              onClone={onCloneTemplate}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredTemplates.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No templates found
          </h3>
          <p className="text-gray-600">
            {searchTerm || selectedCategory !== 'all' || selectedTags.length > 0
              ? 'Try adjusting your filters to see more templates.'
              : 'Get started by creating your first template.'}
          </p>
        </div>
      )}
    </div>
  );
};

// Template Card Component
interface TemplateCardProps {
  template: PersonaTemplate;
  onSelect: (template: PersonaTemplate) => void;
  onEdit?: (template: PersonaTemplate) => void;
  onDelete?: (templateId: string) => void;
  onClone?: (template: PersonaTemplate) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onSelect,
  onEdit,
  onDelete,
  onClone,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {template.name}
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              {template.template.role}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span
                className={`px-2 py-1 rounded-full ${
                  template.isPublic
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {template.isPublic ? 'Public' : 'Private'}
              </span>
              <span>v{template.version}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={() => onEdit(template)}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Edit template"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            )}
            {onClone && (
              <button
                onClick={() => onClone(template)}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Clone template"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(template._id)}
                className="p-1 text-gray-400 hover:text-red-600"
                title="Delete template"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {template.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {template.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              +{template.tags.length - 3}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
          <span>{template.usageDescription}</span>
          <span>{template.lastUsedDescription}</span>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onSelect(template)}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Use Template
        </button>
      </div>
    </div>
  );
};

// Template List Item Component
const TemplateListItem: React.FC<TemplateCardProps> = ({
  template,
  onSelect,
  onEdit,
  onDelete,
  onClone,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {template.name}
              </h3>
              <p className="text-sm text-gray-600">
                {template.template.role} • {template.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  template.isPublic
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {template.isPublic ? 'Public' : 'Private'}
              </span>
              <span className="text-xs text-gray-500">v{template.version}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right text-sm text-gray-500">
            <div>{template.usageDescription}</div>
            <div>{template.lastUsedDescription}</div>
          </div>

          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={() => onEdit(template)}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Edit template"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            )}
            {onClone && (
              <button
                onClick={() => onClone(template)}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Clone template"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(template._id)}
                className="p-1 text-gray-400 hover:text-red-600"
                title="Delete template"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
            <button
              onClick={() => onSelect(template)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Use Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateLibrary;
