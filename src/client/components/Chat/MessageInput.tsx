import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  detectUrls,
  validateUrl,
  shouldConvertToLinkMessage,
  extractFirstUrl,
  generateLinkPreview,
  extractUrlInfo,
} from '../../utils/linkUtils';
import './MessageInput.css';

export interface MessageInputProps {
  onSendMessage: (message: string, type?: string, metadata?: any) => void;
  onTypingChange: (isTyping: boolean) => void;
  onFileUpload?: (
    file: File
  ) => Promise<{ success: boolean; artifactId?: string; error?: string }>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  projectId?: string;
  authToken?: string;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

interface LinkPreviewState {
  url: string;
  title: string;
  description?: string;
  icon: string;
  color: string;
  isLoading: boolean;
  error?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTypingChange,
  onFileUpload,
  disabled = false,
  placeholder = 'Type your message...',
  className = '',
  projectId,
  authToken,
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [linkPreview, setLinkPreview] = useState<LinkPreviewState | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Handle typing state
  useEffect(() => {
    const hasContent = message.trim().length > 0;
    if (hasContent !== isTyping) {
      setIsTyping(hasContent);
      onTypingChange(hasContent);
    }
  }, [message, isTyping, onTypingChange]);

  // Auto-detect links in message
  useEffect(() => {
    const urls = detectUrls(message);
    if (urls.length > 0 && shouldConvertToLinkMessage(message)) {
      const url = extractFirstUrl(message);
      if (url) {
        generateLinkPreviewForUrl(url);
      }
    } else {
      setLinkPreview(null);
    }
  }, [message]);

  const generateLinkPreviewForUrl = async (url: string) => {
    const validation = validateUrl(url);
    if (!validation.isValid) {
      setLinkPreview({
        url,
        title: 'Invalid URL',
        description: validation.error,
        icon: '⚠️',
        color: '#EF4444',
        isLoading: false,
        error: validation.error,
      });
      return;
    }

    setLinkPreview({
      url,
      title: 'Loading...',
      description: 'Generating preview...',
      icon: '⏳',
      color: '#6B7280',
      isLoading: true,
    });

    try {
      const preview = await generateLinkPreview(url);
      const urlInfo = extractUrlInfo(url);

      setLinkPreview({
        url,
        title: urlInfo.title,
        description: urlInfo.description,
        icon: preview.icon,
        color: preview.color,
        isLoading: false,
      });
    } catch (error) {
      setLinkPreview({
        url,
        title: 'Error',
        description: 'Failed to generate preview',
        icon: '❌',
        color: '#EF4444',
        isLoading: false,
        error: 'Preview generation failed',
      });
    }
  };

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      const urls = detectUrls(message);

      if (urls.length > 0 && shouldConvertToLinkMessage(message)) {
        // Convert to link message
        const url = extractFirstUrl(message);
        if (url) {
          const urlInfo = extractUrlInfo(url);
          onSendMessage(url, 'link', {
            url,
            linkTitle: urlInfo.title,
            linkDescription: urlInfo.description,
          });
        }
      } else {
        // Regular text message
        onSendMessage(message.trim());
      }

      setMessage('');
      setLinkPreview(null);

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  // File validation
  const validateFile = (file: File): string | null => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed',
    ];

    if (file.size > maxSize) {
      return 'File size must be less than 50MB';
    }

    if (!allowedTypes.includes(file.type)) {
      return 'File type not supported';
    }

