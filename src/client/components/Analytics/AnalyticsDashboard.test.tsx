import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import axios from 'axios';
import AnalyticsDashboard from './AnalyticsDashboard';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('AnalyticsDashboard', () => {
  const mockProps = {
    userId: 'user123',
    userRole: 'instructor',
  };

  const mockSummaryData = {
    totalProjects: 5,
    activeProjects: 3,
    totalStudents: 25,
    totalPersonas: 15,
    totalConversations: 120,
    averageEngagement: 0.85,
    recentActivity: [
      {
        type: 'message',
        description: 'New message from Alice',
        timestamp: new Date('2024-01-15T10:30:00Z'),
      },
      {
        type: 'milestone',
        description: 'Milestone completed by Team A',
        timestamp: new Date('2024-01-15T09:15:00Z'),
      },
    ],
  };

  const mockConversationData = {
    conversations: [
      {
        totalMessages: 50,
        messagesPerDay: 5.5,
        averageResponseTime: 12.5,
        activeParticipants: 4,
        sentimentTrend: [],
        messageTypes: {
          text: 40,
          file: 6,
          link: 3,
          milestone: 1,
          system: 0,
        },
      },
    ],
  };

  const mockPersonaData = {
    personas: [
      {
        personaId: 'persona1',
        name: 'Dr. Smith',
        role: 'Project Manager',
        responseMetrics: {
          totalResponses: 25,
          averageResponseTime: 8.5,
          responseQuality: 8.2,
        },
        engagementMetrics: {
          conversationsStarted: 5,
          conversationsParticipated: 12,
          uniqueStudentsInteracted: 8,
        },
      },
    ],
  };

  const mockTeamData = {
    teams: [
      {
        projectId: 'project1',
        projectName: 'AI Project',
        teamSize: 4,
        collaborationScore: 85.5,
        communicationFrequency: 12.3,
        milestoneProgress: {
          completed: 3,
          total: 5,
          onTime: 2,
          overdue: 1,
        },
      },
    ],
  };

  const mockPatternData = {
    timeOfDay: [
      { hour: 9, messageCount: 5 },
      { hour: 10, messageCount: 8 },
      { hour: 11, messageCount: 12 },
      { hour: 14, messageCount: 15 },
    ],
    dayOfWeek: [
      { day: 'Monday', messageCount: 25 },
      { day: 'Tuesday', messageCount: 30 },
      { day: 'Wednesday', messageCount: 22 },
    ],
    responseChains: {
      averageChainLength: 3.5,
      longestChain: 8,
      quickResponses: 45,
      delayedResponses: 12,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/summary/')) {
        return Promise.resolve({ data: mockSummaryData });
      } else if (url.includes('/conversations/summary/')) {
        return Promise.resolve({ data: mockConversationData });
      } else if (url.includes('/personas/summary/')) {
        return Promise.resolve({ data: mockPersonaData });
      } else if (url.includes('/teams/performance/')) {
        return Promise.resolve({ data: mockTeamData });
      } else if (url.includes('/interactions/patterns/')) {
        return Promise.resolve({ data: mockPatternData });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  it('renders loading state initially', () => {
    render(<AnalyticsDashboard {...mockProps} />);
    
    expect(screen.getByText('Loading analytics data...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument();
  });

  it('renders analytics dashboard with all tabs after loading', async () => {
    render(<AnalyticsDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Check all tabs are present
    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conversations' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Personas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Teams' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Patterns' })).toBeInTheDocument();
  });

  it('displays overview metrics correctly', async () => {
    render(<AnalyticsDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // Total Projects
      expect(screen.getByText('25')).toBeInTheDocument(); // Students
      expect(screen.getByText('15')).toBeInTheDocument(); // AI Personas
      expect(screen.getByText('120')).toBeInTheDocument(); // Conversations
      expect(screen.getByText('85.0%')).toBeInTheDocument(); // Avg Engagement
      expect(screen.getByText('3')).toBeInTheDocument(); // Active Projects
    });
  });

  it('displays recent activity in overview', async () => {
    render(<AnalyticsDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('New message from Alice')).toBeInTheDocument();
      expect(screen.getByText('Milestone completed by Team A')).toBeInTheDocument();
    });
  });

  it('switches to conversations tab and displays conversation analytics', async () => {
    render(<AnalyticsDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Conversations' }));

    expect(screen.getByText('Conversation Analytics')).toBeInTheDocument();
    expect(screen.getByText('Total Messages:')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('Messages/Day:')).toBeInTheDocument();
    expect(screen.getByText('5.5')).toBeInTheDocument();
    expect(screen.getByText('Message Types')).toBeInTheDocument();
  });

  it('switches to personas tab and displays persona analytics', async () => {
    render(<AnalyticsDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Personas' }));

    expect(screen.getByText('Persona Performance')).toBeInTheDocument();
    expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
    expect(screen.getByText('Project Manager')).toBeInTheDocument();
    expect(screen.getByText('Response Metrics')).toBeInTheDocument();
    expect(screen.getByText('Engagement Metrics')).toBeInTheDocument();
    expect(screen.getByText('8.2/10')).toBeInTheDocument(); // Quality score
  });

  it('switches to teams tab and displays team performance', async () => {
    render(<AnalyticsDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Teams' }));

    expect(screen.getByText('Team Performance Metrics')).toBeInTheDocument();
    expect(screen.getByText('AI Project')).toBeInTheDocument();
    expect(screen.getByText('4 members')).toBeInTheDocument();
    expect(screen.getByText('Collaboration Score:')).toBeInTheDocument();
    expect(screen.getByText('85.5%')).toBeInTheDocument();
    expect(screen.getByText('Milestone Progress')).toBeInTheDocument();
  });

  it('switches to patterns tab and displays interaction patterns', async () => {
    render(<AnalyticsDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Patterns' }));

    expect(screen.getByText('Interaction Patterns')).toBeInTheDocument();
    expect(screen.getByText('Activity by Time of Day')).toBeInTheDocument();
    expect(screen.getByText('Activity by Day of Week')).toBeInTheDocument();
    expect(screen.getByText('Response Patterns')).toBeInTheDocument();
    expect(screen.getByText('Average Chain Length:')).toBeInTheDocument();
    expect(screen.getByText('3.5')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockedAxios.get.mockRejectedValue(new Error('API Error'));

    render(<AnalyticsDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Error Loading Analytics')).toBeInTheDocument();
      expect(screen.getByText('Failed to load analytics data')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });
  });

  it('retries loading data when retry button is clicked', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

    render(<AnalyticsDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Error Loading Analytics')).toBeInTheDocument();
    });

    // Setup successful response for retry
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/summary/')) {
        return Promise.resolve({ data: mockSummaryData });
      } else if (url.includes('/conversations/summary/')) {
        return Promise.resolve({ data: mockConversationData });
      } else if (url.includes('/personas/summary/')) {
        return Promise.resolve({ data: mockPersonaData });
      } else if (url.includes('/teams/performance/')) {
        return Promise.resolve({ data: mockTeamData });
      } else if (url.includes('/interactions/patterns/')) {
        return Promise.resolve({ data: mockPatternData });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Error Loading Analytics')).not.toBeInTheDocument();
    });
  });

  it('refreshes data when refresh button is clicked', async () => {
    render(<AnalyticsDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: '🔄 Refresh' });
    fireEvent.click(refreshButton);

    // Verify API calls are made again
    expect(mockedAxios.get).toHaveBeenCalledTimes(10); // 5 initial + 5 refresh
  });

  it('displays quality score classes correctly', async () => {
    const mockPersonaWithPoorQuality = {
      personas: [
        {
          ...mockPersonaData.personas[0],
          responseMetrics: {
            ...mockPersonaData.personas[0].responseMetrics,
            responseQuality: 3.5, // Poor quality
          },
        },
      ],
    };

    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/personas/summary/')) {
        return Promise.resolve({ data: mockPersonaWithPoorQuality });
      } else if (url.includes('/summary/')) {
        return Promise.resolve({ data: mockSummaryData });
      } else if (url.includes('/conversations/summary/')) {
        return Promise.resolve({ data: mockConversationData });
      } else if (url.includes('/teams/performance/')) {
        return Promise.resolve({ data: mockTeamData });
      } else if (url.includes('/interactions/patterns/')) {
        return Promise.resolve({ data: mockPatternData });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    render(<AnalyticsDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Personas' }));

    await waitFor(() => {
      const qualityScore = screen.getByText('3.5/10');
      expect(qualityScore).toHaveClass('quality-score', 'poor');
    });
  });

  it('handles empty data gracefully', async () => {
    const emptyData = {
      conversations: [],
      personas: [],
      teams: [],
    };

    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/summary/')) {
        return Promise.resolve({ data: mockSummaryData });
      } else if (url.includes('/conversations/summary/')) {
        return Promise.resolve({ data: { conversations: [] } });
      } else if (url.includes('/personas/summary/')) {
        return Promise.resolve({ data: { personas: [] } });
      } else if (url.includes('/teams/performance/')) {
        return Promise.resolve({ data: { teams: [] } });
      } else if (url.includes('/interactions/patterns/')) {
        return Promise.resolve({ data: mockPatternData });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    render(<AnalyticsDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Check that empty states are handled properly
    fireEvent.click(screen.getByRole('button', { name: 'Conversations' }));
    expect(screen.getByText('Conversation Analytics')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Personas' }));
    expect(screen.getByText('Persona Performance')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Teams' }));
    expect(screen.getByText('Team Performance Metrics')).toBeInTheDocument();
  });

  it('calls correct API endpoints on load', async () => {
    render(<AnalyticsDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    expect(mockedAxios.get).toHaveBeenCalledWith(`/api/analytics/summary/${mockProps.userId}`);
    expect(mockedAxios.get).toHaveBeenCalledWith(`/api/analytics/conversations/summary/${mockProps.userId}`);
    expect(mockedAxios.get).toHaveBeenCalledWith(`/api/analytics/personas/summary/${mockProps.userId}`);
    expect(mockedAxios.get).toHaveBeenCalledWith(`/api/analytics/teams/performance/${mockProps.userId}`);
    expect(mockedAxios.get).toHaveBeenCalledWith(`/api/analytics/interactions/patterns/${mockProps.userId}`);
  });
});