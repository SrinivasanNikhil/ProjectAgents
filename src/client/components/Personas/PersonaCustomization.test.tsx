import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PersonaCustomization from './PersonaCustomization';
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

describe('PersonaCustomization', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  const mockPersonaId = 'test-persona-id';

  const mockPersonaData = {
    _id: 'test-persona-id',
    name: 'John Doe',
    role: 'Product Manager',
    personality: {
      traits: ['analytical', 'collaborative', 'detail-oriented'],
      communicationStyle: 'collaborative',
      decisionMakingStyle: 'analytical',
      priorities: ['user experience', 'timeline'],
      goals: ['deliver successful product'],
    },
    mood: {
      current: 50,
      history: [],
    },
    aiConfiguration: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      systemPrompt: 'You are a helpful assistant.',
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('mock-token');
  });

  it('renders the customization interface with persona data', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockPersonaData } });

    render(
      <PersonaCustomization
        personaId={mockPersonaId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText('Customize Persona: John Doe')
      ).toBeInTheDocument();
      expect(screen.getByText('Role: Product Manager')).toBeInTheDocument();
    });
  });

  it('loads persona data on mount', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockPersonaData } });

    render(
      <PersonaCustomization
        personaId={mockPersonaId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `/api/personas/${mockPersonaId}`,
        {
          headers: {
            Authorization: 'Bearer mock-token',
          },
        }
      );
    });
  });

  it('displays tab navigation', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockPersonaData } });

    render(
      <PersonaCustomization
        personaId={mockPersonaId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Personality')).toBeInTheDocument();
      expect(screen.getByText('Mood & Behavior')).toBeInTheDocument();
      expect(screen.getByText('Response Style')).toBeInTheDocument();
      expect(screen.getByText('AI Configuration')).toBeInTheDocument();
      expect(screen.getByText('Scenarios')).toBeInTheDocument();
      expect(screen.getByText('Availability')).toBeInTheDocument();
    });
  });

  it('switches between tabs', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockPersonaData } });

    render(
      <PersonaCustomization
        personaId={mockPersonaId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      // Default tab should be personality
      expect(
        screen.getByText('Personality Consistency Level')
      ).toBeInTheDocument();
    });

    // Switch to mood tab
    fireEvent.click(screen.getByText('Mood & Behavior'));
    await waitFor(() => {
      expect(screen.getByText('Baseline Mood: 50')).toBeInTheDocument();
    });

    // Switch to response style tab
    fireEvent.click(screen.getByText('Response Style'));
    await waitFor(() => {
      expect(screen.getByText('Response Verbosity')).toBeInTheDocument();
    });
  });

  it('updates personality consistency level', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockPersonaData } });

    render(
      <PersonaCustomization
        personaId={mockPersonaId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      const consistencySlider = screen.getByDisplayValue('75');
      fireEvent.change(consistencySlider, { target: { value: '90' } });
    });

    await waitFor(() => {
      expect(screen.getByText('Current: 90%')).toBeInTheDocument();
    });
  });

  it('updates mood baseline', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockPersonaData } });

    render(
      <PersonaCustomization
        personaId={mockPersonaId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Switch to mood tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('Mood & Behavior'));
    });

    await waitFor(() => {
      const moodSlider = screen.getByDisplayValue('50');
      fireEvent.change(moodSlider, { target: { value: '75' } });
    });

    await waitFor(() => {
      expect(screen.getByText('Baseline Mood: 75')).toBeInTheDocument();
    });
  });

  it('adds mood triggers', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockPersonaData } });

    render(
      <PersonaCustomization
        personaId={mockPersonaId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Switch to mood tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('Mood & Behavior'));
    });

    await waitFor(() => {
      // Fill in trigger form
      fireEvent.change(screen.getByPlaceholderText('Trigger type'), {
        target: { value: 'Deadline pressure' },
      });
      fireEvent.change(screen.getByPlaceholderText('Description'), {
        target: { value: 'When approaching deadlines' },
      });
      fireEvent.change(screen.getByPlaceholderText('Impact (-100 to 100)'), {
        target: { value: '-20' },
      });

      // Add trigger
      fireEvent.click(screen.getByText('Add Trigger'));
    });

    await waitFor(() => {
      expect(screen.getByText('Deadline pressure')).toBeInTheDocument();
      expect(
        screen.getByText('When approaching deadlines')
      ).toBeInTheDocument();
      expect(screen.getByText('Impact: -20')).toBeInTheDocument();
    });
  });

  it('removes mood triggers', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockPersonaData } });

    render(
      <PersonaCustomization
        personaId={mockPersonaId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Switch to mood tab and add a trigger first
    await waitFor(() => {
      fireEvent.click(screen.getByText('Mood & Behavior'));
    });

    await waitFor(() => {
      fireEvent.change(screen.getByPlaceholderText('Trigger type'), {
        target: { value: 'Test trigger' },
      });
      fireEvent.change(screen.getByPlaceholderText('Description'), {
        target: { value: 'Test description' },
      });
      fireEvent.click(screen.getByText('Add Trigger'));
    });

    await waitFor(() => {
      expect(screen.getByText('Test trigger')).toBeInTheDocument();
    });

    // Remove the trigger
    await waitFor(() => {
      const removeButtons = screen.getAllByText('Remove');
      fireEvent.click(removeButtons[0]);
    });

    await waitFor(() => {
      expect(screen.queryByText('Test trigger')).not.toBeInTheDocument();
    });
  });

  it('updates response style settings', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockPersonaData } });

    render(
      <PersonaCustomization
        personaId={mockPersonaId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Switch to response style tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('Response Style'));
    });

    await waitFor(() => {
      // Change verbosity
      const verbositySelect = screen.getByDisplayValue('moderate');
      fireEvent.change(verbositySelect, { target: { value: 'detailed' } });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('detailed')).toBeInTheDocument();
    });
  });

  it('updates AI configuration', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockPersonaData } });

    render(
      <PersonaCustomization
        personaId={mockPersonaId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Switch to AI configuration tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('AI Configuration'));
    });

    await waitFor(() => {
      // Change temperature
      const temperatureSlider = screen.getByDisplayValue('0.7');
      fireEvent.change(temperatureSlider, { target: { value: '1.2' } });
    });

    await waitFor(() => {
      expect(screen.getByText('Temperature: 1.2')).toBeInTheDocument();
    });
  });

  it('adds scenarios', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockPersonaData } });

    render(
      <PersonaCustomization
        personaId={mockPersonaId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Switch to scenarios tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('Scenarios'));
    });

    await waitFor(() => {
      // Fill in scenario form
      fireEvent.change(screen.getByPlaceholderText('Scenario name'), {
        target: { value: 'High-pressure meeting' },
      });
      fireEvent.change(screen.getByPlaceholderText('Scenario description'), {
        target: { value: 'When in high-pressure situations' },
      });

      // Add scenario
      fireEvent.click(screen.getByText('Add Scenario'));
    });

    await waitFor(() => {
      expect(screen.getByText('High-pressure meeting')).toBeInTheDocument();
      expect(
        screen.getByText('When in high-pressure situations')
      ).toBeInTheDocument();
    });
  });

  it('removes scenarios', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockPersonaData } });

    render(
      <PersonaCustomization
        personaId={mockPersonaId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Switch to scenarios tab and add a scenario first
    await waitFor(() => {
      fireEvent.click(screen.getByText('Scenarios'));
    });

    await waitFor(() => {
      fireEvent.change(screen.getByPlaceholderText('Scenario name'), {
        target: { value: 'Test scenario' },
      });
      fireEvent.click(screen.getByText('Add Scenario'));
    });

    await waitFor(() => {
      expect(screen.getByText('Test scenario')).toBeInTheDocument();
    });

    // Remove the scenario
    await waitFor(() => {
      const removeButtons = screen.getAllByText('Remove');
      fireEvent.click(removeButtons[0]);
    });

    await waitFor(() => {
      expect(screen.queryByText('Test scenario')).not.toBeInTheDocument();
    });
  });

  it('updates availability settings', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockPersonaData } });

    render(
      <PersonaCustomization
        personaId={mockPersonaId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Switch to availability tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('Availability'));
    });

    await waitFor(() => {
      // Change availability mode
      const modeSelect = screen.getByDisplayValue('working-hours');
      fireEvent.change(modeSelect, { target: { value: 'always' } });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('always')).toBeInTheDocument();
    });
  });

  it('calls onSave with updated data', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockPersonaData } });

    render(
      <PersonaCustomization
        personaId={mockPersonaId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      // Make some changes
      const consistencySlider = screen.getByDisplayValue('75');
      fireEvent.change(consistencySlider, { target: { value: '90' } });
    });

    await waitFor(() => {
      // Submit form
      fireEvent.click(screen.getByText('Save Customization'));
    });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          personality: expect.objectContaining({
            consistencyLevel: 90,
          }),
        })
      );
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockPersonaData } });

    render(
      <PersonaCustomization
        personaId={mockPersonaId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText('Cancel'));
    });

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('displays loading state', () => {
    mockedAxios.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <PersonaCustomization
        personaId={mockPersonaId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Loading persona data...')).toBeInTheDocument();
  });

  it('displays error when loading fails', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

    render(
      <PersonaCustomization
        personaId={mockPersonaId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load persona data')
      ).toBeInTheDocument();
    });
  });

  it('displays error when saving fails', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockPersonaData } });
    mockOnSave.mockRejectedValueOnce(new Error('Save Error'));

    render(
      <PersonaCustomization
        personaId={mockPersonaId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText('Save Customization'));
    });

    await waitFor(() => {
      expect(
        screen.getByText('Failed to save customization')
      ).toBeInTheDocument();
    });
  });

  it('disables form when loading', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockPersonaData } });

    render(
      <PersonaCustomization
        personaId={mockPersonaId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(screen.getByText('Saving...')).toBeDisabled();
    });
  });

  it('validates required fields for triggers', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockPersonaData } });

    render(
      <PersonaCustomization
        personaId={mockPersonaId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Switch to mood tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('Mood & Behavior'));
    });

    await waitFor(() => {
      // Try to add trigger without type
      fireEvent.click(screen.getByText('Add Trigger'));
    });

    await waitFor(() => {
      expect(screen.getByText('Add Trigger')).toBeDisabled();
    });
  });

  it('validates required fields for scenarios', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockPersonaData } });

    render(
      <PersonaCustomization
        personaId={mockPersonaId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Switch to scenarios tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('Scenarios'));
    });

    await waitFor(() => {
      // Try to add scenario without name
      fireEvent.click(screen.getByText('Add Scenario'));
    });

    await waitFor(() => {
      expect(screen.getByText('Add Scenario')).toBeDisabled();
    });
  });
});
