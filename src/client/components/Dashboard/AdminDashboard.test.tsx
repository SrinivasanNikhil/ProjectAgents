import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminDashboard from './AdminDashboard';
import { api } from '../../utils/api';

// Mock the API utility
jest.mock('../../utils/api');
const mockApi = api as jest.Mocked<typeof api>;

// Mock data
const mockDetailedAnalytics = {
  totalProjects: 50,
  totalStudents: 200,
  totalInstructors: 15,
  totalPersonas: 100,
  averageProjectDuration: 30,
  systemUsage: {
    dailyActiveUsers: 45,
    weeklyActiveUsers: 150,
    monthlyActiveUsers: 180,
  },
  performanceDistribution: {
    excellent: 12,
    good: 18,
    average: 15,
    needsImprovement: 5,
  },
  technologyAdoption: {
    aiFeatureUsage: 85.5,
    fileUploadUsage: 65.2,
    linkSharingUsage: 45.8,
    threadingUsage: 55.3,
  },
  departmentBreakdown: [
    {
      _id: 'Computer Science',
      totalUsers: 120,
      students: 100,
      instructors: 15,
      administrators: 5,
    },
    {
      _id: 'Engineering',
      totalUsers: 95,
      students: 80,
      instructors: 12,
      administrators: 3,
    },
  ],
  projectsByDepartment: [
    {
      _id: 'Computer Science',
      totalProjects: 30,
      activeProjects: 25,
      completedProjects: 5,
    },
    {
      _id: 'Engineering',
      totalProjects: 20,
      activeProjects: 15,
      completedProjects: 5,
    },
  ],
  activityByDepartment: [
    {
      _id: 'Computer Science',
      totalMessages: 1500,
      activeUsers: 45,
    },
    {
      _id: 'Engineering',
      totalMessages: 1200,
      activeUsers: 35,
    },
  ],
  generatedAt: new Date('2023-12-01T10:00:00Z'),
};

const mockHealthMetrics = {
  database: {
    totalSize: 1024000,
    totalCollections: 8,
    totalIndexes: 25,
    connectionStatus: 'connected' as const,
  },
  performance: {
    messagesLast24h: 450,
    messagesLastWeek: 2800,
    activeUsersLast24h: 45,
    errorRate: 2.1,
    avgResponseTime: 250,
  },
  system: {
    uptime: 86400,
    memoryUsage: {
      used: 52428800,
      total: 134217728,
      external: 2097152,
    },
    nodeVersion: 'v18.17.0',
  },
  lastUpdated: new Date('2023-12-01T10:00:00Z'),
};

const mockUserSummary = {
  totalUsers: 215,
  usersByRole: {
    student: 180,
    instructor: 27,
    administrator: 8,
  },
  usersByDepartment: [
    { _id: 'Computer Science', count: 120 },
    { _id: 'Engineering', count: 95 },
  ],
  recentRegistrations: 12,
  activeUsersLast24h: 45,
  generatedAt: new Date('2023-12-01T10:00:00Z'),
};

