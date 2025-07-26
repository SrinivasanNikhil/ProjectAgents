export interface LinkPreview {
  url: string;
  title: string;
  description?: string;
  image?: string;
  siteName?: string;
  type:
    | 'figma'
    | 'github'
    | 'google-docs'
    | 'notion'
    | 'slack'
    | 'discord'
    | 'other';
  icon: string;
  color: string;
}

export interface LinkMetadata {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

// URL patterns for different platforms
const PLATFORM_PATTERNS = {
  figma: /^https?:\/\/(www\.)?figma\.com\/(file|proto|design)\/[a-zA-Z0-9-]+/i,
  github: /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+/i,
  'google-docs':
    /^https?:\/\/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/[a-zA-Z0-9-_]+/i,
  notion: /^https?:\/\/(www\.)?notion\.so\/[a-zA-Z0-9-]+/i,
  slack: /^https?:\/\/[a-zA-Z0-9-]+\.slack\.com\/archives\/[A-Z0-9]+/i,
  discord: /^https?:\/\/(www\.)?discord\.com\/channels\/[0-9]+\/[0-9]+/i,
  miro: /^https?:\/\/(www\.)?miro\.com\/app\/board\/[a-zA-Z0-9-]+/i,
  trello: /^https?:\/\/(www\.)?trello\.com\/[bc]\/[a-zA-Z0-9-]+/i,
  jira: /^https?:\/\/[a-zA-Z0-9-]+\.atlassian\.net\/browse\/[A-Z]+-[0-9]+/i,
  confluence:
    /^https?:\/\/[a-zA-Z0-9-]+\.atlassian\.net\/wiki\/spaces\/[A-Z]+/i,
  linear:
    /^https?:\/\/(www\.)?linear\.app\/[a-zA-Z0-9-]+\/issue\/[A-Z]+-[0-9]+/i,
  asana: /^https?:\/\/app\.asana\.com\/0\/[0-9]+\/[0-9]+/i,
};

// Platform configurations
const PLATFORM_CONFIGS = {
  figma: {
    icon: '🎨',
    color: '#F24E1E',
    name: 'Figma',
  },
  github: {
    icon: '🐙',
    color: '#181717',
    name: 'GitHub',
  },
  'google-docs': {
    icon: '📄',
    color: '#4285F4',
    name: 'Google Docs',
  },
  notion: {
    icon: '📝',
    color: '#000000',
    name: 'Notion',
  },
  slack: {
    icon: '💬',
    color: '#4A154B',
    name: 'Slack',
  },
  discord: {
    icon: '🎮',
    color: '#5865F2',
    name: 'Discord',
  },
  miro: {
    icon: '🖼️',
    color: '#FFD02F',
    name: 'Miro',
  },
  trello: {
    icon: '📋',
    color: '#0079BF',
    name: 'Trello',
  },
  jira: {
    icon: '🐛',
    color: '#0052CC',
    name: 'Jira',
  },
  confluence: {
    icon: '📚',
    color: '#172B4D',
    name: 'Confluence',
  },
  linear: {
    icon: '📈',
    color: '#5E6AD2',
    name: 'Linear',
  },
  asana: {
    icon: '✅',
    color: '#F06A6A',
    name: 'Asana',
  },
};

// Generic URL regex pattern
const URL_PATTERN =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

/**
 * Detect URLs in text and return them as an array
 */
export const detectUrls = (text: string): string[] => {
  const matches = text.match(URL_PATTERN);
  return matches || [];
};

/**
 * Check if a URL is from a supported platform
 */
export const getPlatformType = (
  url: string
): keyof typeof PLATFORM_PATTERNS | 'other' => {
  for (const [platform, pattern] of Object.entries(PLATFORM_PATTERNS)) {
    if (pattern.test(url)) {
      return platform as keyof typeof PLATFORM_PATTERNS;
    }
  }
  return 'other';
};

/**
 * Get platform configuration
 */
export const getPlatformConfig = (
  platform: keyof typeof PLATFORM_PATTERNS | 'other'
) => {
  if (platform === 'other') {
    return {
      icon: '🔗',
      color: '#6B7280',
      name: 'External Link',
    };
  }
  return PLATFORM_CONFIGS[platform];
};

/**
 * Validate URL format and security
 */
export const validateUrl = (
  url: string
): { isValid: boolean; error?: string } => {
  try {
    const urlObj = new URL(url);

    // Check for common malicious patterns
    const suspiciousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /file:/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(urlObj.protocol)) {
        return { isValid: false, error: 'Invalid protocol' };
      }
    }

