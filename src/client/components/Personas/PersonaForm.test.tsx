import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PersonaForm from './PersonaForm';
import axios from 'axios';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('PersonaForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const mockProjects = [
    {
      _id: '1',
      name: 'Test Project 1',
      description: 'A test project',
      projectType: 'web-application',
      industry: 'Technology',
      scope: 'medium',
    },
    {
      _id: '2',
      name: 'Test Project 2',
      description: 'Another test project',
      projectType: 'mobile-app',
      industry: 'Healthcare',
      scope: 'large',
    },
  ];

  const mockSuggestions = [
    {
      role: 'Product Manager',
      background: 'Experienced product manager with 5+ years in tech',
      personality: {
        traits: ['analytical', 'collaborative', 'detail-oriented'],
        communicationStyle: 'collaborative',
        decisionMakingStyle: 'analytical',
        priorities: ['user experience', 'timeline'],
        goals: ['deliver successful product'],
      },
      reasoning: 'This role would be valuable for project management',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('mock-token');
  });

  it('renders the form with all required fields', () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockProjects } });

    render(<PersonaForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByText('Create New Persona')).toBeInTheDocument();
    expect(screen.getByLabelText(/Persona Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Role/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Background/)).toBeInTheDocument();
    expect(screen.getByText('Create Persona')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('loads projects on mount', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockProjects } });

    render(<PersonaForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/projects', {
        headers: {
          Authorization: 'Bearer mock-token',
        },
      });
    });
  });

  it('displays projects in the dropdown', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockProjects } });

    render(<PersonaForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      const projectSelect = screen.getByLabelText(/Project/);
      fireEvent.click(projectSelect);
      expect(
        screen.getByText('Test Project 1 - Technology')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Test Project 2 - Healthcare')
      ).toBeInTheDocument();
    });
  });

  it('loads suggestions when project is selected', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { data: mockProjects } })
      .mockResolvedValueOnce({ data: { data: mockSuggestions } });

    render(<PersonaForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      const projectSelect = screen.getByLabelText(/Project/);
      fireEvent.change(projectSelect, { target: { value: '1' } });
    });

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/api/personas/suggestions/1',
        {
          headers: {
            Authorization: 'Bearer mock-token',
          },
        }
      );
    });
  });

  it('displays suggestions when available', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { data: mockProjects } })
      .mockResolvedValueOnce({ data: { data: mockSuggestions } });

    render(<PersonaForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      const projectSelect = screen.getByLabelText(/Project/);
      fireEvent.change(projectSelect, { target: { value: '1' } });
    });

    await waitFor(() => {
      expect(screen.getByText('AI-Generated Suggestions')).toBeInTheDocument();
      expect(screen.getByText('Product Manager')).toBeInTheDocument();
      expect(screen.getByText('Apply')).toBeInTheDocument();
    });
  });

  it('applies suggestion when Apply button is clicked', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { data: mockProjects } })
      .mockResolvedValueOnce({ data: { data: mockSuggestions } });

    render(<PersonaForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      const projectSelect = screen.getByLabelText(/Project/);
      fireEvent.change(projectSelect, { target: { value: '1' } });
    });

    await waitFor(() => {
      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);
    });

    await waitFor(() => {
      const roleInput = screen.getByLabelText(/Role/) as HTMLInputElement;
      expect(roleInput.value).toBe('Product Manager');
    });
  });

  it('adds personality traits', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockProjects } });

    render(<PersonaForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      const traitInput = screen.getByPlaceholderText('Add a personality trait');
      const addButton = screen.getByText('Add');

      fireEvent.change(traitInput, { target: { value: 'Analytical' } });
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Analytical')).toBeInTheDocument();
    });
  });

  it('removes personality traits', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockProjects } });

    render(<PersonaForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      const traitInput = screen.getByPlaceholderText('Add a personality trait');
      const addButton = screen.getByText('Add');

      fireEvent.change(traitInput, { target: { value: 'Analytical' } });
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      const removeButton = screen.getByText('×');
      fireEvent.click(removeButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Analytical')).not.toBeInTheDocument();
    });
  });

  it('adds priorities', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockProjects } });

    render(<PersonaForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      const priorityInput = screen.getByPlaceholderText('Add a priority');
      const addButton = screen.getAllByText('Add')[1]; // Second Add button

      fireEvent.change(priorityInput, { target: { value: 'User Experience' } });
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(screen.getByText('User Experience')).toBeInTheDocument();
    });
  });

  it('adds goals', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockProjects } });

    render(<PersonaForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      const goalInput = screen.getByPlaceholderText('Add a goal');
      const addButton = screen.getAllByText('Add')[2]; // Third Add button

      fireEvent.change(goalInput, {
        target: { value: 'Deliver successful project' },
      });
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(
        screen.getByText('Deliver successful project')
      ).toBeInTheDocument();
    });
  });

  it('generates system prompt when Auto-Generate is clicked', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockProjects } });

    render(<PersonaForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      // Fill in required fields
      fireEvent.change(screen.getByLabelText(/Persona Name/), {
        target: { value: 'John Doe' },
      });
      fireEvent.change(screen.getByLabelText(/Role/), {
        target: { value: 'Developer' },
      });
      fireEvent.change(screen.getByLabelText(/Background/), {
        target: { value: 'Experienced developer with 5 years of experience' },
      });
    });

    await waitFor(() => {
      const autoGenerateButton = screen.getByText('Auto-Generate');
      fireEvent.click(autoGenerateButton);
    });

    await waitFor(() => {
      const systemPromptTextarea = screen.getByPlaceholderText(
        /Enter the system prompt/
      );
      expect(systemPromptTextarea).toHaveValue(
        expect.stringContaining('John Doe')
      );
      expect(systemPromptTextarea).toHaveValue(
        expect.stringContaining('Developer')
      );
    });
  });

  it('validates required fields on submit', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockProjects } });

    render(<PersonaForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      const submitButton = screen.getByText('Create Persona');
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Role is required')).toBeInTheDocument();
      expect(screen.getByText('Project is required')).toBeInTheDocument();
      expect(screen.getByText('Background is required')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockProjects } });

    render(<PersonaForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      // Fill in required fields
      fireEvent.change(screen.getByLabelText(/Persona Name/), {
        target: { value: 'John Doe' },
      });
      fireEvent.change(screen.getByLabelText(/Project/), {
        target: { value: '1' },
      });
      fireEvent.change(screen.getByLabelText(/Role/), {
        target: { value: 'Developer' },
      });
      fireEvent.change(screen.getByLabelText(/Background/), {
        target: {
          value:
            'Experienced developer with 5 years of experience in web development and mobile applications. Specializes in React, Node.js, and cloud technologies.',
        },
      });
    });

    // Add required personality traits
    await waitFor(() => {
      const traitInput = screen.getByPlaceholderText('Add a personality trait');
      const addButton = screen.getByText('Add');

      fireEvent.change(traitInput, { target: { value: 'Analytical' } });
      fireEvent.click(addButton);
      fireEvent.change(traitInput, { target: { value: 'Detail-oriented' } });
      fireEvent.click(addButton);
      fireEvent.change(traitInput, { target: { value: 'Collaborative' } });
      fireEvent.click(addButton);
    });

    // Add required priorities
    await waitFor(() => {
      const priorityInput = screen.getByPlaceholderText('Add a priority');
      const addButton = screen.getAllByText('Add')[1];

      fireEvent.change(priorityInput, { target: { value: 'Code Quality' } });
      fireEvent.click(addButton);
      fireEvent.change(priorityInput, { target: { value: 'Performance' } });
      fireEvent.click(addButton);
    });

    // Add required goals
    await waitFor(() => {
      const goalInput = screen.getByPlaceholderText('Add a goal');
      const addButton = screen.getAllByText('Add')[2];

      fireEvent.change(goalInput, {
        target: { value: 'Deliver high-quality software' },
      });
      fireEvent.click(addButton);
    });

    // Generate system prompt
    await waitFor(() => {
      const autoGenerateButton = screen.getByText('Auto-Generate');
      fireEvent.click(autoGenerateButton);
    });

    await waitFor(() => {
      const submitButton = screen.getByText('Create Persona');
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          role: 'Developer',
          projectId: '1',
          background:
            'Experienced developer with 5 years of experience in web development and mobile applications. Specializes in React, Node.js, and cloud technologies.',
          personality: expect.objectContaining({
            traits: ['Analytical', 'Detail-oriented', 'Collaborative'],
            priorities: ['Code Quality', 'Performance'],
            goals: ['Deliver high-quality software'],
          }),
        })
      );
    });
  });

  it('calls onCancel when Cancel button is clicked', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockProjects } });

    render(<PersonaForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
    });

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('displays loading state when submitting', () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockProjects } });

    render(
      <PersonaForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(screen.getByText('Creating...')).toBeDisabled();
  });

  it('displays edit mode when initialData is provided', () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockProjects } });

    const initialData = {
      name: 'Existing Persona',
      role: 'Manager',
    };

    render(
      <PersonaForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={initialData}
      />
    );

    expect(screen.getByText('Edit Persona')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing Persona')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Manager')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

    render(<PersonaForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load projects')).toBeInTheDocument();
    });
  });

  it('handles suggestion API errors gracefully', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { data: mockProjects } })
      .mockRejectedValueOnce(new Error('Suggestion API Error'));

    render(<PersonaForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      const projectSelect = screen.getByLabelText(/Project/);
      fireEvent.change(projectSelect, { target: { value: '1' } });
    });

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load suggestions')
      ).toBeInTheDocument();
    });
  });

  it('handles submit errors gracefully', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockProjects } });
    mockOnSubmit.mockRejectedValueOnce(new Error('Submit Error'));

    render(<PersonaForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Fill in minimal required data
    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/Persona Name/), {
        target: { value: 'John' },
      });
      fireEvent.change(screen.getByLabelText(/Project/), {
        target: { value: '1' },
      });
      fireEvent.change(screen.getByLabelText(/Role/), {
        target: { value: 'Developer' },
      });
      fireEvent.change(screen.getByLabelText(/Background/), {
        target: {
          value:
            'Experienced developer with 5 years of experience in web development and mobile applications. Specializes in React, Node.js, and cloud technologies.',
        },
      });
    });

    // Add required traits, priorities, and goals
    await waitFor(() => {
      const traitInput = screen.getByPlaceholderText('Add a personality trait');
      const addButton = screen.getByText('Add');
      fireEvent.change(traitInput, { target: { value: 'Analytical' } });
      fireEvent.click(addButton);
      fireEvent.change(traitInput, { target: { value: 'Detail-oriented' } });
      fireEvent.click(addButton);
      fireEvent.change(traitInput, { target: { value: 'Collaborative' } });
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      const priorityInput = screen.getByPlaceholderText('Add a priority');
      const addButton = screen.getAllByText('Add')[1];
      fireEvent.change(priorityInput, { target: { value: 'Code Quality' } });
      fireEvent.click(addButton);
      fireEvent.change(priorityInput, { target: { value: 'Performance' } });
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      const goalInput = screen.getByPlaceholderText('Add a goal');
      const addButton = screen.getAllByText('Add')[2];
      fireEvent.change(goalInput, {
        target: { value: 'Deliver high-quality software' },
      });
      fireEvent.click(addButton);
    });

    // Generate system prompt
    await waitFor(() => {
      const autoGenerateButton = screen.getByText('Auto-Generate');
      fireEvent.click(autoGenerateButton);
    });

    await waitFor(() => {
      const submitButton = screen.getByText('Create Persona');
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to create persona')).toBeInTheDocument();
    });
  });
});
