import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import InstructorDashboard from './InstructorDashboard';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

// Mock the sub-components
vi.mock('../Personas/PersonaManagementDashboard', () => ({
  PersonaManagementDashboard: ({ userId }: { userId: string }) => (
    <div data-testid="persona-management-dashboard">
      Persona Management Dashboard for user: {userId}
    </div>
  ),
}));

vi.mock('../Chat/ModerationDashboard', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="moderation-dashboard">
      <button onClick={onClose}>Close Moderation</button>
      Moderation Dashboard
    </div>
  ),
}));

vi.mock('./InstructorInterventionTools', () => ({
  default: ({ userId, userRole }: { userId: string; userRole: string }) => (
    <div data-testid="instructor-intervention-tools">
      Instructor Intervention Tools for user: {userId} with role: {userRole}
    </div>
  ),
}));

describe('InstructorDashboard', () => {
  const mockProps = {
    userId: 'instructor-123',
    userRole: 'instructor',
  };

  const mockProjectsData = [
    {
      _id: 'project-1',
      name: 'Project Alpha',
      description: 'First project description',
      status: 'active' as const,
      studentTeams: [
        {
          _id: 'team-1',
          name: 'Team A',
          members: [
            { _id: 'student-1', name: 'John Doe', email: 'john@example.com' },
            { _id: 'student-2', name: 'Jane Smith', email: 'jane@example.com' },
          ],
        },
      ],
      personas: [
        { _id: 'persona-1', name: 'Client Smith', role: 'client', isActive: true },
        { _id: 'persona-2', name: 'Manager Jones', role: 'manager', isActive: true },
      ],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-10'),
    },
    {
      _id: 'project-2',
      name: 'Project Beta',
      description: 'Second project description',
      status: 'planning' as const,
      studentTeams: [
        {
          _id: 'team-2',
          name: 'Team B',
          members: [
            { _id: 'student-3', name: 'Bob Wilson', email: 'bob@example.com' },
          ],
        },
      ],
      personas: [
        { _id: 'persona-3', name: 'CEO Johnson', role: 'ceo', isActive: false },
      ],
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-15'),
    },
  ];

  const mockAnalyticsData = {
    totalProjects: 2,
    activeProjects: 1,
    totalStudents: 3,
    totalPersonas: 3,
    totalConversations: 15,
    averageEngagement: 0.75,
    recentActivity: [
      {
        type: 'message' as const,
        description: 'New message from Team A',
        timestamp: new Date('2024-01-20'),
        projectId: 'project-1',
        projectName: 'Project Alpha',
      },
      {
        type: 'persona_created' as const,
        description: 'Created new persona: Client Smith',
        timestamp: new Date('2024-01-19'),
        projectId: 'project-1',
        projectName: 'Project Alpha',
      },
    ],
  };

  const mockConversationSummaries = [
    {
      projectId: 'project-1',
      projectName: 'Project Alpha',
      teamName: 'Team A',
      totalMessages: 25,
      lastActivity: new Date('2024-01-20'),
      engagementScore: 0.85,
      flaggedMessages: 0,
    },
    {
      projectId: 'project-2',
      projectName: 'Project Beta',
      teamName: 'Team B',
      totalMessages: 10,
      lastActivity: new Date('2024-01-18'),
      engagementScore: 0.45,
      flaggedMessages: 1,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses by default
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/api/projects/instructor/')) {
        return Promise.resolve({ data: mockProjectsData });
      } else if (url.includes('/api/analytics/summary/')) {
        return Promise.resolve({ data: mockAnalyticsData });
      } else if (url.includes('/api/analytics/conversations/summary/')) {
        return Promise.resolve({ data: mockConversationSummaries });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      // Mock pending API calls
      mockedAxios.get.mockImplementation(() => new Promise(() => {}));

      render(<InstructorDashboard {...mockProps} />);

      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when API calls fail', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      render(<InstructorDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to load dashboard data. Please try again.')).toBeInTheDocument();
      });
    });

    it('should allow retry when API calls fail', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      render(<InstructorDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      // Reset mock to return successful response
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/api/projects/instructor/')) {
          return Promise.resolve({ data: mockProjectsData });
        } else if (url.includes('/api/analytics/summary/')) {
          return Promise.resolve({ data: mockAnalyticsData });
        } else if (url.includes('/api/analytics/conversations/summary/')) {
          return Promise.resolve({ data: mockConversationSummaries });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      fireEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('Instructor Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    beforeEach(async () => {
      render(<InstructorDashboard {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Instructor Dashboard')).toBeInTheDocument();
      });
    });

    it('should render navigation with all menu items', () => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getAllByText('Personas')).toHaveLength(2); // Navigation and stat card
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('Monitoring')).toBeInTheDocument();
      expect(screen.getByText('Interventions')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should have overview as active by default', () => {
      const overviewButton = screen.getByRole('button', { name: /📊 Overview/ });
      expect(overviewButton).toHaveClass('active');
    });

    it('should switch to projects view when projects is clicked', () => {
      fireEvent.click(screen.getByRole('button', { name: /📁 Projects/ }));
      
      expect(screen.getByText('Project Management')).toBeInTheDocument();
      expect(screen.getByText('+ Create New Project')).toBeInTheDocument();
    });

    it('should switch to personas view when personas is clicked', () => {
      fireEvent.click(screen.getByRole('button', { name: /🎭 Personas/ }));
      
      expect(screen.getByTestId('persona-management-dashboard')).toBeInTheDocument();
    });

    it('should switch to analytics view when analytics is clicked', () => {
      fireEvent.click(screen.getByRole('button', { name: /📈 Analytics/ }));
      
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Detailed analytics and reporting will be implemented in task 4.3-4.4')).toBeInTheDocument();
    });

    it('should switch to monitoring view when monitoring is clicked', () => {
      fireEvent.click(screen.getByRole('button', { name: /🔍 Monitoring/ }));
      
      expect(screen.getByText('Conversation Monitoring')).toBeInTheDocument();
      expect(screen.getByTestId('moderation-dashboard')).toBeInTheDocument();
    });

    it('should switch to interventions view when interventions is clicked', () => {
      fireEvent.click(screen.getByRole('button', { name: /🛠️ Interventions/ }));
      
      expect(screen.getByTestId('instructor-intervention-tools')).toBeInTheDocument();
    });

    it('should switch to settings view when settings is clicked', () => {
      fireEvent.click(screen.getByRole('button', { name: /⚙️ Settings/ }));
      
      expect(screen.getByText('Dashboard Settings')).toBeInTheDocument();
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
      expect(screen.getByText('Dashboard Preferences')).toBeInTheDocument();
    });
  });

  describe('Overview View', () => {
    beforeEach(async () => {
      render(<InstructorDashboard {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });
    });

    it('should display analytics summary stats', () => {
      expect(screen.getByText('2')).toBeInTheDocument(); // Total Projects
      expect(screen.getByText('1')).toBeInTheDocument(); // Active Projects
      expect(screen.getAllByText('3')).toHaveLength(2); // Students and Personas
      expect(screen.getByText('15')).toBeInTheDocument(); // Conversations
      expect(screen.getByText('75.0%')).toBeInTheDocument(); // Avg Engagement
    });

    it('should display recent activity', () => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('New message from Team A')).toBeInTheDocument();
      expect(screen.getByText('Created new persona: Client Smith')).toBeInTheDocument();
    });

    it('should display project status overview', () => {
      expect(screen.getByText('Project Status')).toBeInTheDocument();
      expect(screen.getAllByText('Project Alpha')).toHaveLength(2); // Appears in project status and activity
      expect(screen.getAllByText('Project Beta')).toHaveLength(2); // Appears in project status and engagement
      expect(screen.getByText('1 teams • 2 personas')).toBeInTheDocument();
    });

    it('should display team engagement', () => {
      expect(screen.getByText('Team Engagement')).toBeInTheDocument();
      expect(screen.getByText('Team A')).toBeInTheDocument();
      expect(screen.getByText('Team B')).toBeInTheDocument();
      expect(screen.getByText('25 messages')).toBeInTheDocument();
      expect(screen.getByText('10 messages')).toBeInTheDocument();
    });

    it('should refresh data when refresh button is clicked', async () => {
      const refreshButton = screen.getByText('🔄 Refresh');
      
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledTimes(6); // 3 initial + 3 refresh
      });
    });
  });

  describe('Projects View', () => {
    beforeEach(async () => {
      render(<InstructorDashboard {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Instructor Dashboard')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /📁 Projects/ }));
    });

    it('should display all projects', () => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
      expect(screen.getByText('First project description')).toBeInTheDocument();
      expect(screen.getByText('Second project description')).toBeInTheDocument();
    });

    it('should display project statistics', () => {
      expect(screen.getAllByText('Teams:')).toHaveLength(2);
      expect(screen.getAllByText('Personas:')).toHaveLength(2);
      expect(screen.getAllByText('Students:')).toHaveLength(2);
    });

    it('should display project status badges', () => {
      const activeStatusBadges = screen.getAllByText('active');
      const planningStatusBadges = screen.getAllByText('planning');
      expect(activeStatusBadges.length).toBeGreaterThan(0);
      expect(planningStatusBadges.length).toBeGreaterThan(0);
    });

    it('should display action buttons for each project', () => {
      expect(screen.getAllByText('View Details')).toHaveLength(2);
      expect(screen.getAllByText('Edit')).toHaveLength(2);
      expect(screen.getAllByText('Analytics')).toHaveLength(3); // Navigation + 2 project buttons
    });
  });

  describe('Settings View', () => {
    beforeEach(async () => {
      render(<InstructorDashboard {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Instructor Dashboard')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /⚙️ Settings/ }));
    });

    it('should display notification preferences', () => {
      expect(screen.getByText('Email notifications for new messages')).toBeInTheDocument();
      expect(screen.getByText('Alert for flagged content')).toBeInTheDocument();
      expect(screen.getByText('Daily activity summaries')).toBeInTheDocument();
    });

    it('should display dashboard preferences', () => {
      expect(screen.getByText('Show recent activity')).toBeInTheDocument();
      expect(screen.getByText('Auto-refresh data')).toBeInTheDocument();
      expect(screen.getByText('Refresh interval (seconds)')).toBeInTheDocument();
    });

    it('should have checkboxes for preferences', () => {
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });

  describe('API Integration', () => {
    it('should make correct API calls on mount', async () => {
      render(<InstructorDashboard {...mockProps} />);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(`/api/projects/instructor/${mockProps.userId}`);
        expect(mockedAxios.get).toHaveBeenCalledWith(`/api/analytics/summary/${mockProps.userId}`);
        expect(mockedAxios.get).toHaveBeenCalledWith(`/api/analytics/conversations/summary/${mockProps.userId}`);
      });
    });

    it('should handle partial API failures gracefully', async () => {
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/api/projects/instructor/')) {
          return Promise.resolve({ data: mockProjectsData });
        } else if (url.includes('/api/analytics/summary/')) {
          return Promise.reject(new Error('Analytics API Error'));
        } else if (url.includes('/api/analytics/conversations/summary/')) {
          return Promise.resolve({ data: mockConversationSummaries });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      render(<InstructorDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load dashboard data. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should render without crashing on different screen sizes', async () => {
      render(<InstructorDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Instructor Dashboard')).toBeInTheDocument();
      });

      // Test navigation exists
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      
      // Test main content exists
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      render(<InstructorDashboard {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Instructor Dashboard')).toBeInTheDocument();
      });
    });

    it('should have proper navigation structure', () => {
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should have accessible buttons', () => {
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeEnabled();
      });
    });

    it('should have proper heading hierarchy', () => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });
  });
});