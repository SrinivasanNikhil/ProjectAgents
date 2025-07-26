import { describe, it, expect, vi } from 'vitest';
import {
  detectUrls,
  getPlatformType,
  getPlatformConfig,
  validateUrl,
  generateLinkPreview,
  extractUrlInfo,
  shouldConvertToLinkMessage,
  extractFirstUrl,
  LinkPreview,
} from './linkUtils';

describe('linkUtils', () => {
  describe('detectUrls', () => {
    it('should detect URLs in text', () => {
      const text =
        'Check out this link: https://example.com and this one http://test.org';
      const urls = detectUrls(text);
      expect(urls).toEqual(['https://example.com', 'http://test.org']);
    });

    it('should return empty array for text without URLs', () => {
      const text = 'This is just regular text without any URLs';
      const urls = detectUrls(text);
      expect(urls).toEqual([]);
    });

    it('should handle URLs with query parameters', () => {
      const text = 'Visit https://example.com/path?param=value&other=123';
      const urls = detectUrls(text);
      expect(urls).toEqual(['https://example.com/path?param=value&other=123']);
    });
  });

  describe('getPlatformType', () => {
    it('should identify Figma URLs', () => {
      expect(getPlatformType('https://figma.com/file/abc123')).toBe('figma');
      expect(getPlatformType('https://www.figma.com/proto/def456')).toBe(
        'figma'
      );
      expect(getPlatformType('https://figma.com/design/ghi789')).toBe('figma');
    });

    it('should identify GitHub URLs', () => {
      expect(getPlatformType('https://github.com/user/repo')).toBe('github');
      expect(getPlatformType('https://www.github.com/org/project')).toBe(
        'github'
      );
    });

    it('should identify Google Docs URLs', () => {
      expect(getPlatformType('https://docs.google.com/document/d/abc123')).toBe(
        'google-docs'
      );
      expect(
        getPlatformType('https://docs.google.com/spreadsheets/d/def456')
      ).toBe('google-docs');
      expect(
        getPlatformType('https://docs.google.com/presentation/d/ghi789')
      ).toBe('google-docs');
    });

    it('should identify Notion URLs', () => {
      expect(getPlatformType('https://notion.so/page123')).toBe('notion');
      expect(getPlatformType('https://www.notion.so/workspace')).toBe('notion');
    });

    it('should identify Slack URLs', () => {
      expect(
        getPlatformType('https://workspace.slack.com/archives/CHANNEL123')
      ).toBe('slack');
    });

    it('should identify Discord URLs', () => {
      expect(getPlatformType('https://discord.com/channels/123/456')).toBe(
        'discord'
      );
      expect(getPlatformType('https://www.discord.com/channels/789/012')).toBe(
        'discord'
      );
    });

    it('should return other for unknown platforms', () => {
      expect(getPlatformType('https://example.com')).toBe('other');
      expect(getPlatformType('https://random-site.org/path')).toBe('other');
    });
  });

  describe('getPlatformConfig', () => {
    it('should return correct config for known platforms', () => {
      const figmaConfig = getPlatformConfig('figma');
      expect(figmaConfig.icon).toBe('🎨');
      expect(figmaConfig.color).toBe('#F24E1E');
      expect(figmaConfig.name).toBe('Figma');

      const githubConfig = getPlatformConfig('github');
      expect(githubConfig.icon).toBe('🐙');
      expect(githubConfig.color).toBe('#181717');
      expect(githubConfig.name).toBe('GitHub');
    });

    it('should return default config for other platforms', () => {
      const otherConfig = getPlatformConfig('other');
      expect(otherConfig.icon).toBe('🔗');
      expect(otherConfig.color).toBe('#6B7280');
      expect(otherConfig.name).toBe('External Link');
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      expect(validateUrl('https://example.com')).toEqual({ isValid: true });
      expect(validateUrl('http://test.org/path')).toEqual({ isValid: true });
      expect(validateUrl('https://www.google.com/search?q=test')).toEqual({
        isValid: true,
      });
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('not-a-url')).toEqual({
        isValid: false,
        error: 'Invalid URL format',
      });
      expect(validateUrl('not-a-valid-url-at-all')).toEqual({
        isValid: false,
        error: 'Invalid URL format',
      });
    });

    it('should reject malicious protocols', () => {
      expect(validateUrl('javascript:alert("xss")')).toEqual({
        isValid: false,
        error: 'Invalid protocol',
      });
      expect(
        validateUrl('data:text/html,<script>alert("xss")</script>')
      ).toEqual({ isValid: false, error: 'Invalid protocol' });
      expect(validateUrl('vbscript:msgbox("test")')).toEqual({
        isValid: false,
        error: 'Invalid protocol',
      });
      expect(validateUrl('file:///etc/passwd')).toEqual({
        isValid: false,
        error: 'Invalid protocol',
      });
    });

    it('should reject localhost URLs', () => {
      expect(validateUrl('http://localhost:3000')).toEqual({
        isValid: false,
        error: 'Local URLs are not allowed',
      });
      expect(validateUrl('http://127.0.0.1')).toEqual({
        isValid: false,
        error: 'Local URLs are not allowed',
      });
      expect(validateUrl('http://192.168.1.1')).toEqual({
        isValid: false,
        error: 'Local URLs are not allowed',
      });
      expect(validateUrl('http://10.0.0.1')).toEqual({
        isValid: false,
        error: 'Local URLs are not allowed',
      });
      expect(validateUrl('http://172.16.0.1')).toEqual({
        isValid: false,
        error: 'Local URLs are not allowed',
      });
    });
  });

  describe('generateLinkPreview', () => {
    it('should generate preview for Figma URLs', async () => {
      const preview = await generateLinkPreview(
        'https://figma.com/file/abc123'
      );
      expect(preview).toEqual({
        url: 'https://figma.com/file/abc123',
        title: 'Figma',
        description: 'Link to Figma',
        type: 'figma',
        icon: '🎨',
        color: '#F24E1E',
        siteName: 'Figma',
      });
    });

    it('should generate preview for GitHub URLs', async () => {
      const preview = await generateLinkPreview('https://github.com/user/repo');
      expect(preview).toEqual({
        url: 'https://github.com/user/repo',
        title: 'GitHub',
        description: 'Link to GitHub',
        type: 'github',
        icon: '🐙',
        color: '#181717',
        siteName: 'GitHub',
      });
    });

    it('should generate preview for unknown URLs', async () => {
      const preview = await generateLinkPreview('https://example.com');
      expect(preview).toEqual({
        url: 'https://example.com',
        title: 'example.com',
        description: 'Link to External Link',
        type: 'other',
        icon: '🔗',
        color: '#6B7280',
        siteName: 'example.com',
      });
    });
  });

  describe('extractUrlInfo', () => {
    it('should extract info from Figma URLs', () => {
      const info = extractUrlInfo('https://figma.com/file/abc123');
      expect(info.title).toBe('Figma file');
      expect(info.description).toBe('Design file: abc123');
    });

    it('should extract info from GitHub URLs', () => {
      const info = extractUrlInfo('https://github.com/user/repo');
      expect(info.title).toBe('user/repo');
      expect(info.description).toBe('GitHub repository');
    });

    it('should extract info from Google Docs URLs', () => {
      const info = extractUrlInfo('https://docs.google.com/document/d/abc123');
      expect(info.title).toBe('Google Document');
      expect(info.description).toBe('Document ID: abc123');
    });

    it('should extract info from unknown URLs', () => {
      const info = extractUrlInfo('https://example.com/path');
      expect(info.title).toBe('example.com');
      expect(info.description).toBe('/path');
    });

    it('should handle invalid URLs gracefully', () => {
      const info = extractUrlInfo('not-a-url');
      expect(info.title).toBe('External Link');
      expect(info.description).toBe('not-a-url');
    });
  });

  describe('shouldConvertToLinkMessage', () => {
    it('should return true for URL-only messages', () => {
      expect(shouldConvertToLinkMessage('https://example.com')).toBe(true);
      expect(shouldConvertToLinkMessage(' https://example.com ')).toBe(true);
      expect(shouldConvertToLinkMessage('https://example.com ')).toBe(true);
      expect(shouldConvertToLinkMessage(' https://example.com')).toBe(true);
    });

    it('should return false for messages with text and URLs', () => {
      expect(
        shouldConvertToLinkMessage('Check this out: https://example.com')
      ).toBe(false);
      expect(
        shouldConvertToLinkMessage('https://example.com is a great site')
      ).toBe(false);
    });

    it('should return false for messages without URLs', () => {
      expect(shouldConvertToLinkMessage('Just regular text')).toBe(false);
      expect(shouldConvertToLinkMessage('')).toBe(false);
    });
  });

  describe('extractFirstUrl', () => {
    it('should extract the first URL from text', () => {
      expect(
        extractFirstUrl('Check https://first.com and https://second.com')
      ).toBe('https://first.com');
      expect(extractFirstUrl('https://only-one.com')).toBe(
        'https://only-one.com'
      );
    });

    it('should return null for text without URLs', () => {
      expect(extractFirstUrl('No URLs here')).toBe(null);
      expect(extractFirstUrl('')).toBe(null);
    });
  });
});
