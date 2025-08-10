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
  PERMISSIONS: { MILESTONE: { EVALUATE: 'milestone:evaluate' } },
}));
vi.mock('../services/milestoneService', () => ({
  default: class MockSvc {
    updateCheckpoint() { return Promise.resolve({}); }
    updateCheckpointSignOff() { return Promise.resolve({}); }
  }
}));

const mockAuthenticateToken = vi.mocked(authenticateToken);
const mockRequirePermission = vi.mocked(requirePermission);

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
});