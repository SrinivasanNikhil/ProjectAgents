import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MilestoneSignOffModal from './MilestoneSignOffModal';

const mockPersonaSignOffs = [
  {
    _id: 's1',
    persona: { _id: 'p1', name: 'Alex Client', role: 'Stakeholder' },
    status: 'pending' as const,
  },
  {
    _id: 's2',
    persona: { _id: 'p2', name: 'Jamie Client', role: 'Manager' },
    status: 'approved' as const,
    satisfactionScore: 8,
    feedback: 'Good'
  },
];

describe('MilestoneSignOffModal', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'token123'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
    // @ts-ignore
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders persona sign-offs and allows updating a sign-off', async () => {
    const onUpdated = vi.fn();
    // @ts-ignore
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { _id: 'm1' } }) });

    render(
      <MilestoneSignOffModal
        milestoneId="m1"
        personaSignOffs={mockPersonaSignOffs as any}
        isOpen={true}
        onClose={() => {}}
        onUpdated={onUpdated}
      />
    );

    expect(screen.getByText('Manage Persona Sign-offs')).toBeInTheDocument();
    expect(screen.getByText('Alex Client')).toBeInTheDocument();

    const statusSelect = screen.getByLabelText('status-p1') as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'approved' } });

    const saveBtn = screen.getAllByText('Save')[0];
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/milestones/m1/sign-off', expect.objectContaining({ method: 'PUT' }));
      expect(onUpdated).toHaveBeenCalled();
    });
  });
});