    return null;
  };

  const handleFileUpload = useCallback(
    async (files: FileList | File[]) => {
      if (!onFileUpload) return;

      const fileArray = Array.from(files);
      const validFiles: File[] = [];
      const errors: string[] = [];

      // Validate files
      fileArray.forEach(file => {
        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name}: ${error}`);
        } else {
          validFiles.push(file);
        }
      });

      if (errors.length > 0) {
        alert(`Upload errors:\n${errors.join('\n')}`);
        return;
      }

      if (validFiles.length === 0) return;

      setIsUploading(true);

      // Add files to progress tracking
      const newUploads: UploadProgress[] = validFiles.map(file => ({
        file,
        progress: 0,
        status: 'uploading',
      }));

      setUploadProgress(prev => [...prev, ...newUploads]);

      // Upload each file
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const uploadIndex = uploadProgress.length + i;

        try {
          // Simulate upload progress
          const progressInterval = setInterval(() => {
            setUploadProgress(prev =>
              prev.map((upload, index) =>
                index === uploadIndex
                  ? { ...upload, progress: Math.min(upload.progress + 10, 90) }
                  : upload
              )
            );
          }, 100);

          const result = await onFileUpload(file);

          clearInterval(progressInterval);

          if (result.success && result.artifactId) {
            setUploadProgress(prev =>
              prev.map((upload, index) =>
                index === uploadIndex
                  ? { ...upload, progress: 100, status: 'success' }
                  : upload
              )
            );

            // Send file message
            onSendMessage(file.name, 'file', {
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              artifactId: result.artifactId,
            });
          } else {
            setUploadProgress(prev =>
              prev.map((upload, index) =>
                index === uploadIndex
                  ? {
                      ...upload,
                      status: 'error',
                      error: result.error || 'Upload failed',
                    }
                  : upload
              )
            );
          }
        } catch (error) {
          setUploadProgress(prev =>
            prev.map((upload, index) =>
              index === uploadIndex
                ? { ...upload, status: 'error', error: 'Upload failed' }
                : upload
            )
          );
        }
      }

      setIsUploading(false);
    },
    [onFileUpload, uploadProgress.length]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFileUpload(files);
    }
    // Reset input
    e.target.value = '';
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileUpload(files);
      }
    },
    [handleFileUpload]
  );

  const handleLinkShare = () => {
    setShowLinkModal(true);
  };

  const handleLinkModalSubmit = (url: string) => {
    if (url.trim()) {
      const validation = validateUrl(url);
      if (validation.isValid) {
        const urlInfo = extractUrlInfo(url);
        onSendMessage(url, 'link', {
          url,
          linkTitle: urlInfo.title,
          linkDescription: urlInfo.description,
        });
        setShowLinkModal(false);
      } else {
        alert(`Invalid URL: ${validation.error}`);
      }
    }
  };

  const removeUpload = (index: number) => {
    setUploadProgress(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      className={`message-input-container ${className} ${isDragging ? 'dragging' : ''}`}
      ref={dropZoneRef}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="upload-progress">
          {uploadProgress.map((upload, index) => (
            <div key={index} className={`upload-item ${upload.status}`}>
              <div className="upload-info">
                <span className="upload-name">{upload.file.name}</span>
                <span className="upload-size">
                  ({(upload.file.size / 1024 / 1024).toFixed(1)}MB)
                </span>
              </div>
              <div className="upload-status">
                {upload.status === 'uploading' && (
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
                {upload.status === 'success' && (
                  <span className="status-success">✓ Uploaded</span>
                )}
                {upload.status === 'error' && (
                  <span className="status-error">✗ {upload.error}</span>
                )}
              </div>
              <button
                type="button"
                className="remove-upload"
                onClick={() => removeUpload(index)}
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Link Preview */}
      {linkPreview && (
        <div
          className="link-preview"
          style={{ borderLeftColor: linkPreview.color }}
        >
          <div className="link-preview-icon">{linkPreview.icon}</div>
          <div className="link-preview-content">
            <div className="link-preview-title">{linkPreview.title}</div>
            {linkPreview.description && (
              <div className="link-preview-description">
                {linkPreview.description}
              </div>
            )}
            <div className="link-preview-url">{linkPreview.url}</div>
          </div>
          <button
            type="button"
            className="remove-link-preview"
            onClick={() => setLinkPreview(null)}
            title="Remove preview"
          >
            ×
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="message-toolbar">
        <button
          type="button"
          className="toolbar-button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          title="Attach file"
        >
          📎
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={handleLinkShare}
          disabled={disabled}
          title="Share link"
        >
          🔗
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        accept="image/*,.pdf,.doc,.docx,.txt,.zip"
        multiple
      />

      {/* Message input */}
      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={isUploading ? 'Uploading files...' : placeholder}
          disabled={disabled || isUploading}
          className="message-textarea"
          rows={1}
          maxLength={1000}
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !message.trim() || isUploading}
          className="send-button"
          title="Send message (Enter)"
          data-testid="send-button"
        >
          ➤
        </button>
      </div>

      {/* Character count */}
      {message.length > 0 && (
        <div className="character-count">{message.length}/1000</div>
      )}

      {/* Drag and drop overlay */}
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-message">
            <span className="drag-icon">📎</span>
            <span>Drop files here to upload</span>
          </div>
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <LinkModal
          onSubmit={handleLinkModalSubmit}
          onCancel={() => setShowLinkModal(false)}
        />
      )}
    </div>
  );
};

// Link Modal Component
interface LinkModalProps {
  onSubmit: (url: string) => void;
  onCancel: () => void;
}

const LinkModal: React.FC<LinkModalProps> = ({ onSubmit, onCancel }) => {
  const [url, setUrl] = useState('');
  const [isValid, setIsValid] = useState(false);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    setIsValid(validateUrl(value).isValid);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onSubmit(url);
    }
  };

  return (
    <div className="link-modal-overlay">
      <div className="link-modal">
        <h3>Share Link</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="url"
            value={url}
            onChange={handleUrlChange}
            placeholder="Enter URL to share..."
            className="link-input"
            autoFocus
          />
          <div className="link-modal-buttons">
            <button type="button" onClick={onCancel} className="cancel-button">
              Cancel
            </button>
            <button type="submit" disabled={!isValid} className="submit-button">
              Share
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MessageInput;
