import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import InstructorInterventionTools from './InstructorInterventionTools';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('InstructorInterventionTools', () => {
  const mockProps = {
    userId: 'instructor-123',
    userRole: 'instructor',
  };

  const mockAlerts = [
    {
      _id: 'alert-1',
      type: 'inactivity',
      severity: 'high',
      conversationId: 'conv-1',
      projectId: 'project-1',
      projectName: 'Project Alpha',
      teamName: 'Team A',
      description: 'Team has been inactive for 2 hours',
      timestamp: new Date('2024-01-20T10:00:00Z'),
      status: 'new',
      context: {
        messageCount: 15,
        silenceDuration: 120,
        sentimentScore: 0.6,
        participationRates: { 'student-1': 60, 'student-2': 40 },
        lastMessages: ['Last message from team'],
      },
    },
    {
      _id: 'alert-2',
      type: 'conflict',
      severity: 'critical',
      conversationId: 'conv-2',
      projectId: 'project-2',
      projectName: 'Project Beta',
      teamName: 'Team B',
      description: 'Detected conflict between team members',
      timestamp: new Date('2024-01-20T09:30:00Z'),
      status: 'new',
      context: {
        messageCount: 25,
        silenceDuration: 30,
        sentimentScore: -0.3,
        participationRates: { 'student-3': 80, 'student-4': 20 },
        lastMessages: ['Disagreement about project direction'],
      },
    },
  ];

  const mockTemplates = [
    {
      _id: 'template-1',
      name: 'Encourage Participation',
      category: 'encouragement',
      content: 'Hi team! I noticed things have been quiet. How is everyone doing with the project?',
      variables: ['teamName'],
      useCase: 'When team becomes inactive',
      isActive: true,
    },
    {
      _id: 'template-2',
      name: 'Resolve Conflict',
      category: 'guidance',
      content: 'I can see there might be some different perspectives here. Let\'s focus on finding common ground.',
      variables: [],
      useCase: 'When conflicts arise between team members',
      isActive: true,
    },
  ];

  const mockInterventions = [
    {
      teamId: 'team-1',
      teamName: 'Team A',
      projectName: 'Project Alpha',
      interventionType: 'message',
      content: 'How is the project progressing?',
      status: 'completed',
      createdAt: new Date('2024-01-19T15:00:00Z'),
    },
    {
      teamId: 'team-2',
      teamName: 'Team B',
      projectName: 'Project Beta',
      interventionType: 'persona_adjustment',
      content: 'Increased persona engagement level',
      status: 'sent',
      createdAt: new Date('2024-01-19T14:30:00Z'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses by default
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/api/interventions/alerts/')) {
        return Promise.resolve({ data: { alerts: mockAlerts } });
      } else if (url.includes('/api/interventions/templates')) {
        return Promise.resolve({ data: { templates: mockTemplates } });
      } else if (url.includes('/api/interventions/history/')) {
        return Promise.resolve({ data: { interventions: mockInterventions } });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    mockedAxios.post.mockResolvedValue({ data: { success: true } });
    mockedAxios.patch.mockResolvedValue({ data: { success: true } });
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      mockedAxios.get.mockImplementation(() => new Promise(() => {}));

      render(<InstructorInterventionTools {...mockProps} />);

      expect(screen.getByText('Loading intervention tools...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when API calls fail', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      render(<InstructorInterventionTools {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to load intervention data')).toBeInTheDocument();
      });
    });

    it('should allow retry when API calls fail', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      render(<InstructorInterventionTools {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      // Reset mock to return successful response
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/api/interventions/alerts/')) {
          return Promise.resolve({ data: { alerts: mockAlerts } });
        } else if (url.includes('/api/interventions/templates')) {
          return Promise.resolve({ data: { templates: mockTemplates } });
        } else if (url.includes('/api/interventions/history/')) {
          return Promise.resolve({ data: { interventions: mockInterventions } });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      fireEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('🛠️ Instructor Intervention Tools')).toBeInTheDocument();
      });
    });
  });

  describe('Initial Render', () => {
    beforeEach(async () => {
      render(<InstructorInterventionTools {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('🛠️ Instructor Intervention Tools')).toBeInTheDocument();
      });
    });

    it('should render header with title and description', () => {
      expect(screen.getByText('🛠️ Instructor Intervention Tools')).toBeInTheDocument();
      expect(screen.getByText('Monitor and intervene in student conversations to provide guidance and support')).toBeInTheDocument();
    });

    it('should render header controls', () => {
      expect(screen.getByText('Auto-refresh alerts')).toBeInTheDocument();
      expect(screen.getByText('🔄 Refresh')).toBeInTheDocument();
    });

    it('should render all tabs', () => {
      expect(screen.getByText('🚨 Alerts (2)')).toBeInTheDocument();
      expect(screen.getByText('📝 Templates (2)')).toBeInTheDocument();
      expect(screen.getByText('📚 History (2)')).toBeInTheDocument();
      expect(screen.getByText('📊 Analytics')).toBeInTheDocument();
    });

    it('should have alerts tab active by default', () => {
      const alertsTab = screen.getByText('🚨 Alerts (2)');
      expect(alertsTab).toHaveClass('active');
    });
  });

  describe('Alerts Tab', () => {
    beforeEach(async () => {
      render(<InstructorInterventionTools {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Active Intervention Alerts')).toBeInTheDocument();
      });
    });

    it('should display all alerts', () => {
      expect(screen.getByText('Team A - Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('Team B - Project Beta')).toBeInTheDocument();
      expect(screen.getByText('Team has been inactive for 2 hours')).toBeInTheDocument();
      expect(screen.getByText('Detected conflict between team members')).toBeInTheDocument();
    });

    it('should display alert severity badges', () => {
      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('critical')).toBeInTheDocument();
    });

    it('should display alert context information', () => {
      expect(screen.getByText('Messages: 15')).toBeInTheDocument();
      expect(screen.getByText('Messages: 25')).toBeInTheDocument();
      expect(screen.getByText('Silence: 2h 0m')).toBeInTheDocument();
      expect(screen.getByText('Silence: 0h 30m')).toBeInTheDocument();
      expect(screen.getByText('Sentiment: 60%')).toBeInTheDocument();
      expect(screen.getByText('Sentiment: -30%')).toBeInTheDocument();
    });

    it('should display action buttons for each alert', () => {
      const interveneButtons = screen.getAllByText('📤 Intervene');
      const dismissButtons = screen.getAllByText('⏭️ Dismiss');
      const resolveButtons = screen.getAllByText('✅ Resolve');

      expect(interveneButtons).toHaveLength(2);
      expect(dismissButtons).toHaveLength(2);
      expect(resolveButtons).toHaveLength(2);
    });

    it('should open intervention panel when intervene button is clicked', async () => {
      const firstInterveneButton = screen.getAllByText('📤 Intervene')[0];
      fireEvent.click(firstInterveneButton);

      await waitFor(() => {
        expect(screen.getByText('Intervention for Team A')).toBeInTheDocument();
      });
    });

    it('should dismiss alert when dismiss button is clicked', async () => {
      const firstDismissButton = screen.getAllByText('⏭️ Dismiss')[0];
      fireEvent.click(firstDismissButton);

      await waitFor(() => {
        expect(mockedAxios.patch).toHaveBeenCalledWith('/api/interventions/alerts/alert-1', {
          status: 'dismissed'
        });
      });
    });

    it('should resolve alert when resolve button is clicked', async () => {
      const firstResolveButton = screen.getAllByText('✅ Resolve')[0];
      fireEvent.click(firstResolveButton);

      await waitFor(() => {
        expect(mockedAxios.patch).toHaveBeenCalledWith('/api/interventions/alerts/alert-1', {
          status: 'resolved'
        });
      });
    });
  });

  describe('Intervention Panel', () => {
    beforeEach(async () => {
      render(<InstructorInterventionTools {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Active Intervention Alerts')).toBeInTheDocument();
      });

      const firstInterveneButton = screen.getAllByText('📤 Intervene')[0];
      fireEvent.click(firstInterveneButton);

      await waitFor(() => {
        expect(screen.getByText('Intervention for Team A')).toBeInTheDocument();
      });
    });

    it('should display intervention mode options', () => {
      expect(screen.getByText('Direct Message')).toBeInTheDocument();
      expect(screen.getByText('Persona Adjustment')).toBeInTheDocument();
      expect(screen.getByText('Scheduled Message')).toBeInTheDocument();
    });

    it('should have direct message mode selected by default', () => {
      const directMessageRadio = screen.getByLabelText('Direct Message');
      expect(directMessageRadio).toBeChecked();
    });

    it('should display template selector in direct mode', () => {
      expect(screen.getByText('Use Template:')).toBeInTheDocument();
      expect(screen.getByText('Select a template...')).toBeInTheDocument();
    });

    it('should display message composer in direct mode', () => {
      expect(screen.getByText('Intervention Message:')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type your intervention message here...')).toBeInTheDocument();
    });

    it('should populate message when template is selected', async () => {
      const templateSelect = screen.getByDisplayValue('Select a template...');
      fireEvent.change(templateSelect, { target: { value: 'template-1' } });

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText('Type your intervention message here...');
        expect(textarea).toHaveValue('Hi team! I noticed things have been quiet. How is everyone doing with the project?');
      });
    });

    it('should send intervention when send button is clicked', async () => {
      const textarea = screen.getByPlaceholderText('Type your intervention message here...');
      fireEvent.change(textarea, { target: { value: 'Test intervention message' } });

      const sendButton = screen.getByText('Send Intervention');
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/interventions/send', {
          alertId: 'alert-1',
          conversationId: 'conv-1',
          message: 'Test intervention message',
          targetStudents: undefined,
          instructorId: 'instructor-123',
          type: 'direct_message'
        });
      });
    });

    it('should switch to persona adjustment mode', () => {
      const personaRadio = screen.getByLabelText('Persona Adjustment');
      fireEvent.click(personaRadio);

      expect(screen.getByText('Adjust AI Persona Behavior')).toBeInTheDocument();
      expect(screen.getByText('Increase Engagement Level')).toBeInTheDocument();
      expect(screen.getByText('More Proactive Guidance')).toBeInTheDocument();
      expect(screen.getByText('Simplify Explanations')).toBeInTheDocument();
    });

    it('should switch to scheduled message mode', () => {
      const scheduledRadio = screen.getByLabelText('Scheduled Message');
      fireEvent.click(scheduledRadio);

      expect(screen.getByText('Schedule for:')).toBeInTheDocument();
      expect(screen.getByText('Scheduled Message:')).toBeInTheDocument();
      expect(screen.getByText('Schedule Intervention')).toBeInTheDocument();
    });

    it('should close panel when close button is clicked', () => {
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      expect(screen.queryByText('Intervention for Team A')).not.toBeInTheDocument();
    });
  });

  describe('Templates Tab', () => {
    beforeEach(async () => {
      render(<InstructorInterventionTools {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('🛠️ Instructor Intervention Tools')).toBeInTheDocument();
      });

      const templatesTab = screen.getByText('📝 Templates (2)');
      fireEvent.click(templatesTab);
    });

    it('should display templates header', () => {
      expect(screen.getByText('Intervention Templates')).toBeInTheDocument();
      expect(screen.getByText('+ Create Template')).toBeInTheDocument();
    });

    it('should display all templates', () => {
      expect(screen.getByText('Encourage Participation')).toBeInTheDocument();
      expect(screen.getByText('Resolve Conflict')).toBeInTheDocument();
    });

    it('should display template categories', () => {
      expect(screen.getByText('encouragement')).toBeInTheDocument();
      expect(screen.getByText('guidance')).toBeInTheDocument();
    });

    it('should display template content and use cases', () => {
      expect(screen.getByText('Hi team! I noticed things have been quiet. How is everyone doing with the project?')).toBeInTheDocument();
      expect(screen.getByText('Use case: When team becomes inactive')).toBeInTheDocument();
    });

    it('should display template action buttons', () => {
      const useTemplateButtons = screen.getAllByText('Use Template');
      const editButtons = screen.getAllByText('Edit');
      
      expect(useTemplateButtons).toHaveLength(2);
      expect(editButtons).toHaveLength(2);
    });
  });

  describe('History Tab', () => {
    beforeEach(async () => {
      render(<InstructorInterventionTools {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('🛠️ Instructor Intervention Tools')).toBeInTheDocument();
      });

      const historyTab = screen.getByText('📚 History (2)');
      fireEvent.click(historyTab);
    });

    it('should display history header', () => {
      expect(screen.getByText('Recent Interventions')).toBeInTheDocument();
    });

    it('should display intervention history', () => {
      expect(screen.getByText('Team A - Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('Team B - Project Beta')).toBeInTheDocument();
      expect(screen.getByText('How is the project progressing?')).toBeInTheDocument();
      expect(screen.getByText('Increased persona engagement level')).toBeInTheDocument();
    });

    it('should display intervention types and statuses', () => {
      expect(screen.getByText('message')).toBeInTheDocument();
      expect(screen.getByText('persona_adjustment')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText('sent')).toBeInTheDocument();
    });
  });

  describe('Analytics Tab', () => {
    beforeEach(async () => {
      render(<InstructorInterventionTools {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('🛠️ Instructor Intervention Tools')).toBeInTheDocument();
      });

      const analyticsTab = screen.getByText('📊 Analytics');
      fireEvent.click(analyticsTab);
    });

    it('should display analytics header', () => {
      expect(screen.getByText('Intervention Analytics')).toBeInTheDocument();
    });

    it('should display analytics cards', () => {
      expect(screen.getByText('Total Interventions')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      expect(screen.getByText('Active Alerts')).toBeInTheDocument();
      expect(screen.getByText('Avg Response Time')).toBeInTheDocument();
    });

    it('should display analytics values', () => {
      expect(screen.getAllByText('2')).toHaveLength(2); // Total interventions and active alerts
      expect(screen.getByText('50%')).toBeInTheDocument(); // Success rate
      expect(screen.getByText('~15min')).toBeInTheDocument(); // Avg response time
    });
  });

  describe('Auto-refresh', () => {
    it('should have auto-refresh enabled by default', async () => {
      render(<InstructorInterventionTools {...mockProps} />);
      
      await waitFor(() => {
        const autoRefreshCheckbox = screen.getByLabelText('Auto-refresh alerts');
        expect(autoRefreshCheckbox).toBeChecked();
      });
    });

    it('should disable auto-refresh when unchecked', async () => {
      render(<InstructorInterventionTools {...mockProps} />);
      
      await waitFor(() => {
        const autoRefreshCheckbox = screen.getByLabelText('Auto-refresh alerts');
        fireEvent.click(autoRefreshCheckbox);
        expect(autoRefreshCheckbox).not.toBeChecked();
      });
    });
  });

  describe('Manual Refresh', () => {
    it('should refresh data when refresh button is clicked', async () => {
      render(<InstructorInterventionTools {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('🔄 Refresh')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('🔄 Refresh');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledTimes(6); // 3 initial + 3 refresh
      });
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no alerts', async () => {
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/api/interventions/alerts/')) {
          return Promise.resolve({ data: { alerts: [] } });
        } else if (url.includes('/api/interventions/templates')) {
          return Promise.resolve({ data: { templates: mockTemplates } });
        } else if (url.includes('/api/interventions/history/')) {
          return Promise.resolve({ data: { interventions: mockInterventions } });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      render(<InstructorInterventionTools {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('🎉 No active alerts. All conversations are running smoothly!')).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('should make correct API calls on mount', async () => {
      render(<InstructorInterventionTools {...mockProps} />);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(`/api/interventions/alerts/${mockProps.userId}`);
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/interventions/templates');
        expect(mockedAxios.get).toHaveBeenCalledWith(`/api/interventions/history/${mockProps.userId}`);
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      render(<InstructorInterventionTools {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('🛠️ Instructor Intervention Tools')).toBeInTheDocument();
      });
    });

    it('should have accessible buttons', () => {
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeEnabled();
      });
    });

    it('should have accessible form elements', () => {
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeEnabled();
      });
    });

    it('should have proper heading structure', () => {
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });
  });
});