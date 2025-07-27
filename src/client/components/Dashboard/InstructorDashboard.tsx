import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PersonaManagementDashboard } from '../Personas/PersonaManagementDashboard';
import ModerationDashboard from '../Chat/ModerationDashboard';
import ConversationMonitor from './ConversationMonitor';
import './InstructorDashboard.css';

interface Project {
  _id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'paused' | 'completed';
  studentTeams: Array<{
    _id: string;
    name: string;
    members: Array<{
      _id: string;
      name: string;
      email: string;
    }>;
  }>;
  personas: Array<{
    _id: string;
    name: string;
    role: string;
    isActive: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface AnalyticsSummary {
  totalProjects: number;
  activeProjects: number;
  totalStudents: number;
  totalPersonas: number;
  totalConversations: number;
  averageEngagement: number;
  recentActivity: Array<{
    type: 'message' | 'milestone' | 'persona_created' | 'team_joined';
    description: string;
    timestamp: Date;
    projectId: string;
    projectName: string;
  }>;
}

interface ConversationSummary {
  projectId: string;
  projectName: string;
  teamName: string;
  totalMessages: number;
  lastActivity: Date;
  engagementScore: number;
  flaggedMessages: number;
}

interface InstructorDashboardProps {
  userId: string;
  userRole: string;
}

type DashboardView = 'overview' | 'projects' | 'personas' | 'analytics' | 'monitoring' | 'settings';

const InstructorDashboard: React.FC<InstructorDashboardProps> = ({ userId, userRole }) => {
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const [projects, setProjects] = useState<Project[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [conversationSummaries, setConversationSummaries] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [userId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [projectsResponse, analyticsResponse, conversationsResponse] = await Promise.all([
        axios.get(`/api/projects/instructor/${userId}`),
        axios.get(`/api/analytics/summary/${userId}`),
        axios.get(`/api/analytics/conversations/summary/${userId}`)
      ]);

      setProjects(projectsResponse.data);
      setAnalytics(analyticsResponse.data);
      setConversationSummaries(conversationsResponse.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderNavigation = () => (
    <nav className="dashboard-nav">
      <div className="dashboard-nav-header">
        <h1>Instructor Dashboard</h1>
        <p>Welcome back! Manage your projects and monitor student progress.</p>
      </div>
      <ul className="dashboard-nav-items">
        <li>
          <button
            className={`nav-item ${currentView === 'overview' ? 'active' : ''}`}
            onClick={() => setCurrentView('overview')}
          >
            <span className="nav-icon">📊</span>
            Overview
          </button>
        </li>
        <li>
          <button
            className={`nav-item ${currentView === 'projects' ? 'active' : ''}`}
            onClick={() => setCurrentView('projects')}
          >
            <span className="nav-icon">📁</span>
            Projects
          </button>
        </li>
        <li>
          <button
            className={`nav-item ${currentView === 'personas' ? 'active' : ''}`}
            onClick={() => setCurrentView('personas')}
          >
            <span className="nav-icon">🎭</span>
            Personas
          </button>
        </li>
        <li>
          <button
            className={`nav-item ${currentView === 'analytics' ? 'active' : ''}`}
            onClick={() => setCurrentView('analytics')}
          >
            <span className="nav-icon">📈</span>
            Analytics
          </button>
        </li>
        <li>
          <button
            className={`nav-item ${currentView === 'monitoring' ? 'active' : ''}`}
            onClick={() => setCurrentView('monitoring')}
          >
            <span className="nav-icon">🔍</span>
            Monitoring
          </button>
        </li>
        <li>
          <button
            className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentView('settings')}
          >
            <span className="nav-icon">⚙️</span>
            Settings
          </button>
        </li>
      </ul>
    </nav>
  );

  const renderOverview = () => (
    <div className="dashboard-content overview">
      <div className="overview-header">
        <h2>Dashboard Overview</h2>
        <button className="refresh-button" onClick={fetchDashboardData}>
          🔄 Refresh
        </button>
      </div>

      {analytics && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📁</div>
            <div className="stat-content">
              <h3>{analytics.totalProjects}</h3>
              <p>Total Projects</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>{analytics.activeProjects}</h3>
              <p>Active Projects</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3>{analytics.totalStudents}</h3>
              <p>Students</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎭</div>
            <div className="stat-content">
              <h3>{analytics.totalPersonas}</h3>
              <p>Personas</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💬</div>
            <div className="stat-content">
              <h3>{analytics.totalConversations}</h3>
              <p>Conversations</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>{(analytics.averageEngagement * 100).toFixed(1)}%</h3>
              <p>Avg Engagement</p>
            </div>
          </div>
        </div>
      )}

      <div className="overview-grid">
        <div className="overview-section">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            {analytics?.recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon">
                  {activity.type === 'message' && '💬'}
                  {activity.type === 'milestone' && '🎯'}
                  {activity.type === 'persona_created' && '🎭'}
                  {activity.type === 'team_joined' && '👥'}
                </div>
                <div className="activity-content">
                  <p>{activity.description}</p>
                  <span className="activity-meta">
                    {activity.projectName} • {new Date(activity.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overview-section">
          <h3>Project Status</h3>
          <div className="project-status-list">
            {projects.slice(0, 5).map((project) => (
              <div key={project._id} className="project-status-item">
                <div className="project-info">
                  <h4>{project.name}</h4>
                  <p>{project.studentTeams.length} teams • {project.personas.length} personas</p>
                </div>
                <div className={`status-badge ${project.status}`}>
                  {project.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overview-section">
          <h3>Team Engagement</h3>
          <div className="engagement-list">
            {conversationSummaries.slice(0, 5).map((conv, index) => (
              <div key={index} className="engagement-item">
                <div className="engagement-info">
                  <h4>{conv.teamName}</h4>
                  <p>{conv.projectName}</p>
                </div>
                <div className="engagement-stats">
                  <span className="message-count">{conv.totalMessages} messages</span>
                  <span className={`engagement-score ${conv.engagementScore > 0.7 ? 'high' : conv.engagementScore > 0.4 ? 'medium' : 'low'}`}>
                    {(conv.engagementScore * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderProjects = () => (
    <div className="dashboard-content projects">
      <div className="projects-header">
        <h2>Project Management</h2>
        <button className="create-project-button">
          + Create New Project
        </button>
      </div>
      <div className="projects-grid">
        {projects.map((project) => (
          <div key={project._id} className="project-card">
            <div className="project-header">
              <h3>{project.name}</h3>
              <div className={`status-badge ${project.status}`}>
                {project.status}
              </div>
            </div>
            <p className="project-description">{project.description}</p>
            <div className="project-stats">
              <div className="stat">
                <span className="stat-label">Teams:</span>
                <span className="stat-value">{project.studentTeams.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Personas:</span>
                <span className="stat-value">{project.personas.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Students:</span>
                <span className="stat-value">
                  {project.studentTeams.reduce((total, team) => total + team.members.length, 0)}
                </span>
              </div>
            </div>
            <div className="project-actions">
              <button className="action-button view">View Details</button>
              <button className="action-button edit">Edit</button>
              <button className="action-button analytics">Analytics</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPersonas = () => (
    <div className="dashboard-content personas">
      <PersonaManagementDashboard userId={userId} />
    </div>
  );

  const renderAnalytics = () => (
    <div className="dashboard-content analytics">
      <h2>Analytics Dashboard</h2>
      <p>Detailed analytics and reporting will be implemented in task 4.3-4.4</p>
    </div>
  );

  const renderMonitoring = () => (
    <div className="dashboard-content monitoring">
      <ConversationMonitor userId={userId} userRole={userRole} />
    </div>
  );

  const renderSettings = () => (
    <div className="dashboard-content settings">
      <h2>Dashboard Settings</h2>
      <div className="settings-grid">
        <div className="setting-group">
          <h3>Notification Preferences</h3>
          <label>
            <input type="checkbox" defaultChecked />
            Email notifications for new messages
          </label>
          <label>
            <input type="checkbox" defaultChecked />
            Alert for flagged content
          </label>
          <label>
            <input type="checkbox" />
            Daily activity summaries
          </label>
        </div>
        <div className="setting-group">
          <h3>Dashboard Preferences</h3>
          <label>
            <input type="checkbox" defaultChecked />
            Show recent activity
          </label>
          <label>
            <input type="checkbox" defaultChecked />
            Auto-refresh data
          </label>
          <label>
            <input type="number" min="5" max="300" defaultValue="30" />
            Refresh interval (seconds)
          </label>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'overview':
        return renderOverview();
      case 'projects':
        return renderProjects();
      case 'personas':
        return renderPersonas();
      case 'analytics':
        return renderAnalytics();
      case 'monitoring':
        return renderMonitoring();
      case 'settings':
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  if (loading) {
    return (
      <div className="instructor-dashboard loading">
        <div className="loading-spinner">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="instructor-dashboard error">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchDashboardData}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="instructor-dashboard">
      <div className="dashboard-layout">
        {renderNavigation()}
        <main className="dashboard-main">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default InstructorDashboard;