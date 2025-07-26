import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import MessageFlagButton from './MessageFlagButton';

// Mock the CSS import
vi.mock('./MessageFlagButton.css', () => ({}));

describe('MessageFlagButton', () => {
  const mockOnFlag = vi.fn();
  const defaultProps = {
    messageId: 'test-message-id',
    onFlag: mockOnFlag,
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders flag button with correct accessibility attributes', () => {
    render(<MessageFlagButton {...defaultProps} />);

    const flagButton = screen.getByRole('button', {
      name: /🚩/i,
    });
    expect(flagButton).toBeInTheDocument();
    expect(flagButton).toHaveAttribute('title', 'Flag message for moderation');
  });

  it('shows flag modal when button is clicked', () => {
    render(<MessageFlagButton {...defaultProps} />);

    const flagButton = screen.getByRole('button', {
      name: /🚩/i,
    });
    fireEvent.click(flagButton);

    expect(screen.getByText('Flag Message for Moderation')).toBeInTheDocument();
    expect(screen.getByLabelText(/reason for flagging/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/severity level/i)).toBeInTheDocument();
  });

  it('disables flag button when disabled prop is true', () => {
    render(<MessageFlagButton {...defaultProps} disabled={true} />);

    const flagButton = screen.getByRole('button', {
      name: /🚩/i,
    });
    expect(flagButton).toBeDisabled();
  });

  it('closes modal when close button is clicked', () => {
    render(<MessageFlagButton {...defaultProps} />);

    // Open modal
    const flagButton = screen.getByRole('button', {
      name: /🚩/i,
    });
    fireEvent.click(flagButton);

    // Close modal
    const closeButton = screen.getByRole('button', { name: /×/i });
    fireEvent.click(closeButton);

    expect(
      screen.queryByText('Flag Message for Moderation')
    ).not.toBeInTheDocument();
  });

  it('closes modal when cancel button is clicked', () => {
    render(<MessageFlagButton {...defaultProps} />);

    // Open modal
    const flagButton = screen.getByRole('button', {
      name: /🚩/i,
    });
    fireEvent.click(flagButton);

    // Cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(
      screen.queryByText('Flag Message for Moderation')
    ).not.toBeInTheDocument();
  });

  it('requires reason selection before submitting', () => {
    render(<MessageFlagButton {...defaultProps} />);

    // Open modal
    const flagButton = screen.getByRole('button', {
      name: /🚩/i,
    });
    fireEvent.click(flagButton);

    // Submit button should be disabled without reason
    const submitButton = screen.getByRole('button', { name: /submit flag/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when reason is selected', () => {
    render(<MessageFlagButton {...defaultProps} />);

    // Open modal
    const flagButton = screen.getByRole('button', {
      name: /🚩/i,
    });
    fireEvent.click(flagButton);

    // Select a reason
    const reasonSelect = screen.getByLabelText(/reason for flagging/i);
    fireEvent.change(reasonSelect, {
      target: { value: 'inappropriate-language' },
    });

    // Submit button should be enabled
    const submitButton = screen.getByRole('button', { name: /submit flag/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('shows custom reason textarea when "other" is selected', () => {
    render(<MessageFlagButton {...defaultProps} />);

    // Open modal
    const flagButton = screen.getByRole('button', {
      name: /🚩/i,
    });
    fireEvent.click(flagButton);

    // Select "other" reason
    const reasonSelect = screen.getByLabelText(/reason for flagging/i);
    fireEvent.change(reasonSelect, { target: { value: 'other' } });

    // Custom reason textarea should appear
    expect(screen.getByLabelText(/custom reason/i)).toBeInTheDocument();
  });

  it('calls onFlag with correct parameters when form is submitted', async () => {
    render(<MessageFlagButton {...defaultProps} />);

    // Open modal
    const flagButton = screen.getByRole('button', {
      name: /🚩/i,
    });
    fireEvent.click(flagButton);

    // Select reason and severity
    const reasonSelect = screen.getByLabelText(/reason for flagging/i);
    fireEvent.change(reasonSelect, { target: { value: 'spam' } });

    const severitySelect = screen.getByLabelText(/severity level/i);
    fireEvent.change(severitySelect, { target: { value: 'high' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /submit flag/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnFlag).toHaveBeenCalledWith(
        'test-message-id',
        'spam',
        'high'
      );
    });
  });

  it('handles custom reason submission', async () => {
    render(<MessageFlagButton {...defaultProps} />);

    // Open modal
    const flagButton = screen.getByRole('button', {
      name: /🚩/i,
    });
    fireEvent.click(flagButton);

    // Select "other" reason
    const reasonSelect = screen.getByLabelText(/reason for flagging/i);
    fireEvent.change(reasonSelect, { target: { value: 'other' } });

    // Enter custom reason
    const customReasonTextarea = screen.getByLabelText(/custom reason/i);
    fireEvent.change(customReasonTextarea, {
      target: { value: 'Custom reason text' },
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /submit flag/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnFlag).toHaveBeenCalledWith(
        'test-message-id',
        'Custom reason text',
        'medium'
      );
    });
  });

  it('shows loading state during submission', async () => {
    // Mock async onFlag function
    const asyncMockOnFlag = vi
      .fn()
      .mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

    render(<MessageFlagButton {...defaultProps} onFlag={asyncMockOnFlag} />);

    // Open modal
    const flagButton = screen.getByRole('button', {
      name: /🚩/i,
    });
    fireEvent.click(flagButton);

    // Select reason
    const reasonSelect = screen.getByLabelText(/reason for flagging/i);
    fireEvent.change(reasonSelect, {
      target: { value: 'inappropriate-language' },
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /submit flag/i });
    fireEvent.click(submitButton);

    // Should show loading state
    expect(screen.getByText('Submitting...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('closes modal after successful submission', async () => {
    render(<MessageFlagButton {...defaultProps} />);

    // Open modal
    const flagButton = screen.getByRole('button', {
      name: /🚩/i,
    });
    fireEvent.click(flagButton);

    // Select reason
    const reasonSelect = screen.getByLabelText(/reason for flagging/i);
    fireEvent.change(reasonSelect, { target: { value: 'harassment' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /submit flag/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.queryByText('Flag Message for Moderation')
      ).not.toBeInTheDocument();
    });
  });

  it('resets form state after submission', async () => {
    render(<MessageFlagButton {...defaultProps} />);

    // Open modal
    const flagButton = screen.getByRole('button', {
      name: /🚩/i,
    });
    fireEvent.click(flagButton);

    // Select reason and severity
    const reasonSelect = screen.getByLabelText(/reason for flagging/i);
    fireEvent.change(reasonSelect, { target: { value: 'spam' } });

    const severitySelect = screen.getByLabelText(/severity level/i);
    fireEvent.change(severitySelect, { target: { value: 'high' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /submit flag/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Modal should be closed
      expect(
        screen.queryByText('Flag Message for Moderation')
      ).not.toBeInTheDocument();
    });

    // Reopen modal and check if form is reset
    fireEvent.click(flagButton);
    expect(screen.getByLabelText(/reason for flagging/i)).toHaveValue('');
    expect(screen.getByLabelText(/severity level/i)).toHaveValue('medium');
  });

  it('handles submission errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const errorMockOnFlag = vi.fn().mockRejectedValue(new Error('Flag failed'));

    render(<MessageFlagButton {...defaultProps} onFlag={errorMockOnFlag} />);

    // Open modal
    const flagButton = screen.getByRole('button', {
      name: /🚩/i,
    });
    fireEvent.click(flagButton);

    // Select reason
    const reasonSelect = screen.getByLabelText(/reason for flagging/i);
    fireEvent.change(reasonSelect, {
      target: { value: 'inappropriate-language' },
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /submit flag/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error flagging message:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('disables form controls during submission', async () => {
    const asyncMockOnFlag = vi
      .fn()
      .mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

    render(<MessageFlagButton {...defaultProps} onFlag={asyncMockOnFlag} />);

    // Open modal
    const flagButton = screen.getByRole('button', {
      name: /🚩/i,
    });
    fireEvent.click(flagButton);

    // Select reason
    const reasonSelect = screen.getByLabelText(/reason for flagging/i);
    fireEvent.change(reasonSelect, {
      target: { value: 'inappropriate-language' },
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /submit flag/i });
    fireEvent.click(submitButton);

    // All form controls should be disabled during submission
    expect(reasonSelect).toBeDisabled();
    expect(screen.getByLabelText(/severity level/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /×/i })).toBeDisabled();
  });
});
