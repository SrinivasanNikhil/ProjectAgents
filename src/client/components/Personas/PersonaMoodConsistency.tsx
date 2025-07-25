import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface PersonaMoodConsistencyProps {
  personaId: string;
  onClose: () => void;
}

interface MoodAnalytics {
  currentMood: number;
  averageMood: number;
  moodTrend: 'improving' | 'declining' | 'stable';
  volatility: number;
  triggers: Array<{
    type: string;
    frequency: number;
    averageImpact: number;
  }>;
  insights: string[];
  dataPoints: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

interface PersonalityConsistency {
  consistencyScore: number;
  basePersonality: {
    traits: string[];
    communicationStyle: string;
    decisionMakingStyle: string;
  };
  moodPersonalityMap: Record<string, any>;
  insights: string[];
  recommendations: string[];
}

interface ResponseAdaptation {
  communicationStyle: {
    adjustment: number;
    description: string;
  };
  verbosity: {
    adjustment: number;
    description: string;
  };
  empathy: {
    adjustment: number;
    description: string;
  };
  assertiveness: {
    adjustment: number;
    description: string;
  };
  context: {
    currentMood: number;
    averageRecentMood: number;
    messageType: string;
    userMood?: number;
  };
}

interface PersonalityDrift {
  driftDetected: boolean;
  driftScore: number;
  driftIndicators: string[];
  moodPatterns: {
    volatility: number;
    averageMood: number;
    communicationInconsistency: number;
  };
  traitDrift: {
    score: number;
    changes: string[];
  };
  recommendations: string[];
  corrections?: any;
}

const PersonaMoodConsistency: React.FC<PersonaMoodConsistencyProps> = ({
  personaId,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [moodAnalytics, setMoodAnalytics] = useState<MoodAnalytics | null>(
    null
  );
  const [personalityConsistency, setPersonalityConsistency] =
    useState<PersonalityConsistency | null>(null);
  const [responseAdaptation, setResponseAdaptation] =
    useState<ResponseAdaptation | null>(null);
  const [personalityDrift, setPersonalityDrift] =
    useState<PersonalityDrift | null>(null);

  // Form states for testing
  const [testContext, setTestContext] = useState({
    messageType: 'general' as 'question' | 'feedback' | 'request' | 'general',
    userMood: 50,
    projectContext: '',
  });

  useEffect(() => {
    loadMoodAnalytics();
    loadPersonalityConsistency();
  }, [personaId]);

  const loadMoodAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/personas/${personaId}/mood/analytics?timeframe=week`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      setMoodAnalytics(response.data.data);
    } catch (err) {
      setError('Failed to load mood analytics');
      console.error('Error loading mood analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPersonalityConsistency = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/personas/${personaId}/personality/consistency`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      setPersonalityConsistency(response.data.data);
    } catch (err) {
      setError('Failed to load personality consistency');
      console.error('Error loading personality consistency:', err);
    } finally {
      setLoading(false);
    }
  };

