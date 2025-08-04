import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import MilestoneList from './MilestoneList';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  value: vi.fn(() => true),
});

const mockMilestones = [
  {
    _id: '1',
    name: 'Project Kickoff',
    description: 'Initial project milestone',
    dueDate: '2024-02-01T00:00:00.000Z',
    status: 'pending',
    type: 'deliverable',
    project: {
      _id: 'project1',
      name: 'Test Project',
    },
    personaSignOffs: [
      {
        _id: 'signoff1',
        persona: {
          _id: 'persona1',
          name: 'Product Manager',
          role: 'Product Manager',
        },
        status: 'pending',
      },
    ],
    submissions: [],
    requirements: [
      {
        title: 'Project Plan',
        description: 'Complete project planning document',
        isRequired: true,
        type: 'file',
      },
    ],
    daysUntilDue: 7,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    _id: '2',
    name: 'Mid-Project Review',
    description: 'Review milestone at project midpoint',
    dueDate: '2024-02-15T00:00:00.000Z',
    status: 'in-progress',
    type: 'review',
    project: {
      _id: 'project1',
      name: 'Test Project',
    },
    personaSignOffs: [
      {
        _id: 'signoff2',
        persona: {
          _id: 'persona1',
          name: 'Product Manager',
          role: 'Product Manager',
        },
        status: 'approved',
        satisfactionScore: 8,
      },
    ],
    submissions: [
      {
        _id: 'submission1',
        student: {
          _id: 'student1',
          firstName: 'John',
          lastName: 'Doe',
        },
        submittedAt: '2024-01-15T00:00:00.000Z',
        status: 'submitted',
      },
    ],
    requirements: [],
    daysUntilDue: 21,
    averageSatisfactionScore: 8,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
  },
  {
    _id: '3',
    name: 'Overdue Milestone',
    description: 'This milestone is overdue',
    dueDate: '2024-01-01T00:00:00.000Z',
    status: 'overdue',
    type: 'presentation',
    project: {
      _id: 'project1',
      name: 'Test Project',
    },
    personaSignOffs: [],
    submissions: [],
    requirements: [],
    daysUntilDue: -15,
    createdAt: '2023-12-01T00:00:00.000Z',
    updatedAt: '2023-12-01T00:00:00.000Z',
  },
];

const defaultProps = {
  projectId: 'project1',
  onCreateMilestone: vi.fn(),
  onEditMilestone: vi.fn(),
  onDeleteMilestone: vi.fn(),
  onViewMilestone: vi.fn(),
  isInstructor: true,
  currentUserId: 'user1',
};

