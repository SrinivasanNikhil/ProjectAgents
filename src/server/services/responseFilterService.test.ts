import { describe, it, expect } from 'vitest';
import { responseFilterService } from './responseFilterService';
import { PersonaResponseRequest, PersonaResponseResponse } from '../config/ai';

const baseRequest: PersonaResponseRequest = {
  personaId: 'pid',
  personaContext: {
    name: 'Alex Client',
    role: 'Product Manager',
    background: 'Background',
    personality: {
      traits: ['analytical'],
      communicationStyle: 'formal',
      decisionMakingStyle: 'analytical',
      priorities: ['quality'],
      goals: ['launch']
    },
    currentMood: 70,
    conversationHistory: [],
    projectKnowledge: ['ecommerce', 'checkout']
  },
  userMessage: 'Can you review our checkout flow and suggest improvements?',
  conversationContext: {
    projectId: 'proj',
    previousMessages: []
  },
  constraints: { maxResponseLength: 120 }
};

const baseAIResp = (content: string): PersonaResponseResponse => ({
  content,
  confidence: 0.8,
  metadata: { responseTime: 200, model: 'gpt-4', tokensUsed: 100 }
});

describe('responseFilterService', () => {
  it('sanitizes boilerplate phrases', () => {
    const ai = baseAIResp('As an AI language model, I cannot browse. Here are suggestions.');
    const { response, diagnostics } = responseFilterService.applyResponseFilters(baseRequest, ai);
    expect(response.content.toLowerCase()).not.toContain('as an ai language model');
    expect(diagnostics.wasModified).toBe(true);
    expect(diagnostics.reasons.join(' ')).toMatch(/Removed boilerplate/i);
  });

  it('respects maxResponseLength by trimming at sentence boundary when possible', () => {
    const long = 'This is a long sentence about the checkout flow. It contains several details that might exceed the limit. Additional text that should be trimmed.';
    const { response, diagnostics } = responseFilterService.applyResponseFilters(baseRequest, baseAIResp(long));
    expect(response.content.length).toBeLessThanOrEqual(baseRequest.constraints!.maxResponseLength! + 1);
    expect(diagnostics.wasModified).toBe(true);
    expect(diagnostics.reasons.join(' ')).toMatch(/Trimmed to respect/);
  });

  it('computes reasonable relevance score', () => {
    const { diagnostics } = responseFilterService.applyResponseFilters(
      baseRequest,
      baseAIResp('Improvements for checkout: streamline payment, validate forms, reduce steps.')
    );
    expect(diagnostics.relevanceScore).toBeGreaterThan(0);
    expect(diagnostics.qualityScore).toBeGreaterThan(0);
  });

  it('penalizes very short responses', () => {
    const { diagnostics } = responseFilterService.applyResponseFilters(baseRequest, baseAIResp('Okay.'));
    expect(diagnostics.qualityScore).toBeLessThan(1);
  });
});