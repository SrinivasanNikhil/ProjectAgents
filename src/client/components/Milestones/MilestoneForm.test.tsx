import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import MilestoneForm from './MilestoneForm';

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

const mockProject = {
  _id: 'project1',
  name: 'Test Project',
  description: 'A test project for milestone form testing',
};

const mockPersonas = [
  {
    _id: 'persona1',
    name: 'Product Manager',
    role: 'Product Manager',
  },
  {
    _id: 'persona2',
    name: 'Tech Lead',
    role: 'Technical Lead',
  },
];

const mockMilestone = {
  _id: 'milestone1',
  name: 'Existing Milestone',
  description: 'An existing milestone for editing',
  dueDate: '2024-02-01',
  type: 'deliverable',
  requirements: [
    {
      title: 'Project Plan',
      description: 'Complete project planning document',
      isRequired: true,
      type: 'file',
    },
  ],
  personaSignOffs: [
    {
      persona: { _id: 'persona1' },
    },
  ],
  evaluation: {
    rubric: [
      {
        criterion: 'Code Quality',
        weight: 50,
        maxScore: 10,
        description: 'Quality of the code implementation',
      },
      {
        criterion: 'Documentation',
        weight: 50,
        maxScore: 10,
        description: 'Quality of documentation',
      },
    ],
  },
  settings: {
    requireAllPersonaApprovals: true,
    allowResubmission: true,
    maxResubmissions: 3,
    autoCloseAfterDays: 7,
  },
};

const defaultProps = {
  projectId: 'project1',
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
  isLoading: false,
};

