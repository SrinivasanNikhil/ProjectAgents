import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TemplateLibrary from './TemplateLibrary';
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

describe('TemplateLibrary', () => {
  const mockOnSelectTemplate = vi.fn();
  const mockOnEditTemplate = vi.fn();
  const mockOnDeleteTemplate = vi.fn();
  const mockOnCloneTemplate = vi.fn();
  const mockOnCreateTemplate = vi.fn();

  const mockTemplates = [
    {
      _id: '1',
      name: 'Product Manager Template',
      description: 'A template for product managers',
      category: 'manager',
      createdBy: {
        _id: 'user1',
        name: 'John Doe',
      },
      isPublic: true,
      tags: ['product', 'management', 'agile'],
      template: {
        role: 'Product Manager',
        background: 'Experienced product manager with 5+ years in tech',
        personality: {
          traits: ['analytical', 'collaborative', 'detail-oriented'],
          communicationStyle: 'collaborative',
          decisionMakingStyle: 'analytical',
          priorities: ['user experience', 'timeline'],
          goals: ['deliver successful product'],
        },
        aiConfiguration: {
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000,
          systemPrompt: 'You are a product manager...',
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
      },
      usage: {
        totalUses: 15,
        lastUsed: new Date('2024-01-15'),
        projects: ['project1', 'project2'],
      },
      version: 2,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
      usageDescription: 'Used 15 times',
      lastUsedDescription: '2 weeks ago',
    },
    {
      _id: '2',
      name: 'UX Designer Template',
      description: 'A template for UX designers',
      category: 'designer',
      createdBy: {
        _id: 'user2',
        name: 'Jane Smith',
      },
      isPublic: false,
      tags: ['ux', 'design', 'user-research'],
      template: {
        role: 'UX Designer',
        background: 'Creative UX designer with expertise in user research',
        personality: {
          traits: ['creative', 'empathetic', 'detail-oriented'],
          communicationStyle: 'collaborative',
          decisionMakingStyle: 'intuitive',
          priorities: ['user experience', 'accessibility'],
          goals: ['create intuitive interfaces'],
        },
        aiConfiguration: {
          model: 'gpt-4',
          temperature: 0.8,
          maxTokens: 2000,
          systemPrompt: 'You are a UX designer...',
          contextWindow: 10,
        },
        availability: {
          responseTime: 8,
          workingHours: {
            start: '10:00',
            end: '18:00',
            timezone: 'UTC',
          },
        },
      },
      usage: {
        totalUses: 8,
        lastUsed: new Date('2024-01-10'),
        projects: ['project3'],
      },
      version: 1,
      isActive: true,
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-10'),
      usageDescription: 'Used 8 times',
      lastUsedDescription: '3 weeks ago',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('mock-token');
  });

  it('renders the template library with header', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTemplates } });

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Template Library')).toBeInTheDocument();
    });
  });

  it('loads templates on mount', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTemplates } });

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/personas/templates?', {
        headers: {
          Authorization: 'Bearer mock-token',
        },
      });
    });
  });

  it('displays templates in grid view by default', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTemplates } });

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Product Manager Template')).toBeInTheDocument();
      expect(screen.getByText('UX Designer Template')).toBeInTheDocument();
    });
  });

  it('switches between grid and list view', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTemplates } });

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    await waitFor(() => {
      // Switch to list view
      const listButton = screen.getByTitle('List view');
      fireEvent.click(listButton);
    });

    await waitFor(() => {
      // Should still show templates
      expect(screen.getByText('Product Manager Template')).toBeInTheDocument();
    });
  });

  it('filters templates by search term', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTemplates } });

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search templates...');
      fireEvent.change(searchInput, { target: { value: 'Product' } });
    });

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/api/personas/templates?search=Product',
        {
          headers: {
            Authorization: 'Bearer mock-token',
          },
        }
      );
    });
  });

  it('filters templates by category', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTemplates } });

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    await waitFor(() => {
      const categorySelect = screen.getByDisplayValue('All Categories');
      fireEvent.change(categorySelect, { target: { value: 'manager' } });
    });

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/api/personas/templates?category=manager',
        {
          headers: {
            Authorization: 'Bearer mock-token',
          },
        }
      );
    });
  });

  it('sorts templates', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTemplates } });

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    await waitFor(() => {
      const sortSelect = screen.getByDisplayValue('Name (A-Z)');
      fireEvent.change(sortSelect, { target: { value: 'usage-desc' } });
    });

    await waitFor(() => {
      // Should show templates sorted by usage (most used first)
      expect(screen.getByText('Product Manager Template')).toBeInTheDocument();
    });
  });

  it('filters by tags', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTemplates } });

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    await waitFor(() => {
      // Click on a tag to filter
      const productTag = screen.getByText('product');
      fireEvent.click(productTag);
    });

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/api/personas/templates?tags=product',
        {
          headers: {
            Authorization: 'Bearer mock-token',
          },
        }
      );
    });
  });

  it('filters public templates only', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTemplates } });

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    await waitFor(() => {
      const publicCheckbox = screen.getByLabelText(/Public templates only/);
      fireEvent.click(publicCheckbox);
    });

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/api/personas/templates?public=true',
        {
          headers: {
            Authorization: 'Bearer mock-token',
          },
        }
      );
    });
  });

  it('calls onSelectTemplate when template is selected', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTemplates } });

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    await waitFor(() => {
      const useButtons = screen.getAllByText('Use Template');
      fireEvent.click(useButtons[0]);
    });

    expect(mockOnSelectTemplate).toHaveBeenCalledWith(mockTemplates[0]);
  });

  it('calls onEditTemplate when edit button is clicked', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTemplates } });

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    await waitFor(() => {
      const editButtons = screen.getAllByTitle('Edit template');
      fireEvent.click(editButtons[0]);
    });

    expect(mockOnEditTemplate).toHaveBeenCalledWith(mockTemplates[0]);
  });

  it('calls onDeleteTemplate when delete button is clicked', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTemplates } });
    mockedAxios.delete.mockResolvedValueOnce({ data: { success: true } });

    // Mock window.confirm
    window.confirm = vi.fn(() => true);

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    await waitFor(() => {
      const deleteButtons = screen.getAllByTitle('Delete template');
      fireEvent.click(deleteButtons[0]);
    });

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete this template? This action cannot be undone.'
    );
    expect(mockOnDeleteTemplate).toHaveBeenCalledWith('1');
  });

  it('calls onCloneTemplate when clone button is clicked', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTemplates } });
    mockedAxios.post.mockResolvedValueOnce({
      data: { data: { ...mockTemplates[0], _id: 'cloned-1' } },
    });

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    await waitFor(() => {
      const cloneButtons = screen.getAllByTitle('Clone template');
      fireEvent.click(cloneButtons[0]);
    });

    expect(mockOnCloneTemplate).toHaveBeenCalledWith({
      ...mockTemplates[0],
      _id: 'cloned-1',
    });
  });

  it('shows create button when showCreateButton is true', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTemplates } });

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
        showCreateButton={true}
        onCreateTemplate={mockOnCreateTemplate}
      />
    );

    await waitFor(() => {
      const createButton = screen.getByText('Create Template');
      fireEvent.click(createButton);
    });

    expect(mockOnCreateTemplate).toHaveBeenCalled();
  });

  it('displays loading state', () => {
    mockedAxios.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    expect(screen.getByText('Loading templates...')).toBeInTheDocument();
  });

  it('displays error when loading fails', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load templates')).toBeInTheDocument();
    });
  });

  it('displays empty state when no templates found', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: [] } });

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No templates found')).toBeInTheDocument();
      expect(
        screen.getByText('Get started by creating your first template.')
      ).toBeInTheDocument();
    });
  });

  it('displays filtered empty state when search has no results', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: [] } });

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search templates...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    });

    await waitFor(() => {
      expect(screen.getByText('No templates found')).toBeInTheDocument();
      expect(
        screen.getByText('Try adjusting your filters to see more templates.')
      ).toBeInTheDocument();
    });
  });

  it('displays template information correctly', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTemplates } });

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Product Manager Template')).toBeInTheDocument();
      expect(
        screen.getByText('A template for product managers')
      ).toBeInTheDocument();
      expect(screen.getByText('Product Manager')).toBeInTheDocument();
      expect(screen.getByText('Public')).toBeInTheDocument();
      expect(screen.getByText('v2')).toBeInTheDocument();
      expect(screen.getByText('Used 15 times')).toBeInTheDocument();
      expect(screen.getByText('2 weeks ago')).toBeInTheDocument();
    });
  });

  it('displays template tags', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTemplates } });

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('product')).toBeInTheDocument();
      expect(screen.getByText('management')).toBeInTheDocument();
      expect(screen.getByText('agile')).toBeInTheDocument();
    });
  });

  it('shows results count', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTemplates } });

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Showing 2 of 2 templates')).toBeInTheDocument();
    });
  });

  it('handles project-specific templates', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTemplates } });

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
        projectId="project123"
      />
    );

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/api/personas/templates?projectId=project123',
        {
          headers: {
            Authorization: 'Bearer mock-token',
          },
        }
      );
    });
  });

  it('handles delete confirmation cancellation', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTemplates } });

    // Mock window.confirm to return false
    window.confirm = vi.fn(() => false);

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    await waitFor(() => {
      const deleteButtons = screen.getAllByTitle('Delete template');
      fireEvent.click(deleteButtons[0]);
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(mockOnDeleteTemplate).not.toHaveBeenCalled();
  });

  it('handles clone error gracefully', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTemplates } });
    mockedAxios.post.mockRejectedValueOnce(new Error('Clone failed'));

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    await waitFor(() => {
      const cloneButtons = screen.getAllByTitle('Clone template');
      fireEvent.click(cloneButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to clone template')).toBeInTheDocument();
    });
  });

  it('handles delete error gracefully', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTemplates } });
    mockedAxios.delete.mockRejectedValueOnce(new Error('Delete failed'));

    window.confirm = vi.fn(() => true);

    render(
      <TemplateLibrary
        onSelectTemplate={mockOnSelectTemplate}
        onEditTemplate={mockOnEditTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        onCloneTemplate={mockOnCloneTemplate}
      />
    );

    await waitFor(() => {
      const deleteButtons = screen.getAllByTitle('Delete template');
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to delete template')).toBeInTheDocument();
    });
  });
});