    // Check for localhost or private IP addresses
    if (
      urlObj.hostname === 'localhost' ||
      urlObj.hostname.startsWith('127.') ||
      urlObj.hostname.startsWith('192.168.') ||
      urlObj.hostname.startsWith('10.') ||
      urlObj.hostname.startsWith('172.')
    ) {
      return { isValid: false, error: 'Local URLs are not allowed' };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
};

/**
 * Generate a link preview by fetching metadata
 */
export const generateLinkPreview = async (
  url: string
): Promise<LinkPreview> => {
  const platform = getPlatformType(url);
  const config = getPlatformConfig(platform);

  // For now, return basic preview - in production, you'd fetch metadata
  const preview: LinkPreview = {
    url,
    title: config.name,
    description: `Link to ${config.name}`,
    type: platform as any,
    icon: config.icon,
    color: config.color,
    siteName: config.name,
  };

  // Try to fetch metadata if it's not a known platform
  if (platform === 'other') {
    try {
      const metadata = await fetchLinkMetadata(url);
      if (metadata.title) {
        preview.title = metadata.title;
      }
      if (metadata.description) {
        preview.description = metadata.description;
      }
      if (metadata.image) {
        preview.image = metadata.image;
      }
      if (metadata.siteName) {
        preview.siteName = metadata.siteName;
      }
    } catch (error) {
      console.warn('Failed to fetch link metadata:', error);
    }
  }

  return preview;
};

/**
 * Fetch metadata from a URL (simplified version)
 */
const fetchLinkMetadata = async (url: string): Promise<LinkMetadata> => {
  // In a real implementation, you'd make a server-side request to fetch metadata
  // For now, return basic info
  try {
    const urlObj = new URL(url);
    return {
      url,
      title: urlObj.hostname,
      siteName: urlObj.hostname,
    };
  } catch {
    return { url };
  }
};

/**
 * Extract meaningful information from URLs for different platforms
 */
export const extractUrlInfo = (
  url: string
): { title: string; description?: string } => {
  const platform = getPlatformType(url);

  try {
    const urlObj = new URL(url);

    switch (platform) {
      case 'figma':
        const figmaMatch = url.match(
          /figma\.com\/(file|proto|design)\/([a-zA-Z0-9-]+)/
        );
        if (figmaMatch) {
          return {
            title: `Figma ${figmaMatch[1]}`,
            description: `Design file: ${figmaMatch[2]}`,
          };
        }
        break;

      case 'github':
        const githubMatch = url.match(
          /github\.com\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9-]+)/
        );
        if (githubMatch) {
          return {
            title: `${githubMatch[1]}/${githubMatch[2]}`,
            description: 'GitHub repository',
          };
        }
        break;

      case 'google-docs':
        const docsMatch = url.match(
          /docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9-_]+)/
        );
        if (docsMatch) {
          const docType =
            docsMatch[1] === 'document'
              ? 'Document'
              : docsMatch[1] === 'spreadsheets'
                ? 'Spreadsheet'
                : 'Presentation';
          return {
            title: `Google ${docType}`,
            description: `Document ID: ${docsMatch[2]}`,
          };
        }
        break;

      case 'notion':
        return {
          title: 'Notion Page',
          description: 'Notion workspace page',
        };

      case 'slack':
        return {
          title: 'Slack Message',
          description: 'Slack channel message',
        };

      case 'discord':
        return {
          title: 'Discord Message',
          description: 'Discord channel message',
        };

      default:
        return {
          title: urlObj.hostname,
          description: urlObj.pathname,
        };
    }
  } catch {
    // Fallback for invalid URLs
  }

  return {
    title: 'External Link',
    description: url,
  };
};

/**
 * Check if text contains URLs that should be converted to link messages
 */
export const shouldConvertToLinkMessage = (text: string): boolean => {
  const urls = detectUrls(text);
  if (urls.length === 0) return false;

  // If the text is just a URL (with or without whitespace), convert it
  const trimmedText = text.trim();
  return urls.some(url => {
    const urlOnly = trimmedText === url;
    const urlWithWhitespace =
      trimmedText === ` ${url} ` ||
      trimmedText === `${url} ` ||
      trimmedText === ` ${url}`;
    return urlOnly || urlWithWhitespace;
  });
};

/**
 * Extract the first URL from text
 */
export const extractFirstUrl = (text: string): string | null => {
  const urls = detectUrls(text);
  return urls.length > 0 ? urls[0] : null;
};
