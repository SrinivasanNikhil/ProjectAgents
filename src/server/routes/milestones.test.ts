import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import milestonesRoutes from './milestones';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/roleCheck';
import { validateObjectId } from '../utils/validation';

vi.mock('../middleware/auth', () => ({
  authenticateToken: vi.fn(() => (req: any, res: any, next: any) => next()),
}));
vi.mock('../middleware/roleCheck', () => ({
  requirePermission: vi.fn(() => (req: any, res: any, next: any) => next()),
  PERMISSIONS: { MILESTONE: { EVALUATE: 'milestone:evaluate', READ: 'milestone:read', WRITE: 'milestone:write', DELETE: 'milestone:delete' } },
}));
vi.mock('../services/milestoneService', () => {
  const service = {
    updateCheckpoint: vi.fn(async () => ({})),
    updateCheckpointSignOff: vi.fn(async () => ({})),
    completeMilestone: vi.fn(async () => ({ _id: '507f1f77bcf86cd799439011', status: 'completed' })),
    addFeedback: vi.fn(async () => ({ _id: '507f1f77bcf86cd799439011' })),
  };
  return { milestoneService: service };
});

const mockAuthenticateToken = vi.mocked(authenticateToken);
const mockRequirePermission = vi.mocked(requirePermission);
// Bring in the mocked service to override behavior per-test
import { milestoneService as mockedMilestoneService } from '../services/milestoneService';

describe('Milestones Checkpoints Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    (mockAuthenticateToken as any).mockImplementation((req: any, res: any, next: any) => {
      req.user = { id: 'user123', role: 'instructor' };
      next();
    });

    (mockRequirePermission as any).mockImplementation(() => (req: any, res: any, next: any) => next());

    app.use('/api/milestones', milestonesRoutes);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('POST /:id/checkpoints should validate IDs and required fields', async () => {
    // Invalid milestone ID
    await request(app)
      .post('/api/milestones/invalid-id/checkpoints')
      .send({})
      .expect(400);

    // Valid-looking ID but missing fields
    const validId = '507f1f77bcf86cd799439011';
    const res = await request(app)
      .post(`/api/milestones/${validId}/checkpoints`)
      .send({ title: '', description: '', dueDate: '' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('PUT /:id/checkpoints/:checkpointId should validate IDs', async () => {
    await request(app)
      .put('/api/milestones/bad/checkpoints/also-bad')
      .send({})
      .expect(400);
  });

  it('PUT /:id/checkpoints/:checkpointId/sign-off should validate payload', async () => {
    const id = '507f1f77bcf86cd799439011';
    const cpId = '507f1f77bcf86cd799439012';

    // Missing personaId/status
    const res = await request(app)
      .put(`/api/milestones/${id}/checkpoints/${cpId}/sign-off`)
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('PUT /:id/sign-off should validate payload and IDs', async () => {
    // Invalid milestone ID
    await request(app)
      .put('/api/milestones/invalid-id/sign-off')
      .send({ personaId: '507f1f77bcf86cd799439011', status: 'approved' })
      .expect(400);

    const id = '507f1f77bcf86cd799439011';

    // Missing fields
    await request(app)
      .put(`/api/milestones/${id}/sign-off`)
      .send({})
      .expect(400);

    // Invalid persona ID
    await request(app)
      .put(`/api/milestones/${id}/sign-off`)
      .send({ personaId: 'bad', status: 'approved' })
      .expect(400);

    // Invalid status
    await request(app)
      .put(`/api/milestones/${id}/sign-off`)
      .send({ personaId: '507f1f77bcf86cd799439011', status: 'not-a-status' })
      .expect(400);
  });

  // New tests for milestone completion tracking endpoint
  it('PUT /:id/complete should validate milestone ID', async () => {
    await request(app)
      .put('/api/milestones/invalid-id/complete')
      .send()
      .expect(400);
  });

  it('PUT /:id/complete should return 404 when milestone not found', async () => {
    (mockedMilestoneService.completeMilestone as any).mockResolvedValueOnce(null);

    await request(app)
      .put('/api/milestones/507f1f77bcf86cd799439099/complete')
      .send()
      .expect(404);
  });

  it('PUT /:id/complete should mark milestone as completed', async () => {
    (mockedMilestoneService.completeMilestone as any).mockResolvedValueOnce({
      _id: '507f1f77bcf86cd799439011',
      status: 'completed',
    });

    const res = await request(app)
      .put('/api/milestones/507f1f77bcf86cd799439011/complete')
      .send()
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.message).toBe('Milestone marked as completed');
  });

  it('POST /:id/feedback should validate IDs and required fields', async () => {
    // Invalid milestone ID
    await request(app)
      .post('/api/milestones/invalid-id/feedback')
      .send({ from: '507f1f77bcf86cd799439011', to: '507f1f77bcf86cd799439012', rating: 4, comments: 'Good job' })
      .expect(400);

    const id = '507f1f77bcf86cd799439011';
    // Missing fields
    await request(app)
      .post(`/api/milestones/${id}/feedback`)
      .send({})
      .expect(400);

    // Invalid user IDs
    await request(app)
      .post(`/api/milestones/${id}/feedback`)
      .send({ from: 'bad', to: 'also-bad', rating: 5, comments: 'ok' })
      .expect(400);

    // Invalid submissionId
    await request(app)
      .post(`/api/milestones/${id}/feedback`)
      .send({ from: '507f1f77bcf86cd799439011', to: '507f1f77bcf86cd799439012', rating: 5, comments: 'ok', submissionId: 'bad' })
      .expect(400);
  });

  it('POST /:id/feedback should call service and return 201', async () => {
    const id = '507f1f77bcf86cd799439011';
    const res = await request(app)
      .post(`/api/milestones/${id}/feedback`)
      .send({ from: '507f1f77bcf86cd799439011', to: '507f1f77bcf86cd799439012', rating: 4, comments: 'Well done' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Feedback added successfully');
  });
});