describe('MilestoneForm', () => {
  beforeEach(() => {
    mockLocalStorage.getItem.mockReturnValue('mock-token');
    
    // Mock project and personas fetch
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockProject }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { personas: mockPersonas } }),
      });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render form with default values for new milestone', async () => {
      render(<MilestoneForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Create New Milestone')).toBeInTheDocument();
        expect(screen.getByText('Project: Test Project')).toBeInTheDocument();
      });

      expect(screen.getByLabelText('Milestone Name *')).toHaveValue('');
      expect(screen.getByLabelText('Description *')).toHaveValue('');
      expect(screen.getByLabelText('Due Date *')).toHaveValue('');
      expect(screen.getByDisplayValue('Deliverable')).toBeInTheDocument();
    });

    it('should render form with existing milestone data for editing', async () => {
      render(<MilestoneForm {...defaultProps} milestone={mockMilestone} />);

      await waitFor(() => {
        expect(screen.getByText('Edit Milestone')).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue('Existing Milestone')).toBeInTheDocument();
      expect(screen.getByDisplayValue('An existing milestone for editing')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-02-01')).toBeInTheDocument();
    });

    it('should show loading state when isLoading is true', async () => {
      render(<MilestoneForm {...defaultProps} isLoading={true} />);

      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /creating/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Tab Navigation', () => {
    it('should show all tabs', async () => {
      render(<MilestoneForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Basic Info')).toBeInTheDocument();
        expect(screen.getByText('Requirements')).toBeInTheDocument();
        expect(screen.getByText('Evaluation')).toBeInTheDocument();
        expect(screen.getByText('Checkpoints')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });
    });

    it('should switch tabs when clicked', async () => {
      render(<MilestoneForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Milestone Name *')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Requirements'));
      expect(screen.getByText('Milestone Requirements')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Evaluation'));
      expect(screen.getByText('Evaluation Rubric')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Settings'));
      expect(screen.getByText('Milestone Settings')).toBeInTheDocument();
    });
  });

  describe('Basic Info Tab', () => {
    it('should validate required fields', async () => {
      render(<MilestoneForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Milestone Name *')).toBeInTheDocument();
      });

      // Try to submit without filling required fields
      fireEvent.click(screen.getByText('Create Milestone'));

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
        expect(screen.getByText('Description is required')).toBeInTheDocument();
        expect(screen.getByText('Due date is required')).toBeInTheDocument();
      });

      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it('should validate due date is not in the past', async () => {
      render(<MilestoneForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Due Date *')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText('Milestone Name *');
      const descriptionInput = screen.getByLabelText('Description *');
      const dueDateInput = screen.getByLabelText('Due Date *');

      fireEvent.change(nameInput, { target: { value: 'Test Milestone' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test description' } });
      
      // Set date to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      fireEvent.change(dueDateInput, { 
        target: { value: yesterday.toISOString().split('T')[0] } 
      });

      fireEvent.click(screen.getByText('Create Milestone'));

      await waitFor(() => {
        expect(screen.getByText('Due date cannot be in the past')).toBeInTheDocument();
      });

      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it('should display personas for selection', async () => {
      render(<MilestoneForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Product Manager (Product Manager)')).toBeInTheDocument();
        expect(screen.getByText('Tech Lead (Technical Lead)')).toBeInTheDocument();
      });
    });

    it('should handle persona selection', async () => {
      render(<MilestoneForm {...defaultProps} />);

      await waitFor(() => {
        const checkbox = screen.getByLabelText(/Product Manager/);
        fireEvent.click(checkbox);
        expect(checkbox).toBeChecked();
      });
    });
  });

  describe('Requirements Tab', () => {
    it('should add new requirement', async () => {
      render(<MilestoneForm {...defaultProps} />);

      fireEvent.click(screen.getByText('Requirements'));

      await waitFor(() => {
        expect(screen.getByText('No requirements added yet.')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Add First Requirement'));

      expect(screen.getByText('Requirement 1')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Requirement title')).toBeInTheDocument();
    });

    it('should remove requirement', async () => {
      render(<MilestoneForm {...defaultProps} />);

      fireEvent.click(screen.getByText('Requirements'));
      fireEvent.click(screen.getByText('Add First Requirement'));

      await waitFor(() => {
        expect(screen.getByText('Requirement 1')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /remove requirement/i });
      fireEvent.click(deleteButton);

      expect(screen.queryByText('Requirement 1')).not.toBeInTheDocument();
    });

    it('should validate requirement fields', async () => {
      render(<MilestoneForm {...defaultProps} />);

      fireEvent.click(screen.getByText('Requirements'));
      fireEvent.click(screen.getByText('Add First Requirement'));

      // Fill basic info to avoid those validation errors
      const nameInput = screen.getByLabelText('Milestone Name *');
      const descriptionInput = screen.getByLabelText('Description *');
      const dueDateInput = screen.getByLabelText('Due Date *');

      fireEvent.change(nameInput, { target: { value: 'Test' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test' } });
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      fireEvent.change(dueDateInput, { 
        target: { value: tomorrow.toISOString().split('T')[0] } 
      });

      // Try to submit without filling requirement fields
      fireEvent.click(screen.getByText('Create Milestone'));

      await waitFor(() => {
        expect(screen.getByText('Requirement title is required')).toBeInTheDocument();
        expect(screen.getByText('Requirement description is required')).toBeInTheDocument();
      });
    });
  });

  describe('Evaluation Tab', () => {
    it('should add new rubric criterion', async () => {
      render(<MilestoneForm {...defaultProps} />);

      fireEvent.click(screen.getByText('Evaluation'));

      await waitFor(() => {
        expect(screen.getByText('No evaluation criteria added yet.')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Add First Criterion'));

      expect(screen.getByText('Criterion 1')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., Code Quality')).toBeInTheDocument();
    });

    it('should validate rubric weight sum equals 100%', async () => {
      render(<MilestoneForm {...defaultProps} />);

      fireEvent.click(screen.getByText('Evaluation'));
      fireEvent.click(screen.getByText('Add First Criterion'));

      // Fill criterion fields
      const criterionInput = screen.getByPlaceholderText('e.g., Code Quality');
      const weightInput = screen.getByDisplayValue('25');
      const descriptionInput = screen.getByPlaceholderText('Describe what this criterion evaluates');

      fireEvent.change(criterionInput, { target: { value: 'Code Quality' } });
      fireEvent.change(weightInput, { target: { value: '50' } });
      fireEvent.change(descriptionInput, { target: { value: 'Quality of code' } });

      // Fill basic info
      fireEvent.click(screen.getByText('Basic Info'));
      const nameInput = screen.getByLabelText('Milestone Name *');
      const milestoneDescriptionInput = screen.getByLabelText('Description *');
      const dueDateInput = screen.getByLabelText('Due Date *');

      fireEvent.change(nameInput, { target: { value: 'Test' } });
      fireEvent.change(milestoneDescriptionInput, { target: { value: 'Test' } });
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      fireEvent.change(dueDateInput, { 
        target: { value: tomorrow.toISOString().split('T')[0] } 
      });

      fireEvent.click(screen.getByText('Create Milestone'));

      await waitFor(() => {
        expect(screen.getByText('Rubric criteria weights must sum to 100%')).toBeInTheDocument();
      });
    });

    it('should show current weight total', async () => {
      render(<MilestoneForm {...defaultProps} />);

      fireEvent.click(screen.getByText('Evaluation'));
      fireEvent.click(screen.getByText('Add First Criterion'));

      await waitFor(() => {
        expect(screen.getByText('Current weight total: 25%')).toBeInTheDocument();
      });

      // Change weight
      const weightInput = screen.getByDisplayValue('25');
      fireEvent.change(weightInput, { target: { value: '75' } });

      await waitFor(() => {
        expect(screen.getByText('Current weight total: 75%')).toBeInTheDocument();
      });
    });
  });

  describe('Settings Tab', () => {
    it('should render settings controls', async () => {
      render(<MilestoneForm {...defaultProps} />);

      fireEvent.click(screen.getByText('Settings'));

      await waitFor(() => {
        expect(screen.getByLabelText('Maximum Resubmissions')).toBeInTheDocument();
        expect(screen.getByLabelText('Auto-close After (days)')).toBeInTheDocument();
        expect(screen.getByLabelText('Require all persona approvals before completion')).toBeInTheDocument();
        expect(screen.getByLabelText('Allow resubmissions')).toBeInTheDocument();
      });
    });

    it('should validate settings values', async () => {
      render(<MilestoneForm {...defaultProps} />);

      fireEvent.click(screen.getByText('Settings'));

      const maxResubmissionsInput = screen.getByLabelText('Maximum Resubmissions');
      const autoCloseInput = screen.getByLabelText('Auto-close After (days)');

      fireEvent.change(maxResubmissionsInput, { target: { value: '15' } });
      fireEvent.change(autoCloseInput, { target: { value: '100' } });

      // Fill basic info and try to submit
      fireEvent.click(screen.getByText('Basic Info'));
      const nameInput = screen.getByLabelText('Milestone Name *');
      const descriptionInput = screen.getByLabelText('Description *');
      const dueDateInput = screen.getByLabelText('Due Date *');

      fireEvent.change(nameInput, { target: { value: 'Test' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test' } });
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      fireEvent.change(dueDateInput, { 
        target: { value: tomorrow.toISOString().split('T')[0] } 
      });

      fireEvent.click(screen.getByText('Create Milestone'));

      await waitFor(() => {
        expect(screen.getByText('Max resubmissions must be between 0 and 10')).toBeInTheDocument();
        expect(screen.getByText('Auto close days must be between 1 and 90')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit valid form data', async () => {
      render(<MilestoneForm {...defaultProps} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText('Milestone Name *');
        const descriptionInput = screen.getByLabelText('Description *');
        const dueDateInput = screen.getByLabelText('Due Date *');

        fireEvent.change(nameInput, { target: { value: 'Test Milestone' } });
        fireEvent.change(descriptionInput, { target: { value: 'Test description' } });
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        fireEvent.change(dueDateInput, { 
          target: { value: tomorrow.toISOString().split('T')[0] } 
        });
      });

      fireEvent.click(screen.getByText('Create Milestone'));

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Milestone',
            description: 'Test description',
            type: 'deliverable',
            project: 'project1',
          })
        );
      });
    });

    it('should handle form submission errors', async () => {
      const onSubmitWithError = vi.fn().mockRejectedValue(new Error('Submission failed'));
      
      render(<MilestoneForm {...defaultProps} onSubmit={onSubmitWithError} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText('Milestone Name *');
        const descriptionInput = screen.getByLabelText('Description *');
        const dueDateInput = screen.getByLabelText('Due Date *');

        fireEvent.change(nameInput, { target: { value: 'Test Milestone' } });
        fireEvent.change(descriptionInput, { target: { value: 'Test description' } });
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        fireEvent.change(dueDateInput, { 
          target: { value: tomorrow.toISOString().split('T')[0] } 
        });
      });

      fireEvent.click(screen.getByText('Create Milestone'));

      await waitFor(() => {
        expect(onSubmitWithError).toHaveBeenCalled();
      });
    });
  });

  describe('Form Controls', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      render(<MilestoneForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancel'));
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('should call onCancel when close button is clicked', async () => {
      render(<MilestoneForm {...defaultProps} />);

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        fireEvent.click(closeButton);
      });

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should clear field errors when user starts typing', async () => {
      render(<MilestoneForm {...defaultProps} />);

      await waitFor(() => {
        // Try to submit to show errors
        fireEvent.click(screen.getByText('Create Milestone'));
      });

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });

      // Start typing in name field
      const nameInput = screen.getByLabelText('Milestone Name *');
      fireEvent.change(nameInput, { target: { value: 'Test' } });

      await waitFor(() => {
        expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
      });
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<MilestoneForm {...defaultProps} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching data:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Data Loading', () => {
    it('should fetch project and personas data on mount', async () => {
      render(<MilestoneForm {...defaultProps} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/projects/project1',
          expect.objectContaining({
            headers: { 'Authorization': 'Bearer mock-token' },
          })
        );

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/personas?project=project1',
          expect.objectContaining({
            headers: { 'Authorization': 'Bearer mock-token' },
          })
        );
      });
    });

    it('should show empty persona message when no personas available', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockProject }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { personas: [] } }),
        });

      render(<MilestoneForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No personas available for this project.')).toBeInTheDocument();
      });
    });
  });

  describe('Editing Mode', () => {
    it('should prefill form with milestone data when editing', async () => {
      render(<MilestoneForm {...defaultProps} milestone={mockMilestone} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Existing Milestone')).toBeInTheDocument();
        expect(screen.getByDisplayValue('An existing milestone for editing')).toBeInTheDocument();
      });

      // Check requirements tab
      fireEvent.click(screen.getByText('Requirements'));
      expect(screen.getByDisplayValue('Project Plan')).toBeInTheDocument();

      // Check evaluation tab
      fireEvent.click(screen.getByText('Evaluation'));
      expect(screen.getByDisplayValue('Code Quality')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Documentation')).toBeInTheDocument();
    });

    it('should show update button text when editing', async () => {
      render(<MilestoneForm {...defaultProps} milestone={mockMilestone} />);

      await waitFor(() => {
        expect(screen.getByText('Update Milestone')).toBeInTheDocument();
      });
    });

    it('should show updating text when loading during edit', async () => {
      render(<MilestoneForm {...defaultProps} milestone={mockMilestone} isLoading={true} />);

      await waitFor(() => {
        expect(screen.getByText('Updating...')).toBeInTheDocument();
      });
    });
  });

  describe('Checkpoints Tab', () => {
    const milestoneWithNoCheckpoints = {
      ...mockMilestone,
      checkpoints: [],
    };

    const milestoneWithCheckpoints = {
      ...mockMilestone,
      checkpoints: [
        {
          _id: 'cp1',
          title: 'Design Draft',
          description: 'Submit design draft',
          dueDate: '2024-02-05',
          status: 'pending',
          personaSignOffs: [],
        },
      ],
    };

    it('should show message when milestone is new (no checkpoint management yet)', async () => {
      render(<MilestoneForm {...defaultProps} />);

      await waitFor(() => expect(screen.getByText('Basic Info')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Checkpoints'));
      expect(screen.getByText('You can manage checkpoints after creating the milestone.')).toBeInTheDocument();
    });

    it('should render existing checkpoints and allow entering add mode', async () => {
      render(<MilestoneForm {...defaultProps} milestone={milestoneWithCheckpoints as any} />);

      await waitFor(() => expect(screen.getByText('Edit Milestone')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Checkpoints'));
      expect(screen.getByTestId('checkpoint-list')).toBeInTheDocument();
      expect(screen.getByText('Design Draft')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Add Checkpoint'));
      expect(screen.getByTestId('add-checkpoint-form')).toBeInTheDocument();
    });

    it('should add a checkpoint via API and update list', async () => {
      render(<MilestoneForm {...defaultProps} milestone={milestoneWithNoCheckpoints as any} />);

      await waitFor(() => expect(screen.getByText('Edit Milestone')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Checkpoints'));

      fireEvent.click(screen.getByText('Add Checkpoint'));
      const titleInput = screen.getByPlaceholderText('Checkpoint title');
      const descInput = screen.getByPlaceholderText('Checkpoint description');
      const dateInputs = screen.getAllByDisplayValue('', { selector: 'input[type="date"]' });
      const dueInput = dateInputs[0];

      fireEvent.change(titleInput, { target: { value: 'API Checkpoint' } });
      fireEvent.change(descInput, { target: { value: 'Via test' } });
      fireEvent.change(dueInput, { target: { value: '2024-02-10' } });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { checkpoints: [ { _id: 'cp2', title: 'API Checkpoint', description: 'Via test', dueDate: '2024-02-10', status: 'pending', personaSignOffs: [] } ] } }),
      });

      fireEvent.click(screen.getByText('Save Checkpoint'));

      await waitFor(() => expect(screen.queryByTestId('add-checkpoint-form')).not.toBeInTheDocument());
      expect(screen.getByText('API Checkpoint')).toBeInTheDocument();
    });

    it('should edit and delete a checkpoint via API', async () => {
      render(<MilestoneForm {...defaultProps} milestone={milestoneWithCheckpoints as any} />);

      await waitFor(() => expect(screen.getByText('Edit Milestone')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Checkpoints'));

      // Enter edit mode
      fireEvent.click(screen.getByText('Edit'));

      // Mock update API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { checkpoints: [ { _id: 'cp1', title: 'Design Draft (Updated)', description: 'Submit design draft', dueDate: '2024-02-05', status: 'in-progress', personaSignOffs: [] } ] } }),
      });

      // Change title then save
      const titleInputs = screen.getAllByPlaceholderText('Title');
      fireEvent.change(titleInputs[0], { target: { value: 'Design Draft (Updated)' } });
      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => expect(screen.getByText(/Design Draft \(Updated\)/)).toBeInTheDocument());

      // Mock delete API
      // Stub window.confirm to auto-accept
      const originalConfirm = window.confirm;
      // @ts-ignore
      window.confirm = () => true;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { checkpoints: [] } }),
      });

      fireEvent.click(screen.getByText('Delete'));
      await waitFor(() => expect(screen.queryByText('Design Draft (Updated)')).not.toBeInTheDocument());
      window.confirm = originalConfirm;
    });
  });
});