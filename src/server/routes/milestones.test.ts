import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import milestonesRoutes from './milestones';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/roleCheck';

vi.mock('../middleware/auth');
vi.mock('../middleware/roleCheck');

const mockAuthenticateToken = vi.mocked(authenticateToken);
const mockRequirePermission = vi.mocked(requirePermission);

describe('Milestones Checkpoints Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockAuthenticateToken.mockImplementation((req: any, res: any, next: any) => {
      req.user = { id: 'user123', role: 'instructor' };
      next();
    });

    mockRequirePermission.mockImplementation(() => (req: any, res: any, next: any) => next());

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
});