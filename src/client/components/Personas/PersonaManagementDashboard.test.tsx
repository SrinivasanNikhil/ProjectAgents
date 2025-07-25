import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PersonaManagementDashboard } from './PersonaManagementDashboard';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

// Mock child components
vi.mock('./PersonaForm', () => ({
  default: ({ onSubmit, onCancel }: any) => (
    <div data-testid="persona-form">
      <button onClick={() => onSubmit({})}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('./PersonaCustomization', () => ({
  default: ({ personaId, onSave, onCancel }: any) => (
    <div data-testid="persona-customization">
      <span>Customizing persona: {personaId}</span>
      <button onClick={() => onSave({})}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('./TemplateLibrary', () => ({
  default: ({ onSelectTemplate }: any) => (
    <div data-testid="template-library">
      <button onClick={() => onSelectTemplate({})}>Select Template</button>
    </div>
  ),
}));

// Helper function to find elements by text and tag/class
const findByTextAndTag = (
  text: string,
  tagName: string,
  className?: string
) => {
  return screen.getByText((content, element) => {
    return Boolean(
      element?.tagName === tagName &&
        content === text &&
        (!className || element?.className?.includes(className))
    );
  });
};

const findByTextAndClass = (text: string, className: string) => {
  return screen.getByText((content, element) => {
    return Boolean(content === text && element?.className?.includes(className));
  });
};

const getAllByTextAndFilter = (
  text: string,
  filterFn: (element: HTMLElement) => boolean
) => {
  const elements = screen.getAllByText(text);
  return elements.filter(filterFn);
};

// Update mock persona data to match expected values
const mockPersonas = [
  {
    _id: '1',
    name: 'Test Persona',
    status: 'Available',
    mood: 'Positive',
    statistics: {
      conversations: 15,
      messages: 45,
    },
    project: 'E-commerce Platform',
    // ...other fields as needed
  },
];

const mockProjects = [
  {
    _id: 'project1',
    name: 'E-commerce Platform',
    status: 'active',
  },
  {
    _id: 'project2',
    name: 'Mobile App',
    status: 'active',
  },
];

describe('PersonaManagementDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful API responses
    mockedAxios.get.mockResolvedValue({ data: { data: mockPersonas } });
    mockedAxios.get.mockResolvedValueOnce({
      data: { data: mockProjects },
    });
  });

  it('renders the dashboard with title and description', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      expect(
        screen.getByText('Persona Management Dashboard')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Manage and monitor all personas across your projects')
      ).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    render(<PersonaManagementDashboard userId="user123" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('fetches and displays personas and projects', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/personas');
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/projects');
    });

    await waitFor(() => {
      expect(screen.getByText('Test Persona')).toBeInTheDocument();
    });
  });

  it('displays error message when API calls fail', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
    });
  });

  it('filters personas by project', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      // Find project name in h3 tag (persona name)
      const projectElement = findByTextAndTag('E-commerce Platform', 'H3');
      expect(projectElement).toBeInTheDocument();
    });

    const projectSelect = screen.getByLabelText('Project');
    fireEvent.change(projectSelect, { target: { value: 'project2' } });

    await waitFor(() => {
      // Check that E-commerce Platform is not in h3 tags (persona names)
      const projectElements = getAllByTextAndFilter(
        'E-commerce Platform',
        el => el.tagName === 'H3'
      );
      expect(projectElements).toHaveLength(0);

      // Check that Mobile App is not in h3 tags (persona names)
      const mobileElements = getAllByTextAndFilter(
        'Mobile App',
        el => el.tagName === 'H3'
      );
      expect(mobileElements).toHaveLength(0);
    });
  });

  it('filters personas by status', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      // Find project names in h3 tags (persona names)
      const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
      const mobileElement = findByTextAndTag('Mobile App', 'H3');
      expect(ecommerceElement).toBeInTheDocument();
      expect(mobileElement).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText('Status');
    fireEvent.change(statusSelect, { target: { value: 'active' } });

    await waitFor(() => {
      // E-commerce Platform should still be visible (active)
      const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
      expect(ecommerceElement).toBeInTheDocument();

      // Mobile App should not be visible (inactive)
      const mobileElements = getAllByTextAndFilter(
        'Mobile App',
        el => el.tagName === 'H3'
      );
      expect(mobileElements).toHaveLength(0);
    });
  });

  it('searches personas by name or role', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      // Find project names in h3 tags (persona names)
      const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
      const mobileElement = findByTextAndTag('Mobile App', 'H3');
      expect(ecommerceElement).toBeInTheDocument();
      expect(mobileElement).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search personas...');
    fireEvent.change(searchInput, { target: { value: 'E-commerce' } });

    await waitFor(() => {
      // E-commerce Platform should still be visible
      const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
      expect(ecommerceElement).toBeInTheDocument();

      // Mobile App should not be visible
      const mobileElements = getAllByTextAndFilter(
        'Mobile App',
        el => el.tagName === 'H3'
      );
      expect(mobileElements).toHaveLength(0);
    });
  });

  it('sorts personas by different criteria', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
      expect(ecommerceElement).toBeInTheDocument();
    });

    const sortSelect = screen.getByLabelText('Sort By');
    fireEvent.change(sortSelect, { target: { value: 'mood' } });

    // Should still display personas (sorting is handled internally)
    const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
    expect(ecommerceElement).toBeInTheDocument();
  });

  it('toggles sort order', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('↑ Ascending')).toBeInTheDocument();
    });

    const sortOrderButton = screen.getByText('↑ Ascending');
    fireEvent.click(sortOrderButton);

    await waitFor(() => {
      expect(screen.getByText('↓ Descending')).toBeInTheDocument();
    });
  });

  it('opens create persona form when button is clicked', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('Create New Persona')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create New Persona');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('persona-form')).toBeInTheDocument();
    });
  });

  it('opens template library when button is clicked', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('Template Library')).toBeInTheDocument();
    });

    const templateButton = screen.getByText('Template Library');
    fireEvent.click(templateButton);

    await waitFor(() => {
      expect(screen.getByTestId('template-library')).toBeInTheDocument();
    });
  });

  it('opens customization modal when customize button is clicked', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
      expect(ecommerceElement).toBeInTheDocument();
    });

    const customizeButtons = screen.getAllByText('Customize');
    fireEvent.click(customizeButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('persona-customization')).toBeInTheDocument();
      expect(screen.getByText('Customizing persona: 1')).toBeInTheDocument();
    });
  });

  it('toggles persona availability', async () => {
    mockedAxios.put.mockResolvedValueOnce({ data: { success: true } });

    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
      expect(ecommerceElement).toBeInTheDocument();
    });

    const deactivateButtons = screen.getAllByText('Deactivate');
    fireEvent.click(deactivateButtons[0]);

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith('/api/personas/1', {
        availability: { isActive: false },
      });
    });
  });

  it('deletes persona with confirmation', async () => {
    mockedAxios.delete.mockResolvedValueOnce({ data: { success: true } });
    global.confirm = vi.fn(() => true);

    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
      expect(ecommerceElement).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete this persona?'
      );
      expect(mockedAxios.delete).toHaveBeenCalledWith('/api/personas/1');
    });
  });

  it('does not delete persona when confirmation is cancelled', async () => {
    global.confirm = vi.fn(() => false);

    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
      expect(ecommerceElement).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled();
      expect(mockedAxios.delete).not.toHaveBeenCalled();
    });
  });

  it('displays correct mood colors and descriptions', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      // E-commerce Platform has mood 75 (Positive - green)
      expect(screen.getByText('Positive')).toBeInTheDocument();
      // Mobile App has mood 45 (Neutral - yellow)
      expect(screen.getByText('Neutral')).toBeInTheDocument();
    });
  });

  it('displays correct availability status', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      // E-commerce Platform is active - find Available text in span with font-medium class
      const availableStatus = screen.getByText((content, element) =>
        element?.tagName === 'SPAN' && content === 'Available' && element.className.includes('font-medium')
      );
      expect(availableStatus).toBeInTheDocument();

      // Mobile App is inactive
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  it('displays persona statistics correctly', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      // Find statistics by looking for specific numbers in the context of stats
      const conversationElements = getAllByTextAndFilter('15', el =>
        Boolean(
          el.closest('[data-testid*="stats"]') ||
            el.closest('.stats') ||
            el.parentElement?.textContent?.includes('conversations')
        )
      );
      expect(conversationElements.length).toBeGreaterThan(0);

      const messageElements = getAllByTextAndFilter('45', el =>
        Boolean(
          el.closest('[data-testid*="stats"]') ||
            el.closest('.stats') ||
            el.parentElement?.textContent?.includes('messages')
        )
      );
      expect(messageElements.length).toBeGreaterThan(0);

      const responseElements = getAllByTextAndFilter('3.2 min', el =>
        Boolean(
          el.closest('[data-testid*="stats"]') ||
            el.closest('.stats') ||
            el.parentElement?.textContent?.includes('response')
        )
      );
      expect(responseElements.length).toBeGreaterThan(0);
    });
  });

  it('shows empty state when no personas match filters', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
      expect(ecommerceElement).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search personas...');
    fireEvent.change(searchInput, { target: { value: 'NonExistentPersona' } });

    await waitFor(() => {
      expect(screen.getByText('No personas found')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Get started by creating a new persona or adjusting your filters.'
        )
      ).toBeInTheDocument();
    });
  });

  it('closes modals when close button is clicked', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('Create New Persona')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create New Persona');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('persona-form')).toBeInTheDocument();
    });

    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('persona-form')).not.toBeInTheDocument();
    });
  });

  it('refreshes data after successful operations', async () => {
    mockedAxios.put.mockResolvedValueOnce({ data: { success: true } });

    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
      expect(ecommerceElement).toBeInTheDocument();
    });

    const deactivateButtons = screen.getAllByText('Deactivate');
    fireEvent.click(deactivateButtons[0]);

    await waitFor(() => {
      // Should call fetchData again to refresh the list
      expect(mockedAxios.get).toHaveBeenCalledTimes(4); // Initial 2 + 2 more for refresh
    });
  });

  it('displays persona count correctly', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('1 persona found')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search personas...');
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PersonaManagementDashboard } from './PersonaManagementDashboard';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

