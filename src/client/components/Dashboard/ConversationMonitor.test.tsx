import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import ConversationMonitor from './ConversationMonitor';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('ConversationMonitor', () => {
  const mockProps = {
    userId: 'instructor-123',
    userRole: 'instructor',
  };

  const mockConversationsData = [
    {
      _id: 'conv-1',
      projectId: 'project-1',
      projectName: 'Project Alpha',
      teamId: 'team-1',
      teamName: 'Team A',
      teamMembers: [
        { _id: 'student-1', name: 'John Doe', email: 'john@example.com' },
        { _id: 'student-2', name: 'Jane Smith', email: 'jane@example.com' },
      ],
      personas: [
        { _id: 'persona-1', name: 'Client Smith', role: 'Business Owner' },
        { _id: 'persona-2', name: 'Designer Lee', role: 'UX Designer' },
      ],
      totalMessages: 25,
      lastActivity: new Date('2024-01-20T10:30:00Z'),
      status: 'active' as const,
      engagementScore: 85,
      flags: [
        {
          type: 'help-needed' as const,
          severity: 'medium' as const,
          timestamp: new Date('2024-01-20T09:00:00Z'),
          description: 'Team requested assistance with design decisions',
        },
      ],
      currentTopic: 'User Interface Design',
      duration: 120,
      participationRates: {
        'student-1': 45,
        'student-2': 35,
        'persona-1': 15,
        'persona-2': 5,
      },
    },
    {
      _id: 'conv-2',
      projectId: 'project-2',
      projectName: 'Project Beta',
      teamId: 'team-2',
      teamName: 'Team B',
      teamMembers: [
        { _id: 'student-3', name: 'Bob Wilson', email: 'bob@example.com' },
      ],
      personas: [
        { _id: 'persona-3', name: 'Manager Davis', role: 'Project Manager' },
      ],
      totalMessages: 10,
      lastActivity: new Date('2024-01-20T08:00:00Z'),
      status: 'idle' as const,
      engagementScore: 45,
      flags: [],
      currentTopic: 'Project Planning',
      duration: 60,
      participationRates: {
        'student-3': 70,
        'persona-3': 30,
      },
    },
  ];

  const mockMessagesData = [
    {
      _id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'student-1',
      senderName: 'John Doe',
      senderType: 'student' as const,
      content: 'What do you think about the color scheme?',
      timestamp: new Date('2024-01-20T10:30:00Z'),
      reactions: [{ userId: 'student-2', emoji: '👍' }],
    },
    {
      _id: 'msg-2',
      conversationId: 'conv-1',
      senderId: 'persona-1',
      senderName: 'Client Smith',
      senderType: 'persona' as const,
      content: 'I prefer a more professional look with blues and grays.',
      timestamp: new Date('2024-01-20T10:32:00Z'),
    },
  ];

  const mockMetricsData = {
    averageResponseTime: 5.2,
    messageFrequency: 12.5,
    participationBalance: 75,
    sentimentScore: 0.3,
    topicConsistency: 0.8,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses by default
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/api/dashboard/conversations') {
        return Promise.resolve({ data: { conversations: mockConversationsData } });
      }
      if (url.includes('/messages')) {
        return Promise.resolve({ data: { messages: mockMessagesData } });
      }
      if (url.includes('/metrics')) {
        return Promise.resolve({ data: { metrics: mockMetricsData } });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    mockedAxios.post.mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      render(<ConversationMonitor {...mockProps} />);
      
      expect(screen.getByText('Loading conversations...')).toBeInTheDocument();
      expect(screen.getByRole('generic', { name: /spinner/i })).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when API calls fail', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));
      
      render(<ConversationMonitor {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Error Loading Conversations')).toBeInTheDocument();
        expect(screen.getByText('Failed to load conversations')).toBeInTheDocument();
      });
    });

    it('should allow retry when API calls fail', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));
      
      render(<ConversationMonitor {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
      
      // Reset mock to success for retry
      mockedAxios.get.mockResolvedValue({ data: { conversations: mockConversationsData } });
      
      fireEvent.click(screen.getByText('Try Again'));
      
      await waitFor(() => {
        expect(screen.getByText('🔍 Conversation Monitor')).toBeInTheDocument();
      });
    });
  });

  describe('Header and Controls', () => {
    beforeEach(async () => {
      render(<ConversationMonitor {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('🔍 Conversation Monitor')).toBeInTheDocument();
      });
    });

    it('should render header with title and description', () => {
      expect(screen.getByText('🔍 Conversation Monitor')).toBeInTheDocument();
      expect(screen.getByText('Real-time monitoring of student conversations and AI personas')).toBeInTheDocument();
    });

    it('should have auto-refresh toggle', () => {
      const autoRefreshCheckbox = screen.getByLabelText('Auto-refresh');
      expect(autoRefreshCheckbox).toBeInTheDocument();
      expect(autoRefreshCheckbox).toBeChecked();
    });

    it('should have refresh button', () => {
      const refreshButton = screen.getByText('🔄 Refresh');
      expect(refreshButton).toBeInTheDocument();
    });

    it('should call API when refresh button is clicked', () => {
      const refreshButton = screen.getByText('🔄 Refresh');
      fireEvent.click(refreshButton);
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/dashboard/conversations', {
        params: {
          userId: mockProps.userId,
          sortBy: 'lastActivity',
        },
      });
    });
  });

  describe('Conversations List', () => {
    beforeEach(async () => {
      render(<ConversationMonitor {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Team A')).toBeInTheDocument();
      });
    });

    it('should display conversations count', () => {
      expect(screen.getByText('Active Conversations (2)')).toBeInTheDocument();
    });

    it('should display conversation cards with basic info', () => {
      expect(screen.getByText('Team A')).toBeInTheDocument();
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('Team B')).toBeInTheDocument();
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
    });

    it('should show conversation metrics', () => {
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument(); // messages count
      expect(screen.getByText('10')).toBeInTheDocument(); // messages count
    });

    it('should display status icons', () => {
      const activeIcon = screen.getByText('🟢');
      const idleIcon = screen.getByText('🟡');
      expect(activeIcon).toBeInTheDocument();
      expect(idleIcon).toBeInTheDocument();
    });

    it('should show flags when present', () => {
      expect(screen.getByText('🆘 help-needed')).toBeInTheDocument();
    });

    it('should display participants', () => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Client Smith')).toBeInTheDocument();
      expect(screen.getByText('Designer Lee')).toBeInTheDocument();
    });
  });

  describe('Filtering and Sorting', () => {
    beforeEach(async () => {
      render(<ConversationMonitor {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Team A')).toBeInTheDocument();
      });
    });

    it('should have filter controls', () => {
      expect(screen.getByLabelText('Status:')).toBeInTheDocument();
      expect(screen.getByLabelText('Flags:')).toBeInTheDocument();
      expect(screen.getByLabelText('Sort:')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search teams or projects...')).toBeInTheDocument();
    });

    it('should filter by status', async () => {
      const statusSelect = screen.getByLabelText('Status:');
      fireEvent.change(statusSelect, { target: { value: 'active' } });
      
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/dashboard/conversations', {
          params: {
            userId: mockProps.userId,
            status: 'active',
            sortBy: 'lastActivity',
          },
        });
      });
    });

    it('should filter by flags', async () => {
      const flagSelect = screen.getByLabelText('Flags:');
      fireEvent.change(flagSelect, { target: { value: 'help-needed' } });
      
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/dashboard/conversations', {
          params: {
            userId: mockProps.userId,
            flag: 'help-needed',
            sortBy: 'lastActivity',
          },
        });
      });
    });

    it('should search conversations', async () => {
      const searchInput = screen.getByPlaceholderText('Search teams or projects...');
      fireEvent.change(searchInput, { target: { value: 'Alpha' } });
      
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/dashboard/conversations', {
          params: {
            userId: mockProps.userId,
            search: 'Alpha',
            sortBy: 'lastActivity',
          },
        });
      });
    });

    it('should change sort order', async () => {
      const sortSelect = screen.getByLabelText('Sort:');
      fireEvent.change(sortSelect, { target: { value: 'engagement' } });
      
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/dashboard/conversations', {
          params: {
            userId: mockProps.userId,
            sortBy: 'engagement',
          },
        });
      });
    });
  });

  describe('Conversation Selection and Details', () => {
    beforeEach(async () => {
      render(<ConversationMonitor {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Team A')).toBeInTheDocument();
      });
    });

    it('should select conversation when clicked', async () => {
      const conversationCard = screen.getByText('Team A').closest('.conversation-item');
      fireEvent.click(conversationCard!);
      
      await waitFor(() => {
        expect(screen.getByText('Team A - Project Alpha')).toBeInTheDocument();
      });
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/dashboard/conversations/conv-1/messages');
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/dashboard/conversations/conv-1/metrics');
    });

    it('should show view switcher when conversation is selected', async () => {
      const conversationCard = screen.getByText('Team A').closest('.conversation-item');
      fireEvent.click(conversationCard!);
      
      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('Messages')).toBeInTheDocument();
        expect(screen.getByText('Intervention')).toBeInTheDocument();
      });
    });
  });

  describe('Overview View', () => {
    beforeEach(async () => {
      render(<ConversationMonitor {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Team A')).toBeInTheDocument();
      });
      
      const conversationCard = screen.getByText('Team A').closest('.conversation-item');
      fireEvent.click(conversationCard!);
      
      await waitFor(() => {
        expect(screen.getByText('Team A - Project Alpha')).toBeInTheDocument();
      });
    });

    it('should display metrics cards', () => {
      expect(screen.getByText('Response Time')).toBeInTheDocument();
      expect(screen.getByText('5.2min avg')).toBeInTheDocument();
      expect(screen.getByText('Message Frequency')).toBeInTheDocument();
      expect(screen.getByText('12.5/hour')).toBeInTheDocument();
      expect(screen.getByText('Participation Balance')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('Sentiment')).toBeInTheDocument();
      expect(screen.getByText('😊 30%')).toBeInTheDocument();
    });

    it('should display participation rates', () => {
      expect(screen.getByText('Participation Rates')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Client Smith')).toBeInTheDocument();
      expect(screen.getByText('Designer Lee')).toBeInTheDocument();
    });
  });

  describe('Messages View', () => {
    beforeEach(async () => {
      render(<ConversationMonitor {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Team A')).toBeInTheDocument();
      });
      
      const conversationCard = screen.getByText('Team A').closest('.conversation-item');
      fireEvent.click(conversationCard!);
      
      await waitFor(() => {
        expect(screen.getByText('Messages')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Messages'));
    });

    it('should display conversation messages', () => {
      expect(screen.getByText('What do you think about the color scheme?')).toBeInTheDocument();
      expect(screen.getByText('I prefer a more professional look with blues and grays.')).toBeInTheDocument();
    });

    it('should show message senders and timestamps', () => {
      expect(screen.getAllByText('John Doe')).toHaveLength(2); // Appears in participant list and message
      expect(screen.getAllByText('Client Smith')).toHaveLength(2); // Appears in participant list and message
    });

    it('should display message reactions', () => {
      expect(screen.getByText('👍')).toBeInTheDocument();
    });
  });

  describe('Intervention View', () => {
    beforeEach(async () => {
      render(<ConversationMonitor {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Team A')).toBeInTheDocument();
      });
      
      const conversationCard = screen.getByText('Team A').closest('.conversation-item');
      fireEvent.click(conversationCard!);
      
      await waitFor(() => {
        expect(screen.getByText('Intervention')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Intervention'));
    });

    it('should display intervention form', () => {
      expect(screen.getByText('Send Intervention Message')).toBeInTheDocument();
      expect(screen.getByText('Target Students (optional):')).toBeInTheDocument();
      expect(screen.getByText('Intervention Message:')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your guidance or intervention message...')).toBeInTheDocument();
    });

    it('should show student checkboxes', () => {
      expect(screen.getByLabelText('John Doe')).toBeInTheDocument();
      expect(screen.getByLabelText('Jane Smith')).toBeInTheDocument();
    });

    it('should have quick action buttons', () => {
      expect(screen.getByText('🆘 Flag for Help')).toBeInTheDocument();
      expect(screen.getByText('🔄 Flag Off-Topic')).toBeInTheDocument();
      expect(screen.getByText('⚡ Flag Conflict')).toBeInTheDocument();
    });

    it('should send intervention when form is submitted', async () => {
      const messageTextarea = screen.getByPlaceholderText('Enter your guidance or intervention message...');
      const sendButton = screen.getByText('Send Intervention');
      
      fireEvent.change(messageTextarea, { target: { value: 'Please stay focused on the main objectives.' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          '/api/dashboard/conversations/conv-1/intervention',
          {
            message: 'Please stay focused on the main objectives.',
            instructorId: mockProps.userId,
          }
        );
      });
    });

    it('should send targeted intervention to specific students', async () => {
      const johnCheckbox = screen.getByLabelText('John Doe');
      const messageTextarea = screen.getByPlaceholderText('Enter your guidance or intervention message...');
      const sendButton = screen.getByText('Send Intervention');
      
      fireEvent.click(johnCheckbox);
      fireEvent.change(messageTextarea, { target: { value: 'Please review the requirements.' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          '/api/dashboard/conversations/conv-1/intervention',
          {
            message: 'Please review the requirements.',
            targetStudents: ['student-1'],
            instructorId: mockProps.userId,
          }
        );
      });
    });

    it('should flag conversation when quick action button is clicked', async () => {
      const flagHelpButton = screen.getByText('🆘 Flag for Help');
      fireEvent.click(flagHelpButton);
      
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          '/api/dashboard/conversations/conv-1/flag',
          {
            type: 'help-needed',
            description: 'Instructor marked as needing help',
            instructorId: mockProps.userId,
          }
        );
      });
    });
  });

  describe('Auto-refresh', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should auto-refresh conversations every 30 seconds', async () => {
      render(<ConversationMonitor {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Team A')).toBeInTheDocument();
      });
      
      // Clear the initial API call
      vi.clearAllMocks();
      
      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000);
      
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/dashboard/conversations', {
          params: {
            userId: mockProps.userId,
            sortBy: 'lastActivity',
          },
        });
      });
    });

    it('should stop auto-refresh when toggled off', async () => {
      render(<ConversationMonitor {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Team A')).toBeInTheDocument();
      });
      
      const autoRefreshCheckbox = screen.getByLabelText('Auto-refresh');
      fireEvent.click(autoRefreshCheckbox);
      
      // Clear the initial API call
      vi.clearAllMocks();
      
      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000);
      
      // Should not have made any new API calls
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      render(<ConversationMonitor {...mockProps} />);
      await waitFor(() => {
        expect(screen.getByText('Team A')).toBeInTheDocument();
      });
    });

    it('should have proper form labels', () => {
      expect(screen.getByText('Status:')).toBeInTheDocument();
      expect(screen.getByText('Flags:')).toBeInTheDocument();
      expect(screen.getByText('Sort:')).toBeInTheDocument();
      expect(screen.getByLabelText('Auto-refresh')).toBeInTheDocument();
    });

    it('should have accessible buttons', () => {
      const refreshButton = screen.getByText('🔄 Refresh');
      expect(refreshButton).toBeInTheDocument();
      expect(refreshButton.tagName).toBe('BUTTON');
    });

    it('should have proper heading hierarchy', () => {
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('🔍 Conversation Monitor');
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Active Conversations (2)');
    });
  });

  describe('Responsive Behavior', () => {
    it('should render without crashing on different screen sizes', () => {
      // Test mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<ConversationMonitor {...mockProps} />);
      expect(screen.getByText('🔍 Conversation Monitor')).toBeInTheDocument();
      
      // Test tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      
      render(<ConversationMonitor {...mockProps} />);
      expect(screen.getByText('🔍 Conversation Monitor')).toBeInTheDocument();
      
      // Test desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      
      render(<ConversationMonitor {...mockProps} />);
      expect(screen.getByText('🔍 Conversation Monitor')).toBeInTheDocument();
    });
  });
});