describe('MilestoneList', () => {
  beforeEach(() => {
    mockLocalStorage.getItem.mockReturnValue('mock-token');
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          milestones: mockMilestones,
          total: mockMilestones.length,
          page: 1,
          totalPages: 1,
        },
      }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render milestone list with data', async () => {
      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Milestones')).toBeInTheDocument();
        expect(screen.getByText('3 milestones found')).toBeInTheDocument();
      });

      expect(screen.getByText('Project Kickoff')).toBeInTheDocument();
      expect(screen.getByText('Mid-Project Review')).toBeInTheDocument();
      expect(screen.getByText('Overdue Milestone')).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      render(<MilestoneList {...defaultProps} />);
      
      // Should show loading animation
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should render empty state when no milestones', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            milestones: [],
            total: 0,
            page: 1,
            totalPages: 0,
          },
        }),
      });

      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No milestones')).toBeInTheDocument();
        expect(screen.getByText('Get started by creating a new milestone.')).toBeInTheDocument();
      });
    });

    it('should show project column when showProjectColumn is true', async () => {
      render(<MilestoneList {...defaultProps} showProjectColumn={true} />);

      await waitFor(() => {
        expect(screen.getByText('Project')).toBeInTheDocument();
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
    });

    it('should hide New Milestone button for non-instructors', async () => {
      render(<MilestoneList {...defaultProps} isInstructor={false} />);

      await waitFor(() => {
        expect(screen.queryByText('New Milestone')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('should show filters when filter button is clicked', async () => {
      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Filters'));

      expect(screen.getByPlaceholderText('Search milestones...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Types')).toBeInTheDocument();
    });

    it('should filter by search term', async () => {
      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Filters'));
      });

      const searchInput = screen.getByPlaceholderText('Search milestones...');
      fireEvent.change(searchInput, { target: { value: 'kickoff' } });

      // Should trigger a new fetch with search parameters
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('sort=dueDate&order=asc&limit=50'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-token',
            }),
          })
        );
      });
    });

    it('should filter by status', async () => {
      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Filters'));
      });

      const statusSelect = screen.getByDisplayValue('All Statuses');
      fireEvent.change(statusSelect, { target: { value: 'pending' } });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('status=pending'),
          expect.any(Object)
        );
      });
    });

    it('should filter by type', async () => {
      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Filters'));
      });

      const typeSelect = screen.getByDisplayValue('All Types');
      fireEvent.change(typeSelect, { target: { value: 'deliverable' } });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('type=deliverable'),
          expect.any(Object)
        );
      });
    });

    it('should filter overdue milestones', async () => {
      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Filters'));
      });

      const overdueCheckbox = screen.getByLabelText('Show overdue only');
      fireEvent.click(overdueCheckbox);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('overdue=true'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Sorting', () => {
    it('should sort by name when name column is clicked', async () => {
      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Name')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Name'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('sort=name&order=asc'),
          expect.any(Object)
        );
      });
    });

    it('should toggle sort order when clicking same column twice', async () => {
      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        const nameHeader = screen.getByText('Name');
        fireEvent.click(nameHeader);
      });

      await waitFor(() => {
        const nameHeader = screen.getByText('Name');
        fireEvent.click(nameHeader);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.stringContaining('sort=name&order=desc'),
          expect.any(Object)
        );
      });
    });

    it('should sort by due date when due date column is clicked', async () => {
      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Due Date')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Due Date'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('sort=dueDate&order=asc'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Actions', () => {
    it('should call onCreateMilestone when New Milestone button is clicked', async () => {
      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('New Milestone')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('New Milestone'));
      expect(defaultProps.onCreateMilestone).toHaveBeenCalled();
    });

    it('should show action menu when milestone menu button is clicked', async () => {
      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByLabelText(/actions/i)[0]).toBeInTheDocument();
      });

      // Click the first milestone's action button
      fireEvent.click(screen.getAllByRole('button').find(button => 
        button.querySelector('svg')?.classList.contains('w-5')
      )!);

      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should call onViewMilestone when View Details is clicked', async () => {
      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        // Click action menu button
        fireEvent.click(screen.getAllByRole('button').find(button => 
          button.querySelector('svg')?.classList.contains('w-5')
        )!);
      });

      fireEvent.click(screen.getByText('View Details'));
      expect(defaultProps.onViewMilestone).toHaveBeenCalledWith(mockMilestones[0]);
    });

    it('should call onEditMilestone when Edit is clicked', async () => {
      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        // Click action menu button
        fireEvent.click(screen.getAllByRole('button').find(button => 
          button.querySelector('svg')?.classList.contains('w-5')
        )!);
      });

      fireEvent.click(screen.getByText('Edit'));
      expect(defaultProps.onEditMilestone).toHaveBeenCalledWith(mockMilestones[0]);
    });

    it('should delete milestone when Delete is clicked and confirmed', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { milestones: mockMilestones } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        // Click action menu button
        fireEvent.click(screen.getAllByRole('button').find(button => 
          button.querySelector('svg')?.classList.contains('w-5')
        )!);
      });

      fireEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/milestones/1',
          expect.objectContaining({
            method: 'DELETE',
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-token',
            }),
          })
        );
      });
    });

    it('should not show Edit and Delete actions for non-instructors', async () => {
      render(<MilestoneList {...defaultProps} isInstructor={false} />);

      await waitFor(() => {
        // Click action menu button
        fireEvent.click(screen.getAllByRole('button').find(button => 
          button.querySelector('svg')?.classList.contains('w-5')
        )!);
      });

      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });
  });

  describe('Status and Progress Display', () => {
    it('should display correct status badges', async () => {
      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('pending')).toBeInTheDocument();
        expect(screen.getByText('in-progress')).toBeInTheDocument();
        expect(screen.getByText('overdue')).toBeInTheDocument();
      });
    });

    it('should display correct type badges', async () => {
      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('deliverable')).toBeInTheDocument();
        expect(screen.getByText('review')).toBeInTheDocument();
        expect(screen.getByText('presentation')).toBeInTheDocument();
      });
    });

    it('should display persona sign-off progress', async () => {
      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText('Persona Sign-offs')).toHaveLength(3);
        expect(screen.getByText('0%')).toBeInTheDocument(); // First milestone
        expect(screen.getByText('100%')).toBeInTheDocument(); // Second milestone
      });
    });

    it('should display submission information', async () => {
      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('1 submission')).toBeInTheDocument();
        expect(screen.getAllByText('No submissions')).toHaveLength(2);
      });
    });

    it('should display due date information correctly', async () => {
      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('7 days remaining')).toBeInTheDocument();
        expect(screen.getByText('21 days remaining')).toBeInTheDocument();
        expect(screen.getByText('15 days overdue')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch milestones')).toBeInTheDocument();
      });
    });

    it('should display error message when API returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch milestones/)).toBeInTheDocument();
      });
    });

    it('should display error when delete fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { milestones: mockMilestones } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Forbidden',
        });

      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        // Click action menu button
        fireEvent.click(screen.getAllByRole('button').find(button => 
          button.querySelector('svg')?.classList.contains('w-5')
        )!);
      });

      fireEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(screen.getByText(/Failed to delete milestone/)).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching', () => {
    it('should fetch milestones with correct project filter', async () => {
      render(<MilestoneList {...defaultProps} projectId="project123" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('project=project123'),
          expect.any(Object)
        );
      });
    });

    it('should include authorization header', async () => {
      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-token',
            }),
          })
        );
      });
    });

    it('should refetch data when filters change', async () => {
      render(<MilestoneList {...defaultProps} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Filters'));
      });

      const statusSelect = screen.getByDisplayValue('All Statuses');
      fireEvent.change(statusSelect, { target: { value: 'completed' } });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});