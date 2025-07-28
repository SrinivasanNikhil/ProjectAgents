import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import './AdminDashboard.css';

interface DepartmentAnalytics {
  totalProjects: number;
  totalStudents: number;
  totalInstructors: number;
  totalPersonas: number;
  averageProjectDuration: number;
  systemUsage: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
  };
  performanceDistribution: {
    excellent: number;
    good: number;
    average: number;
    needsImprovement: number;
  };
  technologyAdoption: {
    aiFeatureUsage: number;
    fileUploadUsage: number;
    linkSharingUsage: number;
    threadingUsage: number;
  };
}

interface DetailedDepartmentAnalytics extends DepartmentAnalytics {
  departmentBreakdown: Array<{
    _id: string;
    totalUsers: number;
    students: number;
    instructors: number;
    administrators: number;
  }>;
  projectsByDepartment: Array<{
    _id: string;
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
  }>;
  activityByDepartment: Array<{
    _id: string;
    totalMessages: number;
    activeUsers: number;
  }>;
  generatedAt: Date;
}

interface SystemHealthMetrics {
  database: {
    totalSize: number;
    totalCollections: number;
    totalIndexes: number;
    connectionStatus: 'connected' | 'disconnected';
  };
  performance: {
    messagesLast24h: number;
    messagesLastWeek: number;
    activeUsersLast24h: number;
    errorRate: number;
    avgResponseTime: number;
  };
  system: {
    uptime: number;
    memoryUsage: {
      used: number;
      total: number;
      external: number;
    };
    nodeVersion: string;
  };
  lastUpdated: Date;
}

interface UserSummaryForAdmin {
  totalUsers: number;
  usersByRole: Record<string, number>;
  usersByDepartment: Array<{
    _id: string;
    count: number;
  }>;
  recentRegistrations: number;
  activeUsersLast24h: number;
  generatedAt: Date;
}

interface ProjectSummaryForAdmin {
  totalProjects: number;
  projectsByStatus: Record<string, number>;
  recentProjectsLast7Days: number;
  averageProjectDurationDays: number;
  generatedAt: Date;
}

const AdminDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<DetailedDepartmentAnalytics | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<SystemHealthMetrics | null>(null);
  const [userSummary, setUserSummary] = useState<UserSummaryForAdmin | null>(null);
  const [projectSummary, setProjectSummary] = useState<ProjectSummaryForAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'system' | 'trends'>('overview');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [analyticsRes, healthRes, usersRes, projectsRes] = await Promise.all([
        api.get('/admin/analytics/department/detailed'),
        api.get('/admin/analytics/system/health'),
        api.get('/admin/users/summary'),
        api.get('/admin/projects/summary'),
      ]);

      setAnalytics(analyticsRes.data.data);
      setHealthMetrics(healthRes.data.data);
      setUserSummary(usersRes.data.data);
      setProjectSummary(projectsRes.data.data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'connected':
        return 'status-connected';
      case 'disconnected':
        return 'status-disconnected';
      default:
        return 'status-unknown';
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="error-container">
          <h2>Error Loading Dashboard</h2>
          <p>{error}</p>
          <button onClick={loadDashboardData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <h1>Department-Wide Analytics</h1>
        <div className="dashboard-nav">
          <button
            className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`nav-tab ${activeTab === 'departments' ? 'active' : ''}`}
            onClick={() => setActiveTab('departments')}
          >
            Departments
          </button>
          <button
            className={`nav-tab ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            System Health
          </button>
          <button
            className={`nav-tab ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveTab('trends')}
          >
            Trends
          </button>
        </div>
      </header>

      {activeTab === 'overview' && analytics && userSummary && projectSummary && (
        <div className="overview-tab">
          {/* Key Metrics Cards */}
          <div className="metrics-grid">
            <div className="metric-card">
              <h3>Total Users</h3>
              <div className="metric-value">{userSummary.totalUsers}</div>
              <div className="metric-detail">
                {userSummary.recentRegistrations} new this week
              </div>
            </div>
            <div className="metric-card">
              <h3>Total Projects</h3>
              <div className="metric-value">{projectSummary.totalProjects}</div>
              <div className="metric-detail">
                {projectSummary.recentProjectsLast7Days} new this week
              </div>
            </div>
            <div className="metric-card">
              <h3>Active Users (24h)</h3>
              <div className="metric-value">{analytics.systemUsage.dailyActiveUsers}</div>
              <div className="metric-detail">
                {Math.round((analytics.systemUsage.dailyActiveUsers / userSummary.totalUsers) * 100)}% of total
              </div>
            </div>
            <div className="metric-card">
              <h3>Total Personas</h3>
              <div className="metric-value">{analytics.totalPersonas}</div>
              <div className="metric-detail">
                AI-powered client personas
              </div>
            </div>
          </div>

          {/* User Distribution */}
          <div className="dashboard-section">
            <h2>User Distribution</h2>
            <div className="distribution-grid">
              <div className="distribution-card">
                <h4>By Role</h4>
                <div className="role-breakdown">
                  {Object.entries(userSummary.usersByRole).map(([role, count]) => (
                    <div key={role} className="role-item">
                      <span className="role-name">{role}</span>
                      <span className="role-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="distribution-card">
                <h4>By Department</h4>
                <div className="department-breakdown">
                  {userSummary.usersByDepartment.slice(0, 5).map((dept) => (
                    <div key={dept._id} className="department-item">
                      <span className="department-name">{dept._id || 'Unassigned'}</span>
                      <span className="department-count">{dept.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Project Status */}
          <div className="dashboard-section">
            <h2>Project Status</h2>
            <div className="project-status-grid">
              {Object.entries(projectSummary.projectsByStatus).map(([status, count]) => (
                <div key={status} className={`project-status-card status-${status}`}>
                  <h4>{status.charAt(0).toUpperCase() + status.slice(1)}</h4>
                  <div className="project-count">{count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Technology Adoption */}
          <div className="dashboard-section">
            <h2>Technology Adoption</h2>
            <div className="tech-adoption-grid">
              <div className="tech-item">
                <span className="tech-name">AI Features</span>
                <div className="tech-bar">
                  <div
                    className="tech-fill"
                    style={{ width: `${analytics.technologyAdoption.aiFeatureUsage}%` }}
                  ></div>
                </div>
                <span className="tech-percentage">
                  {analytics.technologyAdoption.aiFeatureUsage.toFixed(1)}%
                </span>
              </div>
              <div className="tech-item">
                <span className="tech-name">File Upload</span>
                <div className="tech-bar">
                  <div
                    className="tech-fill"
                    style={{ width: `${analytics.technologyAdoption.fileUploadUsage}%` }}
                  ></div>
                </div>
                <span className="tech-percentage">
                  {analytics.technologyAdoption.fileUploadUsage.toFixed(1)}%
                </span>
              </div>
              <div className="tech-item">
                <span className="tech-name">Link Sharing</span>
                <div className="tech-bar">
                  <div
                    className="tech-fill"
                    style={{ width: `${analytics.technologyAdoption.linkSharingUsage}%` }}
                  ></div>
                </div>
                <span className="tech-percentage">
                  {analytics.technologyAdoption.linkSharingUsage.toFixed(1)}%
                </span>
              </div>
              <div className="tech-item">
                <span className="tech-name">Threading</span>
                <div className="tech-bar">
                  <div
                    className="tech-fill"
                    style={{ width: `${analytics.technologyAdoption.threadingUsage}%` }}
                  ></div>
                </div>
                <span className="tech-percentage">
                  {analytics.technologyAdoption.threadingUsage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'departments' && analytics && (
        <div className="departments-tab">
          <div className="dashboard-section">
            <h2>Department Breakdown</h2>
            <div className="departments-grid">
              {analytics.departmentBreakdown.map((dept) => (
                <div key={dept._id} className="department-card">
                  <h3>{dept._id || 'Unassigned'}</h3>
                  <div className="department-stats">
                    <div className="stat-item">
                      <span className="stat-label">Total Users</span>
                      <span className="stat-value">{dept.totalUsers}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Students</span>
                      <span className="stat-value">{dept.students}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Instructors</span>
                      <span className="stat-value">{dept.instructors}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Administrators</span>
                      <span className="stat-value">{dept.administrators}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-section">
            <h2>Projects by Department</h2>
            <div className="projects-by-department-grid">
              {analytics.projectsByDepartment.map((dept) => (
                <div key={dept._id} className="project-dept-card">
                  <h3>{dept._id || 'Unassigned'}</h3>
                  <div className="project-dept-stats">
                    <div className="stat-item">
                      <span className="stat-label">Total Projects</span>
                      <span className="stat-value">{dept.totalProjects}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Active</span>
                      <span className="stat-value active">{dept.activeProjects}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Completed</span>
                      <span className="stat-value completed">{dept.completedProjects}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-section">
            <h2>Activity by Department</h2>
            <div className="activity-by-department-grid">
              {analytics.activityByDepartment.map((dept) => (
                <div key={dept._id} className="activity-dept-card">
                  <h3>{dept._id || 'Unassigned'}</h3>
                  <div className="activity-stats">
                    <div className="stat-item">
                      <span className="stat-label">Messages (30d)</span>
                      <span className="stat-value">{dept.totalMessages}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Active Users</span>
                      <span className="stat-value">{dept.activeUsers}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'system' && healthMetrics && (
        <div className="system-tab">
          <div className="dashboard-section">
            <h2>System Status</h2>
            <div className="system-status-grid">
              <div className="system-card">
                <h3>Database</h3>
                <div className="system-stats">
                  <div className="stat-item">
                    <span className="stat-label">Status</span>
                    <span className={`stat-value ${getStatusColor(healthMetrics.database.connectionStatus)}`}>
                      {healthMetrics.database.connectionStatus}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Size</span>
                    <span className="stat-value">{formatBytes(healthMetrics.database.totalSize)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Collections</span>
                    <span className="stat-value">{healthMetrics.database.totalCollections}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Indexes</span>
                    <span className="stat-value">{healthMetrics.database.totalIndexes}</span>
                  </div>
                </div>
              </div>

              <div className="system-card">
                <h3>Performance</h3>
                <div className="system-stats">
                  <div className="stat-item">
                    <span className="stat-label">Messages (24h)</span>
                    <span className="stat-value">{healthMetrics.performance.messagesLast24h}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Messages (7d)</span>
                    <span className="stat-value">{healthMetrics.performance.messagesLastWeek}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Error Rate</span>
                    <span className="stat-value">{healthMetrics.performance.errorRate.toFixed(2)}%</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Avg Response</span>
                    <span className="stat-value">{healthMetrics.performance.avgResponseTime.toFixed(0)}ms</span>
                  </div>
                </div>
              </div>

              <div className="system-card">
                <h3>System Resources</h3>
                <div className="system-stats">
                  <div className="stat-item">
                    <span className="stat-label">Uptime</span>
                    <span className="stat-value">{formatUptime(healthMetrics.system.uptime)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Memory Used</span>
                    <span className="stat-value">{formatBytes(healthMetrics.system.memoryUsage.used)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Memory Total</span>
                    <span className="stat-value">{formatBytes(healthMetrics.system.memoryUsage.total)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Node Version</span>
                    <span className="stat-value">{healthMetrics.system.nodeVersion}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="trends-tab">
          <div className="dashboard-section">
            <h2>Analytics Trends</h2>
            <p>Trends visualization coming soon...</p>
            <div className="coming-soon">
              <div className="coming-soon-card">
                <h3>User Registration Trends</h3>
                <p>Track new user registrations over time</p>
              </div>
              <div className="coming-soon-card">
                <h3>Project Creation Trends</h3>
                <p>Monitor project creation patterns</p>
              </div>
              <div className="coming-soon-card">
                <h3>Activity Trends</h3>
                <p>Analyze platform usage and engagement</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="dashboard-footer">
        <div className="last-updated">
          Last updated: {new Date().toLocaleString()}
        </div>
        <button onClick={loadDashboardData} className="refresh-button">
          Refresh Data
        </button>
      </footer>
    </div>
  );
};

export default AdminDashboard;