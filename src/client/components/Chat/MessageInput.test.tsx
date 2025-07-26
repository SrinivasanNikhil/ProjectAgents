import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import MessageInput from './MessageInput';

// Mock fetch
global.fetch = vi.fn();

describe('MessageInput', () => {
  const defaultProps = {
    onSendMessage: vi.fn(),
    onTypingChange: vi.fn(),
    projectId: 'project-123',
    authToken: 'token-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  describe('Basic functionality', () => {
    it('renders message input with toolbar', () => {
      render(<MessageInput {...defaultProps} />);

      expect(
        screen.getByPlaceholderText('Type your message...')
      ).toBeInTheDocument();
      expect(screen.getByTitle('Attach file')).toBeInTheDocument();
      expect(screen.getByTitle('Share link')).toBeInTheDocument();
      expect(screen.getByTitle('Send message (Enter)')).toBeInTheDocument();
    });

    it('sends text message on submit', () => {
      render(<MessageInput {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByTitle('Send message (Enter)');

      fireEvent.change(textarea, { target: { value: 'Hello world' } });
      fireEvent.click(sendButton);

      expect(defaultProps.onSendMessage).toHaveBeenCalledWith('Hello world');
      expect(textarea).toHaveValue('');
    });

    it('sends message on Enter key', () => {
      render(<MessageInput {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Type your message...');

      fireEvent.change(textarea, { target: { value: 'Hello world' } });
      fireEvent.keyDown(textarea, { key: 'Enter' });

      expect(defaultProps.onSendMessage).toHaveBeenCalledWith('Hello world');
    });

    it('does not send message on Shift+Enter', () => {
      render(<MessageInput {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Type your message...');

      fireEvent.change(textarea, { target: { value: 'Hello world' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      expect(defaultProps.onSendMessage).not.toHaveBeenCalled();
    });

    it('shows character count', () => {
      render(<MessageInput {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Type your message...');

      fireEvent.change(textarea, { target: { value: 'Hello' } });

      expect(screen.getByText('5/1000')).toBeInTheDocument();
    });

    it('disables send button when no message', () => {
      render(<MessageInput {...defaultProps} />);

      const sendButton = screen.getByTitle('Send message (Enter)');
      expect(sendButton).toBeDisabled();
    });

    it('disables send button when disabled prop is true', () => {
      render(<MessageInput {...defaultProps} disabled={true} />);

      const textarea = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByTitle('Send message (Enter)');

      fireEvent.change(textarea, { target: { value: 'Hello' } });

      expect(sendButton).toBeDisabled();
      expect(textarea).toBeDisabled();
    });
  });

  describe('File upload functionality', () => {
    it('renders file input', () => {
      render(<MessageInput {...defaultProps} />);

      const fileInput = screen.getByTitle('Attach file');
      expect(fileInput).toBeInTheDocument();
    });

    it('handles file selection', async () => {
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ artifact: { _id: 'artifact-123' } }),
      });

      render(<MessageInput {...defaultProps} />);

      const fileInput = screen.getByTitle('Attach file');
      fireEvent.click(fileInput);

      const hiddenFileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      expect(hiddenFileInput).toBeInTheDocument();

      // Simulate file selection
      fireEvent.change(hiddenFileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(screen.getByText('test.txt')).toBeInTheDocument();
      });
    });

    it('validates file size', async () => {
      const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'large.txt', {
        type: 'text/plain',
      });

      render(<MessageInput {...defaultProps} />);

      const fileInput = screen.getByTitle('Attach file');
      fireEvent.click(fileInput);

      const hiddenFileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      fireEvent.change(hiddenFileInput, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(
          screen.getByText(/File size must be less than 50MB/)
        ).toBeInTheDocument();
      });
    });

    it('validates file type', async () => {
      const invalidFile = new File(['test'], 'test.exe', {
        type: 'application/x-executable',
      });

      render(<MessageInput {...defaultProps} />);

      const fileInput = screen.getByTitle('Attach file');
      fireEvent.click(fileInput);

      const hiddenFileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      fireEvent.change(hiddenFileInput, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(screen.getByText(/File type not supported/)).toBeInTheDocument();
      });
    });

    it('shows upload progress', async () => {
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });

      (global.fetch as any).mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ artifact: { _id: 'artifact-123' } }),
                }),
              100
            )
          )
      );

      render(<MessageInput {...defaultProps} />);

      const fileInput = screen.getByTitle('Attach file');
      fireEvent.click(fileInput);

      const hiddenFileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      fireEvent.change(hiddenFileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(screen.getByText('test.txt')).toBeInTheDocument();
        expect(document.querySelector('.progress-bar')).toBeInTheDocument();
      });
    });

    it('handles upload success', async () => {
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ artifact: { _id: 'artifact-123' } }),
      });

      render(<MessageInput {...defaultProps} />);

      const fileInput = screen.getByTitle('Attach file');
      fireEvent.click(fileInput);

      const hiddenFileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      fireEvent.change(hiddenFileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(screen.getByText('✓ Uploaded')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(defaultProps.onSendMessage).toHaveBeenCalledWith(
          '📎 test.txt',
          'file',
          {
            fileName: 'test.txt',
            fileSize: 12,
            fileType: 'text/plain',
            artifactId: 'artifact-123',
          }
        );
      });
    });

    it('handles upload error', async () => {
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Upload failed' }),
      });

      render(<MessageInput {...defaultProps} />);

      const fileInput = screen.getByTitle('Attach file');
      fireEvent.click(fileInput);

      const hiddenFileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      fireEvent.change(hiddenFileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(screen.getByText('✗ Upload failed')).toBeInTheDocument();
      });
    });

    it('removes upload from progress', async () => {
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });

      render(<MessageInput {...defaultProps} />);

      const fileInput = screen.getByTitle('Attach file');
      fireEvent.click(fileInput);

      const hiddenFileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      fireEvent.change(hiddenFileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(screen.getByText('test.txt')).toBeInTheDocument();
      });

      const removeButton = screen.getByTitle('Remove');
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText('test.txt')).not.toBeInTheDocument();
      });
    });
  });

  describe('Drag and drop functionality', () => {
    it('shows drag overlay when dragging files', () => {
      render(<MessageInput {...defaultProps} />);

      const container = screen
        .getByPlaceholderText('Type your message...')
        .closest('.message-input-container');

      fireEvent.dragEnter(container!);

      expect(screen.getByText('Drop files here to upload')).toBeInTheDocument();
    });

    it('handles file drop', async () => {
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ artifact: { _id: 'artifact-123' } }),
      });

      render(<MessageInput {...defaultProps} />);

      const container = screen
        .getByPlaceholderText('Type your message...')
        .closest('.message-input-container');

      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: { files: [mockFile] },
      });

      fireEvent(container!, dropEvent);

      await waitFor(() => {
        expect(screen.getByText('test.txt')).toBeInTheDocument();
      });
    });

    it('hides drag overlay when drag leaves', () => {
      render(<MessageInput {...defaultProps} />);

      const container = screen
        .getByPlaceholderText('Type your message...')
        .closest('.message-input-container');

      fireEvent.dragEnter(container!);
      expect(screen.getByText('Drop files here to upload')).toBeInTheDocument();

      fireEvent.dragLeave(container!);
      expect(
        screen.queryByText('Drop files here to upload')
      ).not.toBeInTheDocument();
    });
  });

  describe('Link sharing', () => {
    it('opens prompt for link sharing', () => {
      const mockPrompt = vi
        .spyOn(window, 'prompt')
        .mockReturnValue('https://example.com');

      render(<MessageInput {...defaultProps} />);

      const linkButton = screen.getByTitle('Share link');
      fireEvent.click(linkButton);

      expect(mockPrompt).toHaveBeenCalledWith('Enter URL to share:');
      expect(defaultProps.onSendMessage).toHaveBeenCalledWith(
        'https://example.com',
        'link'
      );

      mockPrompt.mockRestore();
    });

    it('does not send message when prompt is cancelled', () => {
      const mockPrompt = vi.spyOn(window, 'prompt').mockReturnValue(null);

      render(<MessageInput {...defaultProps} />);

      const linkButton = screen.getByTitle('Share link');
      fireEvent.click(linkButton);

      expect(defaultProps.onSendMessage).not.toHaveBeenCalled();

      mockPrompt.mockRestore();
    });
  });

  describe('Custom file upload handler', () => {
    it('uses custom upload handler when provided', async () => {
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });
      const customUploadHandler = vi.fn().mockResolvedValue({
        success: true,
        artifactId: 'custom-artifact-123',
      });

      render(
        <MessageInput {...defaultProps} onFileUpload={customUploadHandler} />
      );

      const fileInput = screen.getByTitle('Attach file');
      fireEvent.click(fileInput);

      const hiddenFileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      fireEvent.change(hiddenFileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(customUploadHandler).toHaveBeenCalledWith(mockFile);
      });

      await waitFor(() => {
        expect(defaultProps.onSendMessage).toHaveBeenCalledWith(
          '📎 test.txt',
          'file',
          {
            fileName: 'test.txt',
            fileSize: 12,
            fileType: 'text/plain',
            artifactId: 'custom-artifact-123',
          }
        );
      });
    });
  });

  describe('Multiple file upload', () => {
    it('handles multiple files', async () => {
      const mockFile1 = new File(['content1'], 'file1.txt', {
        type: 'text/plain',
      });
      const mockFile2 = new File(['content2'], 'file2.txt', {
        type: 'text/plain',
      });

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ artifact: { _id: 'artifact-1' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ artifact: { _id: 'artifact-2' } }),
        });

      render(<MessageInput {...defaultProps} />);

      const fileInput = screen.getByTitle('Attach file');
      fireEvent.click(fileInput);

      const hiddenFileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      fireEvent.change(hiddenFileInput, {
        target: { files: [mockFile1, mockFile2] },
      });

      await waitFor(() => {
        expect(screen.getByText('file1.txt')).toBeInTheDocument();
        expect(screen.getByText('file2.txt')).toBeInTheDocument();
      });
    });
  });

  describe('Disabled state during upload', () => {
    it('disables input during upload', async () => {
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });

      (global.fetch as any).mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ artifact: { _id: 'artifact-123' } }),
                }),
              100
            )
          )
      );

      render(<MessageInput {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByTitle('Send message (Enter)');
      const fileButton = screen.getByTitle('Attach file');

      // Start upload
      const hiddenFileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      fireEvent.change(hiddenFileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(textarea).toBeDisabled();
        expect(sendButton).toBeDisabled();
        expect(fileButton).toBeDisabled();
        expect(textarea).toHaveAttribute('placeholder', 'Uploading files...');
      });
    });
  });
});
