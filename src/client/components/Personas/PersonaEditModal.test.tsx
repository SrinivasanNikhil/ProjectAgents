import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { PersonaEditModal } from './PersonaEditModal';

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

// Mock PersonaForm component
vi.mock('./PersonaForm', () => ({
  default: ({ onSubmit, onCancel, initialData, isLoading }: any) => (
    <div data-testid="persona-form">
      <div data-testid="form-loading">
        {isLoading ? 'Loading' : 'Not Loading'}
      </div>
      <div data-testid="form-initial-data">{JSON.stringify(initialData)}</div>
      <button
        onClick={() =>
          onSubmit({ name: 'Updated Persona', role: 'Updated Role' })
        }
      >
        Submit
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

const mockPersona = {
  _id: 'persona-123',
  name: 'Test Persona',
  role: 'Product Manager',
  project: {
    _id: 'project-123',
    name: 'Test Project',
  },
  background: 'Experienced product manager with 10 years in tech',
  personality: {
    traits: ['analytical', 'collaborative'],
    communicationStyle: 'direct',
    decisionMakingStyle: 'data-driven',
    priorities: ['quality', 'timeline'],
    goals: ['launch successful product', 'improve user experience'],
  },
  aiConfiguration: {
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: 'You are a helpful product manager',
    contextWindow: 10,
  },
  availability: {
    isActive: true,
    responseTime: 5,
    workingHours: {
      start: '09:00',
      end: '17:00',
      timezone: 'UTC',
    },
  },
  mood: {
    current: 75,
    history: [
      {
        value: 75,
        timestamp: new Date(),
        reason: 'Good progress on project',
      },
    ],
  },
  stats: {
    totalConversations: 15,
    totalMessages: 45,
    averageResponseTime: 3.2,
    lastInteraction: new Date(),
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PersonaEditModal', () => {
  const mockOnClose = vi.fn();
  const mockOnPersonaUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('mock-token');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when not open', () => {
    render(
      <PersonaEditModal
        personaId="persona-123"
        isOpen={false}
        onClose={mockOnClose}
        onPersonaUpdated={mockOnPersonaUpdated}
      />
    );

    expect(screen.queryByText('Edit Persona')).not.toBeInTheDocument();
  });

  it('shows loading state when fetching persona data', async () => {
    mockedAxios.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <PersonaEditModal
        personaId="persona-123"
        isOpen={true}
        onClose={mockOnClose}
        onPersonaUpdated={mockOnPersonaUpdated}
      />
    );

    expect(screen.getByText('Loading persona data...')).toBeInTheDocument();
  });

  it('fetches and displays persona data successfully', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        success: true,
        data: mockPersona,
      },
    });

    render(
      <PersonaEditModal
        personaId="persona-123"
        isOpen={true}
        onClose={mockOnClose}
        onPersonaUpdated={mockOnPersonaUpdated}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText('Edit Persona: Test Persona')
      ).toBeInTheDocument();
    });

    expect(mockedAxios.get).toHaveBeenCalledWith('/api/personas/persona-123', {
      headers: {
        Authorization: 'Bearer mock-token',
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId('form-initial-data')).toHaveTextContent(
        'Test Persona'
      );
    });
  });

  it('handles fetch error gracefully', async () => {
    mockedAxios.get.mockRejectedValue({
      response: {
        data: {
          message: 'Persona not found',
        },
      },
    });

    render(
      <PersonaEditModal
        personaId="persona-123"
        isOpen={true}
        onClose={mockOnClose}
        onPersonaUpdated={mockOnPersonaUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Persona not found')).toBeInTheDocument();
    });
  });

  it('handles network error gracefully', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network error'));

    render(
      <PersonaEditModal
        personaId="persona-123"
        isOpen={true}
        onClose={mockOnClose}
        onPersonaUpdated={mockOnPersonaUpdated}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText('Failed to fetch persona data')
      ).toBeInTheDocument();
    });
  });

  it('submits form data successfully', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        success: true,
        data: mockPersona,
      },
    });

    mockedAxios.put.mockResolvedValue({
      data: {
        success: true,
        data: { ...mockPersona, name: 'Updated Persona' },
      },
    });

    render(
      <PersonaEditModal
        personaId="persona-123"
        isOpen={true}
        onClose={mockOnClose}
        onPersonaUpdated={mockOnPersonaUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('persona-form')).toBeInTheDocument();
    });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith(
        '/api/personas/persona-123',
        { name: 'Updated Persona', role: 'Updated Role' },
        {
          headers: {
            Authorization: 'Bearer mock-token',
          },
        }
      );
    });

    expect(mockOnPersonaUpdated).toHaveBeenCalledWith({
      ...mockPersona,
      name: 'Updated Persona',
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles submit error gracefully', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        success: true,
        data: mockPersona,
      },
    });

    mockedAxios.put.mockRejectedValue({
      response: {
        data: {
          message: 'Update failed',
        },
      },
    });

    render(
      <PersonaEditModal
        personaId="persona-123"
        isOpen={true}
        onClose={mockOnClose}
        onPersonaUpdated={mockOnPersonaUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('persona-form')).toBeInTheDocument();
    });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });

    expect(mockOnPersonaUpdated).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('closes modal when cancel is clicked', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        success: true,
        data: mockPersona,
      },
    });

    render(
      <PersonaEditModal
        personaId="persona-123"
        isOpen={true}
        onClose={mockOnClose}
        onPersonaUpdated={mockOnPersonaUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('persona-form')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when close button is clicked', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        success: true,
        data: mockPersona,
      },
    });

    render(
      <PersonaEditModal
        personaId="persona-123"
        isOpen={true}
        onClose={mockOnClose}
        onPersonaUpdated={mockOnPersonaUpdated}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText('Edit Persona: Test Persona')
      ).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: '' }); // Close X button
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('clears error when modal is closed and reopened', async () => {
    mockedAxios.get
      .mockRejectedValueOnce({
        response: {
          data: {
            message: 'Persona not found',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: mockPersona,
        },
      });

    const { rerender } = render(
      <PersonaEditModal
        personaId="persona-123"
        isOpen={true}
        onClose={mockOnClose}
        onPersonaUpdated={mockOnPersonaUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Persona not found')).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: '' })); // Close X button

    // Reopen modal
    rerender(
      <PersonaEditModal
        personaId="persona-123"
        isOpen={true}
        onClose={mockOnClose}
        onPersonaUpdated={mockOnPersonaUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Persona not found')).not.toBeInTheDocument();
    });
  });

  it('passes correct initial data to PersonaForm', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        success: true,
        data: mockPersona,
      },
    });

    render(
      <PersonaEditModal
        personaId="persona-123"
        isOpen={true}
        onClose={mockOnClose}
        onPersonaUpdated={mockOnPersonaUpdated}
      />
    );

    await waitFor(() => {
      const initialDataElement = screen.getByTestId('form-initial-data');
      const initialData = JSON.parse(initialDataElement.textContent || '{}');

      expect(initialData.name).toBe('Test Persona');
      expect(initialData.role).toBe('Product Manager');
      expect(initialData.projectId).toBe('project-123');
      expect(initialData.background).toBe(
        'Experienced product manager with 10 years in tech'
      );
      expect(initialData.personality.traits).toEqual([
        'analytical',
        'collaborative',
      ]);
      expect(initialData.aiConfiguration.model).toBe('gpt-4');
      expect(initialData.availability.isActive).toBe(true);
    });
  });
});