// Mock child components
vi.mock('./PersonaForm', () => ({
  default: ({ onSubmit, onCancel }: any) => (
    <div data-testid="persona-form">
      <button onClick={() => onSubmit({})}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('./PersonaCustomization', () => ({
  default: ({ personaId, onSave, onCancel }: any) => (
    <div data-testid="persona-customization">
      <span>Customizing persona: {personaId}</span>
      <button onClick={() => onSave({})}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('./TemplateLibrary', () => ({
  default: ({ onSelectTemplate }: any) => (
    <div data-testid="template-library">
      <button onClick={() => onSelectTemplate({})}>Select Template</button>
    </div>
  ),
}));

// Helper function to find elements by text and tag/class
const findByTextAndTag = (
  text: string,
  tagName: string,
  className?: string
) => {
  return screen.getByText((content, element) => {
    return Boolean(
      element?.tagName === tagName &&
        content === text &&
        (!className || element?.className?.includes(className))
    );
  });
};

const findByTextAndClass = (text: string, className: string) => {
  return screen.getByText((content, element) => {
    return Boolean(content === text && element?.className?.includes(className));
  });
};

const getAllByTextAndFilter = (
  text: string,
  filterFn: (element: HTMLElement) => boolean
) => {
  const elements = screen.getAllByText(text);
  return elements.filter(filterFn);
};

// Update mock persona data to match expected rendered values
const mockPersonas = [
  {
    _id: '1',
    name: 'Alice',
    status: 'Available',
    mood: 'Positive',
    project: 'E-commerce Platform',
    conversations: 15,
    messages: 45,
    // ...other fields as needed
  },
  {
    _id: '2',
    name: 'Bob',
    status: 'Inactive',
    mood: 'Neutral',
    project: 'Learning App',
    conversations: 0,
    messages: 0,
    // ...other fields as needed
  },
];

const mockProjects = [
  {
    _id: 'project1',
    name: 'E-commerce Platform',
    status: 'active',
  },
  {
    _id: 'project2',
    name: 'Mobile App',
    status: 'active',
  },
];

describe('PersonaManagementDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful API responses
    mockedAxios.get.mockResolvedValue({ data: { data: mockPersonas } });
    mockedAxios.get.mockResolvedValueOnce({
      data: { data: mockProjects },
    });
  });

  it('renders the dashboard with title and description', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      expect(
        screen.getByText('Persona Management Dashboard')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Manage and monitor all personas across your projects')
      ).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    render(<PersonaManagementDashboard userId="user123" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('fetches and displays personas and projects', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/personas');
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/projects');
    });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('displays error message when API calls fail', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
    });
  });

  it('filters personas by project', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      // Find project name in h3 tag (persona name)
      const projectElement = findByTextAndTag('E-commerce Platform', 'H3');
      expect(projectElement).toBeInTheDocument();
    });

    const projectSelect = screen.getByLabelText('Project');
    fireEvent.change(projectSelect, { target: { value: 'project2' } });

    await waitFor(() => {
      // Check that E-commerce Platform is not in h3 tags (persona names)
      const projectElements = getAllByTextAndFilter(
        'E-commerce Platform',
        el => el.tagName === 'H3'
      );
      expect(projectElements).toHaveLength(0);

      // Check that Mobile App is not in h3 tags (persona names)
      const mobileElements = getAllByTextAndFilter(
        'Mobile App',
        el => el.tagName === 'H3'
      );
      expect(mobileElements).toHaveLength(0);
    });
  });

  it('filters personas by status', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      // Find project names in h3 tags (persona names)
      const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
      const mobileElement = findByTextAndTag('Mobile App', 'H3');
      expect(ecommerceElement).toBeInTheDocument();
      expect(mobileElement).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText('Status');
    fireEvent.change(statusSelect, { target: { value: 'active' } });

    await waitFor(() => {
      // E-commerce Platform should still be visible (active)
      const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
      expect(ecommerceElement).toBeInTheDocument();

      // Mobile App should not be visible (inactive)
      const mobileElements = getAllByTextAndFilter(
        'Mobile App',
        el => el.tagName === 'H3'
      );
      expect(mobileElements).toHaveLength(0);
    });
  });

  it('searches personas by name or role', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      // Find project names in h3 tags (persona names)
      const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
      const mobileElement = findByTextAndTag('Mobile App', 'H3');
      expect(ecommerceElement).toBeInTheDocument();
      expect(mobileElement).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search personas...');
    fireEvent.change(searchInput, { target: { value: 'E-commerce' } });

    await waitFor(() => {
      // E-commerce Platform should still be visible
      const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
      expect(ecommerceElement).toBeInTheDocument();

      // Mobile App should not be visible
      const mobileElements = getAllByTextAndFilter(
        'Mobile App',
        el => el.tagName === 'H3'
      );
      expect(mobileElements).toHaveLength(0);
    });
  });

  it('sorts personas by different criteria', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
      expect(ecommerceElement).toBeInTheDocument();
    });

    const sortSelect = screen.getByLabelText('Sort By');
    fireEvent.change(sortSelect, { target: { value: 'mood' } });

    // Should still display personas (sorting is handled internally)
    const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
    expect(ecommerceElement).toBeInTheDocument();
  });

  it('toggles sort order', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('↑ Ascending')).toBeInTheDocument();
    });

    const sortOrderButton = screen.getByText('↑ Ascending');
    fireEvent.click(sortOrderButton);

    await waitFor(() => {
      expect(screen.getByText('↓ Descending')).toBeInTheDocument();
    });
  });

  it('opens create persona form when button is clicked', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('Create New Persona')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create New Persona');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('persona-form')).toBeInTheDocument();
    });
  });

  it('opens template library when button is clicked', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('Template Library')).toBeInTheDocument();
    });

    const templateButton = screen.getByText('Template Library');
    fireEvent.click(templateButton);

    await waitFor(() => {
      expect(screen.getByTestId('template-library')).toBeInTheDocument();
    });
  });

  it('opens customization modal when customize button is clicked', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
      expect(ecommerceElement).toBeInTheDocument();
    });

    const customizeButtons = screen.getAllByText('Customize');
    fireEvent.click(customizeButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('persona-customization')).toBeInTheDocument();
      expect(screen.getByText('Customizing persona: 1')).toBeInTheDocument();
    });
  });

  it('toggles persona availability', async () => {
    mockedAxios.put.mockResolvedValueOnce({ data: { success: true } });

    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
      expect(ecommerceElement).toBeInTheDocument();
    });

    const deactivateButtons = screen.getAllByText('Deactivate');
    fireEvent.click(deactivateButtons[0]);

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith('/api/personas/1', {
        availability: { isActive: false },
      });
    });
  });

  it('deletes persona with confirmation', async () => {
    mockedAxios.delete.mockResolvedValueOnce({ data: { success: true } });
    global.confirm = vi.fn(() => true);

    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
      expect(ecommerceElement).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete this persona?'
      );
      expect(mockedAxios.delete).toHaveBeenCalledWith('/api/personas/1');
    });
  });

  it('does not delete persona when confirmation is cancelled', async () => {
    global.confirm = vi.fn(() => false);

    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
      expect(ecommerceElement).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled();
      expect(mockedAxios.delete).not.toHaveBeenCalled();
    });
  });

  it('displays correct mood colors and descriptions', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      // E-commerce Platform has mood 75 (Positive - green)
      expect(screen.getByText('Positive')).toBeInTheDocument();
      // Mobile App has mood 45 (Neutral - yellow)
      expect(screen.getByText('Neutral')).toBeInTheDocument();
    });
  });

  it('displays correct availability status', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      // E-commerce Platform is active - find Available text in span with font-medium class
      const availableStatus = screen.getByText((content, element) => {
        return Boolean(
          content === 'Available' &&
            element?.tagName === 'SPAN' &&
            element.className.includes('font-medium')
        );
      });
      expect(availableStatus).toBeInTheDocument();

      // Mobile App is inactive
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  it('displays persona statistics correctly', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      // Find statistics by looking for specific numbers in the context of stats
      const conversationElements = getAllByTextAndFilter('15', el =>
        Boolean(
          el.closest('[data-testid*="stats"]') ||
            el.closest('.stats') ||
            el.parentElement?.textContent?.includes('conversations')
        )
      );
      expect(conversationElements.length).toBeGreaterThan(0);

      const messageElements = getAllByTextAndFilter('45', el =>
        Boolean(
          el.closest('[data-testid*="stats"]') ||
            el.closest('.stats') ||
            el.parentElement?.textContent?.includes('messages')
        )
      );
      expect(messageElements.length).toBeGreaterThan(0);

      const responseElements = getAllByTextAndFilter('3.2 min', el =>
        Boolean(
          el.closest('[data-testid*="stats"]') ||
            el.closest('.stats') ||
            el.parentElement?.textContent?.includes('response')
        )
      );
      expect(responseElements.length).toBeGreaterThan(0);
    });
  });

  it('shows empty state when no personas match filters', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
      expect(ecommerceElement).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search personas...');
    fireEvent.change(searchInput, { target: { value: 'NonExistentPersona' } });

    await waitFor(() => {
      expect(screen.getByText('No personas found')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Get started by creating a new persona or adjusting your filters.'
        )
      ).toBeInTheDocument();
    });
  });

  it('closes modals when close button is clicked', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('Create New Persona')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create New Persona');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('persona-form')).toBeInTheDocument();
    });

    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('persona-form')).not.toBeInTheDocument();
    });
  });

  it('refreshes data after successful operations', async () => {
    mockedAxios.put.mockResolvedValueOnce({ data: { success: true } });

    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      const ecommerceElement = findByTextAndTag('E-commerce Platform', 'H3');
      expect(ecommerceElement).toBeInTheDocument();
    });

    const deactivateButtons = screen.getAllByText('Deactivate');
    fireEvent.click(deactivateButtons[0]);

    await waitFor(() => {
      // Should call fetchData again to refresh the list
      expect(mockedAxios.get).toHaveBeenCalledTimes(4); // Initial 2 + 2 more for refresh
    });
  });

  it('displays persona count correctly', async () => {
    render(<PersonaManagementDashboard userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('2 personas found')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search personas...');
    fireEvent.change(searchInput, { target: { value: 'E-commerce' } });

    await waitFor(() => {
      expect(screen.getByText('1 persona found')).toBeInTheDocument();
    });
  });
});
