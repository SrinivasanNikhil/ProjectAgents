import React, { useState, useEffect, useCallback } from 'react';
import { 
  CalendarIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import MilestoneSignOffModal from './MilestoneSignOffModal';

interface Milestone {
  _id: string;
  name: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  type: 'deliverable' | 'review' | 'presentation' | 'feedback';
  project: {
    _id: string;
    name: string;
  };
  personaSignOffs: Array<{
    _id: string;
    persona: {
      _id: string;
      name: string;
      role: string;
    };
    status: 'pending' | 'approved' | 'rejected' | 'requested-changes';
    satisfactionScore?: number;
  }>;
  submissions: Array<{
    _id: string;
    student: {
      _id: string;
      firstName: string;
      lastName: string;
    };
    submittedAt: string;
    status: 'submitted' | 'under-review' | 'approved' | 'needs-revision';
  }>;
  requirements: Array<{
    title: string;
    description: string;
    isRequired: boolean;
    type: 'file' | 'text' | 'link' | 'presentation';
  }>;
  daysUntilDue: number;
  averageSatisfactionScore?: number;
  createdAt: string;
  updatedAt: string;
}

interface MilestoneListProps {
  projectId?: string;
  onCreateMilestone?: () => void;
  onEditMilestone?: (milestone: Milestone) => void;
  onDeleteMilestone?: (milestoneId: string) => void;
  onViewMilestone?: (milestone: Milestone) => void;
  showProjectColumn?: boolean;
  isInstructor?: boolean;
  currentUserId?: string;
}

interface MilestoneFilters {
  search: string;
  status: string;
  type: string;
  sortBy: 'dueDate' | 'name' | 'status' | 'createdAt';
  sortOrder: 'asc' | 'desc';
  showOverdue: boolean;
}

const MilestoneList: React.FC<MilestoneListProps> = ({
  projectId,
  onCreateMilestone,
  onEditMilestone,
  onDeleteMilestone,
  onViewMilestone,
  showProjectColumn = false,
  isInstructor = false,
  currentUserId,
}) => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MilestoneFilters>({
    search: '',
    status: '',
    type: '',
    sortBy: 'dueDate',
    sortOrder: 'asc',
    showOverdue: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null);
  const [signOffModalMilestone, setSignOffModalMilestone] = useState<Milestone | null>(null);

  const fetchMilestones = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      
      if (projectId) {
        params.append('project', projectId);
      }
      if (filters.status) {
        params.append('status', filters.status);
      }
      if (filters.type) {
        params.append('type', filters.type);
      }
      if (filters.showOverdue) {
        params.append('overdue', 'true');
      }
      
      params.append('sort', filters.sortBy);
      params.append('order', filters.sortOrder);
      params.append('limit', '50');

      const response = await fetch(`/api/milestones?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch milestones: ${response.statusText}`);
      }

      const data = await response.json();
      let fetchedMilestones = data.data.milestones || [];

      // Client-side search filtering
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        fetchedMilestones = fetchedMilestones.filter((milestone: Milestone) =>
          milestone.name.toLowerCase().includes(searchLower) ||
          milestone.description.toLowerCase().includes(searchLower) ||
          milestone.project.name.toLowerCase().includes(searchLower)
        );
      }

      setMilestones(fetchedMilestones);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch milestones');
    } finally {
      setLoading(false);
    }
  }, [projectId, filters]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const handleFilterChange = (key: keyof MilestoneFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSort = (sortBy: MilestoneFilters['sortBy']) => {
    const sortOrder = filters.sortBy === sortBy && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    setFilters(prev => ({ ...prev, sortBy, sortOrder }));
  };

  const handleDeleteMilestone = async (milestone: Milestone) => {
    if (!window.confirm(`Are you sure you want to delete the milestone "${milestone.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/milestones/${milestone._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete milestone: ${response.statusText}`);
      }

      setMilestones(prev => prev.filter(m => m._id !== milestone._id));
      onDeleteMilestone?.(milestone._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete milestone');
    }
  };

  const getStatusIcon = (status: Milestone['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <ClockIcon className="w-5 h-5 text-blue-500" />;
      case 'overdue':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <CalendarIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: Milestone['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: Milestone['type']) => {
    switch (type) {
      case 'deliverable':
        return 'bg-purple-100 text-purple-800';
      case 'review':
        return 'bg-orange-100 text-orange-800';
      case 'presentation':
        return 'bg-indigo-100 text-indigo-800';
      case 'feedback':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDaysUntilDue = (days: number) => {
    if (days < 0) {
      return `${Math.abs(days)} days overdue`;
    } else if (days === 0) {
      return 'Due today';
    } else if (days === 1) {
      return '1 day remaining';
    } else {
      return `${days} days remaining`;
    }
  };

  const getCompletionPercentage = (milestone: Milestone) => {
    if (milestone.personaSignOffs.length === 0) return 0;
    const approvedCount = milestone.personaSignOffs.filter(signOff => signOff.status === 'approved').length;
    return Math.round((approvedCount / milestone.personaSignOffs.length) * 100);
  };

  const getSortIcon = (column: MilestoneFilters['sortBy']) => {
    if (filters.sortBy !== column) {
      return null;
    }
    return filters.sortOrder === 'asc' 
      ? <ArrowUpIcon className="w-4 h-4 inline ml-1" />
      : <ArrowDownIcon className="w-4 h-4 inline ml-1" />;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Milestones</h2>
            <p className="text-sm text-gray-600 mt-1">
              {milestones.length} milestone{milestones.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Filters
            </button>
            {isInstructor && onCreateMilestone && (
              <button
                onClick={onCreateMilestone}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                New Milestone
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search milestones..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="deliverable">Deliverable</option>
                <option value="review">Review</option>
                <option value="presentation">Presentation</option>
                <option value="feedback">Feedback</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.showOverdue}
                  onChange={(e) => handleFilterChange('showOverdue', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Show overdue only</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 my-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Milestone List */}
      {milestones.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No milestones</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filters.search || filters.status || filters.type || filters.showOverdue
              ? 'No milestones match your current filters.'
              : 'Get started by creating a new milestone.'}
          </p>
          {isInstructor && onCreateMilestone && (
            <div className="mt-6">
              <button
                onClick={onCreateMilestone}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                New Milestone
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  Name {getSortIcon('name')}
                </th>
                {showProjectColumn && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  Status {getSortIcon('status')}
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('dueDate')}
                >
                  Due Date {getSortIcon('dueDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submissions
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {milestones.map((milestone) => {
                const completionPercentage = getCompletionPercentage(milestone);
                const isOverdue = milestone.daysUntilDue < 0 && milestone.status !== 'completed';
                
                return (
                  <tr key={milestone._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(milestone.status)}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {milestone.name}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {milestone.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    {showProjectColumn && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {milestone.project.name}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(milestone.type)}`}>
                        {milestone.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(milestone.status)}`}>
                        {milestone.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        {formatDate(milestone.dueDate)}
                      </div>
                      <div className={`text-xs ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                        {formatDaysUntilDue(milestone.daysUntilDue)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>Persona Sign-offs</span>
                            <span>{completionPercentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                completionPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${completionPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {milestone.submissions.length > 0 ? (
                        <div>
                          <div className="text-sm font-medium">
                            {milestone.submissions.length} submission{milestone.submissions.length !== 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-gray-500">
                            Latest: {formatDate(milestone.submissions[0].submittedAt)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">No submissions</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={() => setSelectedMilestone(
                            selectedMilestone === milestone._id ? null : milestone._id
                          )}
                          className="text-gray-400 hover:text-gray-500 focus:outline-none"
                          aria-label="Actions"
                        >
                          <EllipsisVerticalIcon className="w-5 h-5" />
                        </button>
                        
                        {selectedMilestone === milestone._id && (
                          <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  onViewMilestone?.(milestone);
                                  setSelectedMilestone(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <EyeIcon className="w-4 h-4 mr-3" />
                                View Details
                              </button>
                              {isInstructor && (
                                <button
                                  onClick={() => {
                                    setSignOffModalMilestone(milestone);
                                    setSelectedMilestone(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <CheckCircleIcon className="w-4 h-4 mr-3" />
                                  Manage Sign-offs
                                </button>
                              )}
                              {isInstructor && onEditMilestone && (
                                <button
                                  onClick={() => {
                                    onEditMilestone(milestone);
                                    setSelectedMilestone(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <PencilIcon className="w-4 h-4 mr-3" />
                                  Edit
                                </button>
                              )}
                              {isInstructor && onDeleteMilestone && (
                                <button
                                  onClick={() => {
                                    handleDeleteMilestone(milestone);
                                    setSelectedMilestone(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                >
                                  <TrashIcon className="w-4 h-4 mr-3" />
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {signOffModalMilestone && (
        <MilestoneSignOffModal
          milestoneId={signOffModalMilestone._id}
          personaSignOffs={signOffModalMilestone.personaSignOffs as any}
          isOpen={!!signOffModalMilestone}
          onClose={() => setSignOffModalMilestone(null)}
          onUpdated={(updated) => {
            setMilestones(prev => prev.map(m => m._id === updated._id ? updated : m));
            setSignOffModalMilestone(updated);
          }}
        />
      )}
    </div>
  );
};

export default MilestoneList;