  const testResponseAdaptation = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `/api/personas/${personaId}/response/adaptation`,
        testContext,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      setResponseAdaptation(response.data.data);
    } catch (err) {
      setError('Failed to test response adaptation');
      console.error('Error testing response adaptation:', err);
    } finally {
      setLoading(false);
    }
  };

  const detectPersonalityDrift = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `/api/personas/${personaId}/personality/drift`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      setPersonalityDrift(response.data.data);
    } catch (err) {
      setError('Failed to detect personality drift');
      console.error('Error detecting personality drift:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMoodColor = (mood: number) => {
    if (mood >= 60) return 'text-green-600';
    if (mood >= 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMoodDescription = (mood: number) => {
    if (mood >= 80) return 'Very Positive';
    if (mood >= 60) return 'Positive';
    if (mood >= 40) return 'Neutral';
    if (mood >= 20) return 'Slightly Negative';
    if (mood >= 0) return 'Negative';
    return 'Very Negative';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return '↗️';
      case 'declining':
        return '↘️';
      default:
        return '→';
    }
  };

  const getConsistencyColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading && !moodAnalytics && !personalityConsistency) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading mood and personality data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Persona Mood & Personality Consistency
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'analytics', label: 'Mood Analytics' },
              { id: 'consistency', label: 'Personality Consistency' },
              { id: 'adaptation', label: 'Response Adaptation' },
              { id: 'drift', label: 'Personality Drift' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Mood Analytics Tab */}
        {activeTab === 'analytics' && moodAnalytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">
                  Current Mood
                </h3>
                <div
                  className={`text-2xl font-bold ${getMoodColor(moodAnalytics.currentMood)}`}
                >
                  {moodAnalytics.currentMood}
                </div>
                <div className="text-sm text-gray-600">
                  {getMoodDescription(moodAnalytics.currentMood)}
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  Average Mood
                </h3>
                <div
                  className={`text-2xl font-bold ${getMoodColor(moodAnalytics.averageMood)}`}
                >
                  {moodAnalytics.averageMood}
                </div>
                <div className="text-sm text-gray-600">
                  {getMoodDescription(moodAnalytics.averageMood)}
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-800 mb-2">
                  Mood Trend
                </h3>
                <div className="text-2xl font-bold text-purple-600">
                  {getTrendIcon(moodAnalytics.moodTrend)}{' '}
                  {moodAnalytics.moodTrend}
                </div>
                <div className="text-sm text-gray-600">
                  Based on recent data
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Mood Volatility
                </h3>
                <div className="text-3xl font-bold text-gray-700 mb-2">
                  {moodAnalytics.volatility}
                </div>
                <div className="text-sm text-gray-600">
                  {moodAnalytics.volatility > 30
                    ? 'High volatility detected'
                    : 'Stable mood patterns'}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Data Points
                </h3>
                <div className="text-3xl font-bold text-gray-700 mb-2">
                  {moodAnalytics.dataPoints}
                </div>
                <div className="text-sm text-gray-600">
                  Mood records analyzed
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3">
                Mood Triggers
              </h3>
              <div className="space-y-2">
                {moodAnalytics.triggers && moodAnalytics.triggers.length > 0 ? (
                  moodAnalytics.triggers.map((trigger, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center"
                    >
                      <span className="font-medium">{trigger.type}</span>
                      <div className="text-sm text-gray-600">
                        {trigger.frequency} times, avg impact:{' '}
                        {trigger.averageImpact.toFixed(1)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 italic">
                    No trigger data available
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">
                Insights
              </h3>
              <ul className="space-y-1">
                {moodAnalytics.insights && moodAnalytics.insights.length > 0 ? (
                  moodAnalytics.insights.map((insight, index) => (
                    <li key={index} className="text-sm text-blue-700">
                      • {insight}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-blue-700 italic">
                    • No insights available
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Personality Consistency Tab */}
        {activeTab === 'consistency' && personalityConsistency && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-blue-800 mb-4">
                Consistency Score
              </h3>
              <div
                className={`text-4xl font-bold ${getConsistencyColor(personalityConsistency.consistencyScore)}`}
              >
                {personalityConsistency.consistencyScore}%
              </div>
              <div className="text-sm text-gray-600 mt-2">
                {personalityConsistency.consistencyScore >= 80
                  ? 'Excellent consistency'
                  : personalityConsistency.consistencyScore >= 60
                    ? 'Good consistency'
                    : 'Needs improvement'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Base Personality
                </h3>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Traits:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {personalityConsistency.basePersonality.traits &&
                      personalityConsistency.basePersonality.traits.length >
                        0 ? (
                        personalityConsistency.basePersonality.traits.map(
                          (trait, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                            >
                              {trait}
                            </span>
                          )
                        )
                      ) : (
                        <span className="text-sm text-gray-500 italic">
                          No traits defined
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Communication:</span>{' '}
                    {personalityConsistency.basePersonality.communicationStyle}
                  </div>
                  <div>
                    <span className="font-medium">Decision Making:</span>{' '}
                    {personalityConsistency.basePersonality.decisionMakingStyle}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Mood-Personality Mapping
                </h3>
                <div className="space-y-2">
                  {personalityConsistency.moodPersonalityMap &&
                  Object.keys(personalityConsistency.moodPersonalityMap)
                    .length > 0 ? (
                    Object.entries(
                      personalityConsistency.moodPersonalityMap
                    ).map(([category, data]: [string, any]) => (
                      <div
                        key={category}
                        className="border-l-4 border-blue-500 pl-3"
                      >
                        <div className="font-medium capitalize">{category}</div>
                        <div className="text-sm text-gray-600">
                          {data.count} occurrences, avg mood:{' '}
                          {data.averageMood.toFixed(1)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      No mood-personality mapping data available
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3">
                Insights
              </h3>
              <ul className="space-y-1">
                {personalityConsistency.insights &&
                personalityConsistency.insights.length > 0 ? (
                  personalityConsistency.insights.map((insight, index) => (
                    <li key={index} className="text-sm text-yellow-700">
                      • {insight}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-yellow-700 italic">
                    • No insights available
                  </li>
                )}
              </ul>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-3">
                Recommendations
              </h3>
              <ul className="space-y-1">
                {personalityConsistency.recommendations &&
                personalityConsistency.recommendations.length > 0 ? (
                  personalityConsistency.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-green-700">
                      • {rec}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-green-700 italic">
                    • No recommendations available
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Response Adaptation Tab */}
        {activeTab === 'adaptation' && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">
                Test Response Adaptation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message Type
                  </label>
                  <select
                    value={testContext.messageType}
                    onChange={e =>
                      setTestContext(prev => ({
                        ...prev,
                        messageType: e.target.value as any,
                      }))
                    }
                    className="w-full p-2 border border-gray-300 rounded"
                  >
                    <option value="general">General</option>
                    <option value="question">Question</option>
                    <option value="feedback">Feedback</option>
                    <option value="request">Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User Mood (-100 to 100)
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={testContext.userMood}
                    onChange={e =>
                      setTestContext(prev => ({
                        ...prev,
                        userMood: parseInt(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                  <div className="text-sm text-gray-600">
                    {testContext.userMood}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Context
                  </label>
                  <input
                    type="text"
                    value={testContext.projectContext}
                    onChange={e =>
                      setTestContext(prev => ({
                        ...prev,
                        projectContext: e.target.value,
                      }))
                    }
                    placeholder="Optional project context"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              </div>

              <button
                onClick={testResponseAdaptation}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Adaptation'}
              </button>
            </div>

            {responseAdaptation && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Response Adaptation Results
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">
                      Communication Style
                    </h4>
                    <div className="text-lg font-bold text-blue-600">
                      {responseAdaptation.communicationStyle.adjustment > 0
                        ? '+'
                        : ''}
                      {responseAdaptation.communicationStyle.adjustment}
                    </div>
                    <div className="text-sm text-gray-600">
                      {responseAdaptation.communicationStyle.description}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">
                      Verbosity
                    </h4>
                    <div className="text-lg font-bold text-green-600">
                      {responseAdaptation.verbosity.adjustment > 0 ? '+' : ''}
                      {responseAdaptation.verbosity.adjustment}
                    </div>
                    <div className="text-sm text-gray-600">
                      {responseAdaptation.verbosity.description}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">Empathy</h4>
                    <div className="text-lg font-bold text-purple-600">
                      {responseAdaptation.empathy.adjustment > 0 ? '+' : ''}
                      {responseAdaptation.empathy.adjustment}
                    </div>
                    <div className="text-sm text-gray-600">
                      {responseAdaptation.empathy.description}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">
                      Assertiveness
                    </h4>
                    <div className="text-lg font-bold text-orange-600">
                      {responseAdaptation.assertiveness.adjustment > 0
                        ? '+'
                        : ''}
                      {responseAdaptation.assertiveness.adjustment}
                    </div>
                    <div className="text-sm text-gray-600">
                      {responseAdaptation.assertiveness.description}
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">
                    Context Information
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Current Mood:</span>{' '}
                      {responseAdaptation.context.currentMood}
                    </div>
                    <div>
                      <span className="font-medium">Avg Recent Mood:</span>{' '}
                      {responseAdaptation.context.averageRecentMood.toFixed(1)}
                    </div>
                    <div>
                      <span className="font-medium">Message Type:</span>{' '}
                      {responseAdaptation.context.messageType}
                    </div>
                    <div>
                      <span className="font-medium">User Mood:</span>{' '}
                      {responseAdaptation.context.userMood || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Personality Drift Tab */}
        {activeTab === 'drift' && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">
                Personality Drift Detection
              </h3>
              <button
                onClick={detectPersonalityDrift}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Detect Drift'}
              </button>
            </div>

            {personalityDrift && (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-lg ${personalityDrift.driftDetected ? 'bg-red-50' : 'bg-green-50'}`}
                >
                  <h3
                    className={`text-lg font-semibold mb-2 ${personalityDrift.driftDetected ? 'text-red-800' : 'text-green-800'}`}
                  >
                    Drift Status:{' '}
                    {personalityDrift.driftDetected
                      ? 'Detected'
                      : 'No Significant Drift'}
                  </h3>
                  <div
                    className={`text-2xl font-bold ${personalityDrift.driftDetected ? 'text-red-600' : 'text-green-600'}`}
                  >
                    Drift Score: {personalityDrift.driftScore}
                  </div>
                </div>

                {personalityDrift.driftIndicators.length > 0 && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-2">
                      Drift Indicators
                    </h4>
                    <ul className="space-y-1">
                      {personalityDrift.driftIndicators &&
                      personalityDrift.driftIndicators.length > 0 ? (
                        personalityDrift.driftIndicators.map(
                          (indicator, index) => (
                            <li key={index} className="text-sm text-yellow-700">
                              • {indicator}
                            </li>
                          )
                        )
                      ) : (
                        <li className="text-sm text-yellow-700 italic">
                          • No drift indicators detected
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">
                      Mood Volatility
                    </h4>
                    <div className="text-lg font-bold text-gray-700">
                      {personalityDrift.moodPatterns.volatility.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {personalityDrift.moodPatterns.volatility > 40
                        ? 'High volatility'
                        : 'Stable patterns'}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">
                      Average Mood
                    </h4>
                    <div
                      className={`text-lg font-bold ${getMoodColor(personalityDrift.moodPatterns.averageMood)}`}
                    >
                      {personalityDrift.moodPatterns.averageMood.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {getMoodDescription(
                        personalityDrift.moodPatterns.averageMood
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">
                      Communication Inconsistency
                    </h4>
                    <div className="text-lg font-bold text-gray-700">
                      {(
                        personalityDrift.moodPatterns
                          .communicationInconsistency * 100
                      ).toFixed(1)}
                      %
                    </div>
                    <div className="text-sm text-gray-600">
                      {personalityDrift.moodPatterns
                        .communicationInconsistency > 0.7
                        ? 'High inconsistency'
                        : 'Consistent patterns'}
                    </div>
                  </div>
                </div>

                {personalityDrift.traitDrift.changes &&
                  personalityDrift.traitDrift.changes.length > 0 && (
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="font-medium text-orange-800 mb-2">
                        Trait Changes
                      </h4>
                      <ul className="space-y-1">
                        {personalityDrift.traitDrift.changes.map(
                          (change, index) => (
                            <li key={index} className="text-sm text-orange-700">
                              • {change}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">
                    Recommendations
                  </h4>
                  <ul className="space-y-1">
                    {personalityDrift.recommendations &&
                    personalityDrift.recommendations.length > 0 ? (
                      personalityDrift.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-green-700">
                          • {rec}
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-green-700 italic">
                        • No recommendations available
                      </li>
                    )}
                  </ul>
                </div>

                {personalityDrift.corrections && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">
                      Applied Corrections
                    </h4>
                    <div className="space-y-2">
                      {personalityDrift.corrections.corrections &&
                      personalityDrift.corrections.corrections.length > 0 ? (
                        personalityDrift.corrections.corrections.map(
                          (correction: any, index: number) => (
                            <div key={index} className="text-sm text-blue-700">
                              • {correction.type}: {correction.reason}
                            </div>
                          )
                        )
                      ) : (
                        <div className="text-sm text-blue-700 italic">
                          • No corrections applied
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonaMoodConsistency;
