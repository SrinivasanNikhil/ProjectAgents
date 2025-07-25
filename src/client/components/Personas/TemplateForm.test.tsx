import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TemplateForm from './TemplateForm';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('TemplateForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const mockInitialData = {
    name: 'Test Template',
    description: 'A test template for testing purposes',
    category: 'client',
    isPublic: true,
    tags: ['test', 'template'],
    template: {
      role: 'Test Role',
      background: 'This is a test background for the template',
      personality: {
        traits: ['analytical', 'collaborative'],
        communicationStyle: 'formal',
        decisionMakingStyle: 'analytical',
        priorities: ['quality', 'efficiency'],
        goals: ['achieve excellence'],
      },
      aiConfiguration: {
        model: 'gpt-4',
        temperature: 0.8,
        maxTokens: 2000,
        systemPrompt: 'You are a test persona.',
        contextWindow: 10,
      },
      availability: {
        responseTime: 10,
        workingHours: {
          start: '08:00',
          end: '18:00',
          timezone: 'UTC',
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with all required fields', () => {
    render(<TemplateForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByText('Create New Template')).toBeInTheDocument();
    expect(screen.getByLabelText(/Template Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Role/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Background/)).toBeInTheDocument();
    expect(screen.getByText('Create Template')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders in edit mode when isEditing is true', () => {
    render(
      <TemplateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isEditing={true}
      />
    );

    expect(screen.getByText('Edit Template')).toBeInTheDocument();
    expect(screen.getByText('Update Template')).toBeInTheDocument();
  });

  it('populates form with initial data', () => {
    render(
      <TemplateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={mockInitialData}
      />
    );

    expect(screen.getByDisplayValue('Test Template')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('A test template for testing purposes')
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Role')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('This is a test background for the template')
    ).toBeInTheDocument();
  });

  it('adds personality traits', async () => {
    render(<TemplateForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const traitInput = screen.getByPlaceholderText('Add a personality trait');
    const addButton = screen.getByText('Add');

    fireEvent.change(traitInput, { target: { value: 'analytical' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('analytical')).toBeInTheDocument();
    });
  });

  it('removes personality traits', async () => {
    render(
      <TemplateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={mockInitialData}
      />
    );

    const removeButtons = screen.getAllByText('×');
    fireEvent.click(removeButtons[0]); // Remove first trait

    await waitFor(() => {
      expect(screen.queryByText('analytical')).not.toBeInTheDocument();
    });
  });

  it('adds priorities', async () => {
    render(<TemplateForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const priorityInput = screen.getByPlaceholderText('Add a priority');
    const addButton = screen.getAllByText('Add')[1]; // Second Add button

    fireEvent.change(priorityInput, { target: { value: 'quality' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('quality')).toBeInTheDocument();
    });
  });

  it('adds goals', async () => {
    render(<TemplateForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const goalInput = screen.getByPlaceholderText('Add a goal');
    const addButton = screen.getAllByText('Add')[2]; // Third Add button

    fireEvent.change(goalInput, { target: { value: 'achieve excellence' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('achieve excellence')).toBeInTheDocument();
    });
  });

  it('adds tags', async () => {
    render(<TemplateForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const tagInput = screen.getByPlaceholderText('Add a tag');
    const addButton = screen.getAllByText('Add')[0]; // First Add button

    fireEvent.change(tagInput, { target: { value: 'test-tag' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('test-tag')).toBeInTheDocument();
    });
  });

  it('generates system prompt', async () => {
    render(
      <TemplateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={mockInitialData}
      />
    );

    const generateButton = screen.getByText('Auto-Generate');
    fireEvent.click(generateButton);

    await waitFor(() => {
      const systemPromptTextarea = screen.getByPlaceholderText(
        "Enter the system prompt that will guide the AI's responses..."
      );
      expect(systemPromptTextarea).toHaveValue(
        expect.stringContaining('You are Test Role')
      );
    });
  });

  it('validates required fields on submit', async () => {
    render(<TemplateForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const submitButton = screen.getByText('Create Template');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Template name is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
      expect(screen.getByText('Role is required')).toBeInTheDocument();
      expect(screen.getByText('Background is required')).toBeInTheDocument();
      expect(
        screen.getByText('At least 3 personality traits are required')
      ).toBeInTheDocument();
      expect(
        screen.getByText('At least 2 priorities are required')
      ).toBeInTheDocument();
      expect(
        screen.getByText('At least 1 goal is required')
      ).toBeInTheDocument();
      expect(screen.getByText('System prompt is required')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    render(
      <TemplateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={mockInitialData}
      />
    );

    const submitButton = screen.getByText('Update Template');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(mockInitialData);
    });
  });

  it('handles cancel button click', () => {
    render(<TemplateForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('disables submit button when loading', () => {
    render(
      <TemplateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    const submitButton = screen.getByText('Saving...');
    expect(submitButton).toBeDisabled();
  });

  it('displays loading state', () => {
    render(
      <TemplateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('handles public/private toggle', () => {
    render(<TemplateForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const publicCheckbox = screen.getByLabelText(/Make this template public/);
    fireEvent.click(publicCheckbox);

    expect(publicCheckbox).toBeChecked();
  });

  it('handles category selection', () => {
    render(<TemplateForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const categorySelect = screen.getByLabelText(/Category/);
    fireEvent.change(categorySelect, { target: { value: 'developer' } });

    expect(categorySelect).toHaveValue('developer');
  });

  it('handles communication style selection', () => {
    render(<TemplateForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const communicationSelect = screen.getByLabelText(/Communication Style/);
    fireEvent.change(communicationSelect, { target: { value: 'formal' } });

    expect(communicationSelect).toHaveValue('formal');
  });

  it('handles decision making style selection', () => {
    render(<TemplateForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const decisionSelect = screen.getByLabelText(/Decision Making Style/);
    fireEvent.change(decisionSelect, { target: { value: 'intuitive' } });

    expect(decisionSelect).toHaveValue('intuitive');
  });

  it('handles AI model selection', () => {
    render(<TemplateForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const modelSelect = screen.getByLabelText(/AI Model/);
    fireEvent.change(modelSelect, { target: { value: 'claude-3' } });

    expect(modelSelect).toHaveValue('claude-3');
  });

  it('handles temperature slider', () => {
    render(<TemplateForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const temperatureSlider = screen.getByDisplayValue('0.7');
    fireEvent.change(temperatureSlider, { target: { value: '1.2' } });

    expect(screen.getByText('Temperature: 1.2')).toBeInTheDocument();
  });

  it('handles response time input', () => {
    render(<TemplateForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const responseTimeInput = screen.getByLabelText(/Response Time/);
    fireEvent.change(responseTimeInput, { target: { value: '15' } });

    expect(responseTimeInput).toHaveValue(15);
  });

  it('handles working hours', () => {
    render(<TemplateForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const startTimeInput = screen.getByLabelText(/Start Time/);
    const endTimeInput = screen.getByLabelText(/End Time/);

    fireEvent.change(startTimeInput, { target: { value: '08:00' } });
    fireEvent.change(endTimeInput, { target: { value: '18:00' } });

    expect(startTimeInput).toHaveValue('08:00');
    expect(endTimeInput).toHaveValue('18:00');
  });

  it('prevents adding more than 10 traits', async () => {
    render(
      <TemplateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={{
          ...mockInitialData,
          template: {
            ...mockInitialData.template,
            personality: {
              ...mockInitialData.template.personality,
              traits: Array(10).fill('trait'),
            },
          },
        }}
      />
    );

    const traitInput = screen.getByPlaceholderText('Add a personality trait');
    const addButton = screen.getByText('Add');

    expect(addButton).toBeDisabled();
  });

  it('prevents adding more than 8 priorities', async () => {
    render(
      <TemplateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={{
          ...mockInitialData,
          template: {
            ...mockInitialData.template,
            personality: {
              ...mockInitialData.template.personality,
              priorities: Array(8).fill('priority'),
            },
          },
        }}
      />
    );

    const priorityInput = screen.getByPlaceholderText('Add a priority');
    const addButton = screen.getAllByText('Add')[1];

    expect(addButton).toBeDisabled();
  });

  it('prevents adding more than 5 goals', async () => {
    render(
      <TemplateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={{
          ...mockInitialData,
          template: {
            ...mockInitialData.template,
            personality: {
              ...mockInitialData.template.personality,
              goals: Array(5).fill('goal'),
            },
          },
        }}
      />
    );

    const goalInput = screen.getByPlaceholderText('Add a goal');
    const addButton = screen.getAllByText('Add')[2];

    expect(addButton).toBeDisabled();
  });

  it('prevents adding more than 10 tags', async () => {
    render(
      <TemplateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={{
          ...mockInitialData,
          tags: Array(10).fill('tag'),
        }}
      />
    );

    const tagInput = screen.getByPlaceholderText('Add a tag');
    const addButton = screen.getAllByText('Add')[0];

    expect(addButton).toBeDisabled();
  });

  it('handles enter key for adding traits', async () => {
    render(<TemplateForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const traitInput = screen.getByPlaceholderText('Add a personality trait');
    fireEvent.change(traitInput, { target: { value: 'analytical' } });
    fireEvent.keyPress(traitInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('analytical')).toBeInTheDocument();
    });
  });

  it('handles enter key for adding priorities', async () => {
    render(<TemplateForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const priorityInput = screen.getByPlaceholderText('Add a priority');
    fireEvent.change(priorityInput, { target: { value: 'quality' } });
    fireEvent.keyPress(priorityInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('quality')).toBeInTheDocument();
    });
  });

  it('handles enter key for adding goals', async () => {
    render(<TemplateForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const goalInput = screen.getByPlaceholderText('Add a goal');
    fireEvent.change(goalInput, { target: { value: 'achieve excellence' } });
    fireEvent.keyPress(goalInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('achieve excellence')).toBeInTheDocument();
    });
  });

  it('handles enter key for adding tags', async () => {
    render(<TemplateForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const tagInput = screen.getByPlaceholderText('Add a tag');
    fireEvent.change(tagInput, { target: { value: 'test-tag' } });
    fireEvent.keyPress(tagInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('test-tag')).toBeInTheDocument();
    });
  });

  it('displays error message on submit failure', async () => {
    mockOnSubmit.mockRejectedValueOnce(new Error('Submit failed'));

    render(
      <TemplateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={mockInitialData}
      />
    );

    const submitButton = screen.getByText('Update Template');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to save template')).toBeInTheDocument();
    });
  });
});
