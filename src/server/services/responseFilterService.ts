import { PersonaResponseRequest, PersonaResponseResponse } from '../config/ai';

export interface ResponseFilterDiagnostics {
  qualityScore: number; // 0..1
  relevanceScore: number; // 0..1
  lengthScore: number; // 0..1
  wasModified: boolean;
  reasons: string[];
  warnings: string[];
}

class ResponseFilterService {
  private badPhrases: string[] = [
    'as an ai language model',
    'i cannot browse the internet',
    'i do not have access to real-time data',
  ];

  analyzeRelevance(userMessage: string, responseText: string): number {
    const tokenize = (t: string) =>
      t
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2);

    const stopwords = new Set([
      'the','and','for','are','but','not','you','your','with','from','that','this','have','has','was','were','will','would','could','should','can','into','about','over','under','between','after','before','what','when','where','which','who','whom','why','how','does','did','done','doing','been','being','our','their','them','they','we','she','he','his','her','its','it','on','in','at','to','of','a','an'
    ]);

    const userTokens = tokenize(userMessage).filter(w => !stopwords.has(w));
    const respTokens = tokenize(responseText).filter(w => !stopwords.has(w));

    if (userTokens.length === 0 || respTokens.length === 0) return 0;

    const userSet = new Set(userTokens);
    let overlap = 0;
    for (const tok of respTokens) {
      if (userSet.has(tok)) overlap++;
    }

    // Jaccard-like score with smoothing
    const score = overlap / (userSet.size + respTokens.length - overlap + 1);
    return Math.max(0, Math.min(1, score));
  }

  analyzeQuality(responseText: string): { score: number; reasons: string[]; warnings: string[] } {
    const reasons: string[] = [];
    const warnings: string[] = [];

    // Penalize boilerplate/disclaimer phrases
    let score = 1;
    const lower = responseText.toLowerCase();

    for (const bad of this.badPhrases) {
      if (lower.includes(bad)) {
        score -= 0.2;
        reasons.push(`Removed boilerplate: "${bad}"`);
      }
    }

    // Basic fluency heuristic: presence of sentences and punctuation
    const sentenceCount = (responseText.match(/[.!?]/g) || []).length;
    if (sentenceCount < 1 && responseText.trim().length > 0) {
      score -= 0.2;
      warnings.push('Low sentence punctuation detected');
    }

    // Overuse of ALL CAPS
    const capsWords = (responseText.match(/\b[A-Z]{4,}\b/g) || []).length;
    if (capsWords > 3) {
      score -= 0.1;
      warnings.push('Excessive capitalization');
    }

    // Extremely short responses are low quality
    if (responseText.trim().length < 10) {
      score -= 0.3;
      reasons.push('Response too short');
    }

    // Clamp
    score = Math.max(0, Math.min(1, score));

    return { score, reasons, warnings };
  }

  applyLengthConstraint(text: string, maxLength?: number): { text: string; trimmed: boolean } {
    if (!maxLength || maxLength <= 0) return { text, trimmed: false };
    if (text.length <= maxLength) return { text, trimmed: false };

    // Try to trim at sentence boundary before hard cut
    const slice = text.slice(0, maxLength);
    const lastPunct = Math.max(slice.lastIndexOf('.'), slice.lastIndexOf('!'), slice.lastIndexOf('?'));
    if (lastPunct > maxLength * 0.6) {
      return { text: slice.slice(0, lastPunct + 1), trimmed: true };
    }
    return { text: slice + '…', trimmed: true };
  }

  sanitize(text: string): { text: string; modified: boolean; reasons: string[] } {
    let modified = false;
    const reasons: string[] = [];
    let out = text;

    for (const bad of this.badPhrases) {
      const rx = new RegExp(bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
      if (rx.test(out)) {
        out = out.replace(rx, '').replace(/\s{2,}/g, ' ').trim();
        modified = true;
        reasons.push(`Removed boilerplate: "${bad}"`);
      }
    }

    return { text: out, modified, reasons };
  }

  applyResponseFilters(
    request: PersonaResponseRequest,
    aiResponse: PersonaResponseResponse
  ): { response: PersonaResponseResponse; diagnostics: ResponseFilterDiagnostics } {
    const reasons: string[] = [];
    const warnings: string[] = [];

    // Sanitize boilerplate
    const sanitized = this.sanitize(aiResponse.content);

    // Enforce max length if provided
    const { text: lengthApplied, trimmed } = this.applyLengthConstraint(
      sanitized.text,
      request.constraints?.maxResponseLength
    );

    if (sanitized.modified) reasons.push(...sanitized.reasons);
    if (trimmed) reasons.push('Trimmed to respect maxResponseLength');

    const relevanceScore = this.analyzeRelevance(
      request.userMessage,
      lengthApplied
    );

    const quality = this.analyzeQuality(lengthApplied);
    reasons.push(...quality.reasons);
    warnings.push(...quality.warnings);

    const response: PersonaResponseResponse = {
      ...aiResponse,
      content: lengthApplied,
    };

    const diagnostics: ResponseFilterDiagnostics = {
      qualityScore: quality.score,
      relevanceScore,
      lengthScore: request.constraints?.maxResponseLength
        ? Math.min(1, lengthApplied.length / Math.max(1, request.constraints.maxResponseLength))
        : 1,
      wasModified: sanitized.modified || trimmed,
      reasons,
      warnings,
    };

    return { response, diagnostics };
  }
}

export const responseFilterService = new ResponseFilterService();