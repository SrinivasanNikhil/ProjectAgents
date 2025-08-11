import crypto from 'crypto';

export interface CachedPersonaResponse {
  content: string;
  moodChange?: {
    value: number;
    reason: string;
  };
  suggestedActions?: string[];
  confidence: number;
  metadata: {
    responseTime: number;
    model: string;
    tokensUsed: number;
  };
}

interface CacheEntry {
  key: string;
  value: CachedPersonaResponse;
  expiresAt: number;
}

/**
 * Simple in-memory LRU cache with TTL semantics for AI persona responses
 */
export class AICacheService {
  private cache: Map<string, CacheEntry>;
  private maxEntries: number;
  private ttlMs: number;

  constructor(options?: { maxEntries?: number; ttlMs?: number }) {
    this.maxEntries = options?.maxEntries ?? parseInt(process.env.AI_CACHE_MAX_ENTRIES || '500');
    this.ttlMs = options?.ttlMs ?? parseInt(process.env.AI_CACHE_TTL_MS || `${15 * 60 * 1000}`); // default 15 minutes
    this.cache = new Map();
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      ttlMs: this.ttlMs,
    };
  }

  /**
   * Build a deterministic cache key for persona responses.
   * Key is a SHA256 of a normalized request payload and AI config.
   */
  buildPersonaResponseKey(input: {
    personaId: string;
    projectId: string;
    userMessage: string;
    previousMessages: { sender: string; content: string }[];
    constraints?: Record<string, unknown>;
    aiConfig?: { model?: string; temperature?: number; maxTokens?: number; systemPrompt?: string };
  }): string {
    const normalized = {
      personaId: input.personaId,
      projectId: input.projectId,
      userMessage: input.userMessage.trim(),
      // Only include last 10 messages to bound key size and match context window defaults
      previousMessages: input.previousMessages.slice(-10).map(m => ({ s: m.sender, c: m.content })),
      constraints: input.constraints ?? {},
      ai: {
        model: input.aiConfig?.model ?? 'gpt-4',
        temperature: input.aiConfig?.temperature ?? 0.7,
        maxTokens: input.aiConfig?.maxTokens ?? 1000,
        // Exclude systemPrompt content to avoid giant keys; presence/absence affects style but not idempotency much
      },
    };

    const json = JSON.stringify(normalized);
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  get(key: string): CachedPersonaResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // TTL check
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Touch for LRU: delete and re-set to move to end
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: CachedPersonaResponse): void {
    const entry: CacheEntry = {
      key,
      value,
      expiresAt: Date.now() + this.ttlMs,
    };

    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, entry);

    // Evict least-recently-used if over capacity
    if (this.cache.size > this.maxEntries) {
      const oldestKey = this.cache.keys().next().value as string | undefined;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }
}

export const aiCacheService = new AICacheService();