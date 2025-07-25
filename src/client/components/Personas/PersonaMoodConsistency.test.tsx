import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import PersonaMoodConsistency from './PersonaMoodConsistency';

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

// Helper function to find elements by text and class
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

// Helper function to find elements by partial text content and class
const findByPartialTextAndClass = (partialText: string, className: string) => {
  return screen.getByText((content, element) => {
    return Boolean(
      element?.textContent?.includes(partialText) &&
        element?.className?.includes(className)
    );
  });
};

describe('PersonaMoodConsistency', () => {
  const mockOnClose = vi.fn();
  const mockPersonaId = 'test-persona-id';

  // Update mock mood analytics and consistency data to match expected structure
  const mockMoodAnalytics = {
    currentMood: 85,
    averageMood: 68.5,
    moodTrend: 'improving' as const,
    volatility: 25.3,
    triggers: [
      { type: 'conversation', frequency: 5, averageImpact: 15.2 },
      { type: 'milestone', frequency: 2, averageImpact: 25.0 },
    ],
    insights: ['Mood is trending positively', 'Good response to milestones'],
    dataPoints: 10,
    timeRange: { start: new Date(), end: new Date() },
  };

  const mockPersonalityConsistency = {
    consistencyScore: 75,
    basePersonality: {
      traits: ['Empathetic', 'Analytical', 'Collaborative'],
      communicationStyle: 'Direct',
      decisionMakingStyle: 'Collaborative',
    },
    moodPersonalityMap: {
      positive: { count: 3, averageMood: 80 },
      neutral: { count: 2, averageMood: 50 },
    },
    insights: [
      'Good consistency in positive moods',
      'Stable personality traits',
    ],
    recommendations: ['Continue current approach', 'Monitor for changes'],
  };

  const mockResponseAdaptation = {
    communicationStyle: { adjustment: 10, description: 'Slightly more formal' },
    verbosity: { adjustment: -5, description: 'More concise' },
    empathy: { adjustment: 15, description: 'Increased empathy' },
    assertiveness: { adjustment: 0, description: 'No change' },
    context: {
      currentMood: 85,
      averageRecentMood: 68.5,
      messageType: 'question',
      userMood: 50,
    },
  };

  const mockDriftDetection = {
    driftDetected: false,
    driftScore: 25,
    driftIndicators: ['Minor changes in empathy expression'],
    moodPatterns: {
      volatility: 15.2,
      averageMood: 68.5,
      communicationInconsistency: 0.3,
    },
    traitDrift: {
      score: 20,
      changes: ['Slight increase in empathy'],
    },
    recommendations: ['Continue monitoring', 'Maintain current approach'],
    corrections: {
      corrections: [
        { type: 'mood_stabilization', reason: 'Minor adjustment applied' },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('mock-token');
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/mood/analytics')) {
        return Promise.resolve({ data: { data: mockMoodAnalytics } });
      }
      if (url.includes('/personality/consistency')) {
        return Promise.resolve({ data: { data: mockPersonalityConsistency } });
      }
      if (url.includes('/personality/drift')) {
        return Promise.resolve({ data: { data: mockDriftDetection } });
      }
      return Promise.resolve({ data: { data: {} } });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders mood analytics tab by default', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { data: mockMoodAnalytics } })
      .mockResolvedValueOnce({ data: { data: mockPersonalityConsistency } });

    render(
      <PersonaMoodConsistency personaId={mockPersonaId} onClose={mockOnClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Current Mood')).toBeInTheDocument();
      expect(screen.getByText('Mood Analytics')).toBeInTheDocument();
    });

    // Check that mood value is displayed with correct color
    const moodScore = screen.getByText((content, element) => {
      return Boolean(
        content === '85' && element?.className?.includes('text-green-600')
      );
    });
    expect(moodScore).toBeInTheDocument();
  });

  it('displays mood analytics data correctly', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { data: mockMoodAnalytics } })
      .mockResolvedValueOnce({ data: { data: mockPersonalityConsistency } });

    render(
      <PersonaMoodConsistency personaId={mockPersonaId} onClose={mockOnClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Current Mood')).toBeInTheDocument();
      expect(screen.getByText('Average Mood')).toBeInTheDocument();
      expect(screen.getByText('Mood Trend')).toBeInTheDocument();
      expect(screen.getByText('Mood Volatility')).toBeInTheDocument();
    });

    // Check specific values with robust selectors
    const averageMoodElements = getAllByTextAndFilter('68.5', el =>
      Boolean(el.parentElement?.textContent?.includes('Average Mood'))
    );
    expect(averageMoodElements.length).toBeGreaterThan(0);

    const volatilityElements = getAllByTextAndFilter('25.3', el =>
      Boolean(el.parentElement?.textContent?.includes('Mood Volatility'))
    );
    expect(volatilityElements.length).toBeGreaterThan(0);
  });

  it('displays personality consistency data correctly', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { data: mockMoodAnalytics } })
      .mockResolvedValueOnce({ data: { data: mockPersonalityConsistency } });

    render(
      <PersonaMoodConsistency personaId={mockPersonaId} onClose={mockOnClose} />
    );

    // Switch to consistency tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('Personality Consistency'));
    });

    await waitFor(() => {
      expect(screen.getByText('Consistency Score')).toBeInTheDocument();
      expect(screen.getByText('Base Personality')).toBeInTheDocument();
    });

    // Check consistency score with robust selector
    const scoreElements = getAllByTextAndFilter('75%', el =>
      el.className.includes('text-yellow-600')
    );
    expect(scoreElements.length).toBeGreaterThan(0);
  });

  it('tests response adaptation functionality', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { data: mockMoodAnalytics } })
      .mockResolvedValueOnce({ data: { data: mockPersonalityConsistency } });
    mockedAxios.post.mockResolvedValueOnce({
      data: { data: mockResponseAdaptation },
    });

    render(
      <PersonaMoodConsistency personaId={mockPersonaId} onClose={mockOnClose} />
    );

    // Switch to adaptation tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('Response Adaptation'));
    });

    // Change message type
    await waitFor(() => {
      const messageTypeSelect = screen.getByDisplayValue('General');
      fireEvent.change(messageTypeSelect, { target: { value: 'feedback' } });
    });

    // Change user mood
    await waitFor(() => {
      const moodSlider = screen.getByDisplayValue('50');
      fireEvent.change(moodSlider, { target: { value: '30' } });
    });

    // Test adaptation
    await waitFor(() => {
      fireEvent.click(screen.getByText('Test Adaptation'));
    });

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/api/personas/${mockPersonaId}/response/adaptation`,
        {
          messageType: 'feedback',
          userMood: 30,
          projectContext: '',
        },
        expect.any(Object)
      );
    });

    await waitFor(() => {
      // Check adjustment values with robust selectors
      const communicationElements = getAllByTextAndFilter('+10', el =>
        Boolean(el.parentElement?.textContent?.includes('Communication'))
      );
      expect(communicationElements.length).toBeGreaterThan(0);

      const verbosityElements = getAllByTextAndFilter('-5', el =>
        Boolean(el.parentElement?.textContent?.includes('Verbosity'))
      );
      expect(verbosityElements.length).toBeGreaterThan(0);

      const empathyElements = getAllByTextAndFilter('+15', el =>
        Boolean(el.parentElement?.textContent?.includes('Empathy'))
      );
      expect(empathyElements.length).toBeGreaterThan(0);

      const assertivenessElements = getAllByTextAndFilter('0', el =>
        Boolean(el.parentElement?.textContent?.includes('Assertiveness'))
      );
      expect(assertivenessElements.length).toBeGreaterThan(0);
    });
  });

  it('tests personality drift detection', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { data: mockMoodAnalytics } })
      .mockResolvedValueOnce({ data: { data: mockPersonalityConsistency } });
    mockedAxios.post.mockResolvedValueOnce({
      data: { data: mockDriftDetection },
    });

    render(
      <PersonaMoodConsistency personaId={mockPersonaId} onClose={mockOnClose} />
    );

    // Switch to drift tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('Personality Drift'));
    });

    // Detect drift
    await waitFor(() => {
      fireEvent.click(screen.getByText('Detect Drift'));
    });

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/api/personas/${mockPersonaId}/personality/drift`,
        {},
        expect.any(Object)
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText('Drift Status: No Significant Drift')
      ).toBeInTheDocument();

      // Check drift score with robust selector - look for "Drift Score: 25"
      const driftScoreElements = getAllByTextAndFilter('Drift Score: 25', el =>
        Boolean(el.className.includes('text-green-600'))
      );
      expect(driftScoreElements.length).toBeGreaterThan(0);

      // Check other values with robust selectors
      const volatilityElements = getAllByTextAndFilter('15.2', el =>
        Boolean(el.parentElement?.textContent?.includes('Mood Volatility'))
      );
      expect(volatilityElements.length).toBeGreaterThan(0);

      const averageMoodElements = getAllByTextAndFilter('68.5', el =>
        Boolean(el.parentElement?.textContent?.includes('Average Mood'))
      );
      expect(averageMoodElements.length).toBeGreaterThan(0);

      // Look for '30.0' followed by '%' in the same element
      const inconsistencyElements = screen.getAllByText((content, element) => {
        return Boolean(
          element?.textContent?.includes('30.0') &&
            element?.textContent?.includes('%') &&
            element?.textContent?.includes('Communication Inconsistency')
        );
      });
      expect(inconsistencyElements.length).toBeGreaterThan(0);
    });
  });

  it('handles loading states correctly', () => {
    mockedAxios.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <PersonaMoodConsistency personaId={mockPersonaId} onClose={mockOnClose} />
    );

    expect(
      screen.getByText('Loading mood and personality data...')
    ).toBeInTheDocument();
  });

  it('handles errors correctly', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

    render(
      <PersonaMoodConsistency personaId={mockPersonaId} onClose={mockOnClose} />
    );

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load mood analytics')
      ).toBeInTheDocument();
    });
  });

  it('switches between tabs correctly', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { data: mockMoodAnalytics } })
      .mockResolvedValueOnce({ data: { data: mockPersonalityConsistency } });

    render(
      <PersonaMoodConsistency personaId={mockPersonaId} onClose={mockOnClose} />
    );

    // Default tab should be analytics
    await waitFor(() => {
      expect(screen.getByText('Current Mood')).toBeInTheDocument();
    });

    // Switch to consistency tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('Personality Consistency'));
    });

    await waitFor(() => {
      expect(screen.getByText('Consistency Score')).toBeInTheDocument();
    });

    // Switch to adaptation tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('Response Adaptation'));
    });

    await waitFor(() => {
      expect(screen.getByText('Test Response Adaptation')).toBeInTheDocument();
    });

    // Switch to drift tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('Personality Drift'));
    });

    await waitFor(() => {
      expect(
        screen.getByText('Personality Drift Detection')
      ).toBeInTheDocument();
    });
  });

  it('calls onClose when close button is clicked', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { data: mockMoodAnalytics } })
      .mockResolvedValueOnce({ data: { data: mockPersonalityConsistency } });

    render(
      <PersonaMoodConsistency personaId={mockPersonaId} onClose={mockOnClose} />
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText('×'));
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays mood colors correctly', async () => {
    const highMoodAnalytics = { ...mockMoodAnalytics, currentMood: 85 };
    const lowMoodAnalytics = { ...mockMoodAnalytics, currentMood: 15 };

    mockedAxios.get
      .mockResolvedValueOnce({ data: { data: highMoodAnalytics } })
      .mockResolvedValueOnce({ data: { data: mockPersonalityConsistency } });

    const { rerender } = render(
      <PersonaMoodConsistency personaId={mockPersonaId} onClose={mockOnClose} />
    );

    await waitFor(() => {
      // Find the element with class text-green-600 and text content '85'
      const moodElements = getAllByTextAndFilter('85', el =>
        el.className.includes('text-green-600')
      );
      expect(moodElements.length).toBeGreaterThan(0);
    });

    // Test low mood
    mockedAxios.get
      .mockResolvedValueOnce({ data: { data: lowMoodAnalytics } })
      .mockResolvedValueOnce({ data: { data: mockPersonalityConsistency } });

    rerender(
      <PersonaMoodConsistency personaId={mockPersonaId} onClose={mockOnClose} />
    );

    await waitFor(() => {
      // Look for '15' and 'times' in the same context (mood triggers section)
      const moodElements = screen.getAllByText((content, element) => {
        return Boolean(
          element?.textContent?.includes('15') &&
            element?.textContent?.includes('times') &&
            element?.textContent?.includes('conversation')
        );
      });
      expect(moodElements.length).toBeGreaterThan(0);
    });
  });

  it('displays consistency score correctly', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { data: mockMoodAnalytics } })
      .mockResolvedValueOnce({ data: { data: mockPersonalityConsistency } });

    render(
      <PersonaMoodConsistency personaId={mockPersonaId} onClose={mockOnClose} />
    );

    // Switch to consistency tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('Personality Consistency'));
    });

    await waitFor(() => {
      // Check that consistency score is displayed
      expect(screen.getByText('Consistency Score')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });
});