const mockProjectSummary = {
  totalProjects: 50,
  projectsByStatus: {
    active: 35,
    completed: 12,
    paused: 3,
  },
  recentProjectsLast7Days: 5,
  averageProjectDurationDays: 28.5,
  generatedAt: new Date('2023-12-01T10:00:00Z'),
};

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup successful API responses
    mockApi.get.mockImplementation((url) => {
      switch (url) {
        case '/admin/analytics/department/detailed':
          return Promise.resolve({ data: { data: mockDetailedAnalytics } });
        case '/admin/analytics/system/health':
          return Promise.resolve({ data: { data: mockHealthMetrics } });
        case '/admin/users/summary':
          return Promise.resolve({ data: { data: mockUserSummary } });
        case '/admin/projects/summary':
          return Promise.resolve({ data: { data: mockProjectSummary } });
        default:
          return Promise.reject(new Error('Unknown endpoint'));
      }
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching data', () => {
      mockApi.get.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<AdminDashboard />);
      
      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
      expect(screen.getByText(/loading-spinner/i)).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when API calls fail', async () => {
      mockApi.get.mockRejectedValue(new Error('API Error'));
      
      render(<AdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Error Loading Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should retry loading data when retry button is clicked', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('API Error'));
      
      render(<AdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Error Loading Dashboard')).toBeInTheDocument();
      });
      
      // Setup successful response for retry
      mockApi.get.mockImplementation((url) => {
        switch (url) {
          case '/admin/analytics/department/detailed':
            return Promise.resolve({ data: { data: mockDetailedAnalytics } });
          case '/admin/analytics/system/health':
            return Promise.resolve({ data: { data: mockHealthMetrics } });
          case '/admin/users/summary':
            return Promise.resolve({ data: { data: mockUserSummary } });
          case '/admin/projects/summary':
            return Promise.resolve({ data: { data: mockProjectSummary } });
          default:
            return Promise.reject(new Error('Unknown endpoint'));
        }
      });
      
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByText('Department-Wide Analytics')).toBeInTheDocument();
      });
    });
  });

  describe('Successful Data Loading', () => {
    it('should render dashboard header and navigation', async () => {
      render(<AdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Department-Wide Analytics')).toBeInTheDocument();
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('Departments')).toBeInTheDocument();
        expect(screen.getByText('System Health')).toBeInTheDocument();
        expect(screen.getByText('Trends')).toBeInTheDocument();
      });
    });

    it('should display overview tab by default', async () => {
      render(<AdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('215')).toBeInTheDocument();
        expect(screen.getByText('Total Projects')).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument();
        expect(screen.getByText('Active Users (24h)')).toBeInTheDocument();
        expect(screen.getByText('45')).toBeInTheDocument();
        expect(screen.getByText('Total Personas')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument();
      });
    });

    it('should display user distribution data', async () => {
      render(<AdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('User Distribution')).toBeInTheDocument();
        expect(screen.getByText('By Role')).toBeInTheDocument();
        expect(screen.getByText('By Department')).toBeInTheDocument();
        expect(screen.getByText('student')).toBeInTheDocument();
        expect(screen.getByText('180')).toBeInTheDocument();
        expect(screen.getByText('Computer Science')).toBeInTheDocument();
        expect(screen.getByText('120')).toBeInTheDocument();
      });
    });

    it('should display project status data', async () => {
      render(<AdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Project Status')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('35')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();
      });
    });

    it('should display technology adoption metrics', async () => {
      render(<AdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Technology Adoption')).toBeInTheDocument();
        expect(screen.getByText('AI Features')).toBeInTheDocument();
        expect(screen.getByText('85.5%')).toBeInTheDocument();
        expect(screen.getByText('File Upload')).toBeInTheDocument();
        expect(screen.getByText('65.2%')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should switch to departments tab when clicked', async () => {
      render(<AdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Department-Wide Analytics')).toBeInTheDocument();
      });
      
      const departmentsTab = screen.getByText('Departments');
      fireEvent.click(departmentsTab);
      
      expect(screen.getByText('Department Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Projects by Department')).toBeInTheDocument();
      expect(screen.getByText('Activity by Department')).toBeInTheDocument();
    });

    it('should switch to system health tab when clicked', async () => {
      render(<AdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Department-Wide Analytics')).toBeInTheDocument();
      });
      
      const systemTab = screen.getByText('System Health');
      fireEvent.click(systemTab);
      
      expect(screen.getByText('System Status')).toBeInTheDocument();
      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('System Resources')).toBeInTheDocument();
    });

    it('should switch to trends tab when clicked', async () => {
      render(<AdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Department-Wide Analytics')).toBeInTheDocument();
      });
      
      const trendsTab = screen.getByText('Trends');
      fireEvent.click(trendsTab);
      
      expect(screen.getByText('Analytics Trends')).toBeInTheDocument();
      expect(screen.getByText('Trends visualization coming soon...')).toBeInTheDocument();
      expect(screen.getByText('User Registration Trends')).toBeInTheDocument();
      expect(screen.getByText('Project Creation Trends')).toBeInTheDocument();
      expect(screen.getByText('Activity Trends')).toBeInTheDocument();
    });

    it('should highlight active tab correctly', async () => {
      render(<AdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Department-Wide Analytics')).toBeInTheDocument();
      });
      
      const overviewTab = screen.getByText('Overview');
      const departmentsTab = screen.getByText('Departments');
      
      // Overview should be active by default
      expect(overviewTab).toHaveClass('active');
      expect(departmentsTab).not.toHaveClass('active');
      
      // Click departments tab
      fireEvent.click(departmentsTab);
      
      expect(overviewTab).not.toHaveClass('active');
      expect(departmentsTab).toHaveClass('active');
    });
  });

  describe('Department Tab Content', () => {
    beforeEach(async () => {
      render(<AdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Department-Wide Analytics')).toBeInTheDocument();
      });
      
      const departmentsTab = screen.getByText('Departments');
      fireEvent.click(departmentsTab);
    });

    it('should display department breakdown data', () => {
      expect(screen.getByText('Department Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Computer Science')).toBeInTheDocument();
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    it('should display projects by department data', () => {
      expect(screen.getByText('Projects by Department')).toBeInTheDocument();
      // Should show both departments with project data
      const csDepts = screen.getAllByText('Computer Science');
      const engDepts = screen.getAllByText('Engineering');
      expect(csDepts.length).toBeGreaterThan(1);
      expect(engDepts.length).toBeGreaterThan(1);
    });

    it('should display activity by department data', () => {
      expect(screen.getByText('Activity by Department')).toBeInTheDocument();
      expect(screen.getByText('Messages (30d)')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
    });
  });

  describe('System Health Tab Content', () => {
    beforeEach(async () => {
      render(<AdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Department-Wide Analytics')).toBeInTheDocument();
      });
      
      const systemTab = screen.getByText('System Health');
      fireEvent.click(systemTab);
    });

    it('should display database status', () => {
      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('connected')).toBeInTheDocument();
      expect(screen.getByText('1000 KB')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument(); // collections
      expect(screen.getByText('25')).toBeInTheDocument(); // indexes
    });

    it('should display performance metrics', () => {
      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('450')).toBeInTheDocument(); // messages 24h
      expect(screen.getByText('2800')).toBeInTheDocument(); // messages 7d
      expect(screen.getByText('2.10%')).toBeInTheDocument(); // error rate
      expect(screen.getByText('250ms')).toBeInTheDocument(); // avg response time
    });

    it('should display system resources', () => {
      expect(screen.getByText('System Resources')).toBeInTheDocument();
      expect(screen.getByText('1d 0h 0m')).toBeInTheDocument(); // uptime
      expect(screen.getByText('v18.17.0')).toBeInTheDocument(); // node version
    });

    it('should format bytes correctly', () => {
      expect(screen.getByText('50 MB')).toBeInTheDocument(); // memory used
      expect(screen.getByText('128 MB')).toBeInTheDocument(); // memory total
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh data when refresh button is clicked', async () => {
      render(<AdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Department-Wide Analytics')).toBeInTheDocument();
      });
      
      const refreshButton = screen.getByText('Refresh Data');
      fireEvent.click(refreshButton);
      
      // Verify API calls are made again
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/admin/analytics/department/detailed');
        expect(mockApi.get).toHaveBeenCalledWith('/admin/analytics/system/health');
        expect(mockApi.get).toHaveBeenCalledWith('/admin/users/summary');
        expect(mockApi.get).toHaveBeenCalledWith('/admin/projects/summary');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should render properly on different screen sizes', async () => {
      render(<AdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Department-Wide Analytics')).toBeInTheDocument();
      });
      
      // Check that key elements are present (responsive design is mainly CSS)
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('Total Projects')).toBeInTheDocument();
      expect(screen.getByText('Active Users (24h)')).toBeInTheDocument();
      expect(screen.getByText('Total Personas')).toBeInTheDocument();
    });
  });

  describe('Data Formatting', () => {
    it('should format percentages correctly', async () => {
      render(<AdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Department-Wide Analytics')).toBeInTheDocument();
      });
      
      // Check technology adoption percentages
      expect(screen.getByText('85.5%')).toBeInTheDocument();
      expect(screen.getByText('65.2%')).toBeInTheDocument();
      expect(screen.getByText('45.8%')).toBeInTheDocument();
      expect(screen.getByText('55.3%')).toBeInTheDocument();
    });

    it('should calculate percentage of active users correctly', async () => {
      render(<AdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Department-Wide Analytics')).toBeInTheDocument();
      });
      
      // 45 active users out of 215 total = ~21%
      expect(screen.getByText('21% of total')).toBeInTheDocument();
    });
  });
});