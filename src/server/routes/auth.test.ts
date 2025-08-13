import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import authRoutes from './auth';
import rateLimit from 'express-rate-limit';
import { authenticateToken, requireAuth } from '../middleware/auth';
import { User } from '../models/User';

vi.mock('express-rate-limit', () => ({
  default: () => (req: any, res: any, next: any) => next(),
}));

vi.mock('../middleware/auth', () => ({
  authenticateToken: vi.fn((req: any, res: any, next: any) => { req.user = { _id: '507f1f77bcf86cd799439011', email: 'login@example.com', role: 'student', isActive: true, preferences: { notifications: { email: true, push: true, chat: true }, theme: 'auto', language: 'en' }, stats: { totalProjects: 0, totalConversations: 0, totalArtifacts: 0, lastActivity: new Date() } }; next(); }),
  requireAuth: vi.fn((req: any, res: any, next: any) => next()),
  logout: vi.fn((req: any, res: any) => res.json({ success: true })),
  generateToken: vi.fn(() => 'mock-jwt-token'),
  validatePassword: (password: string) => ({ isValid: password.length >= 8, errors: password.length >= 8 ? [] : ['too short'] }),
  validateEmail: (email: string) => /@/.test(email),
}));

vi.mock('../models/User', () => {
  const savedUsers: any[] = [];
  class MockUser {
    _id = '507f1f77bcf86cd799439011';
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    department?: string;
    studentId?: string;
    instructorId?: string;
    isActive = true;
    preferences = { notifications: { email: true, push: true, chat: true }, theme: 'auto', language: 'en' };
    stats = { totalProjects: 0, totalConversations: 0, totalArtifacts: 0, lastActivity: new Date() };
    lastLogin?: Date;
    constructor(data: any) { Object.assign(this, data); }
    async save() {
      const exists = savedUsers.find(u => u.email === this.email || (this.studentId && u.studentId === this.studentId) || (this.instructorId && u.instructorId === this.instructorId));
      if (!exists) savedUsers.push(this);
      return this;
    }
    async comparePassword(pw: string) { return pw === this.password; }
  }
  (MockUser as any).findOne = async (query: any) => savedUsers.find(u => (query.email && u.email === query.email) || (query.studentId && u.studentId === query.studentId) || (query.instructorId && u.instructorId === query.instructorId)) || null;
  (MockUser as any).findById = async (id: string) => savedUsers.find(u => u._id === id) || null;
  (MockUser as any).__reset = () => { savedUsers.splice(0, savedUsers.length); };
  return { User: MockUser };
});

const mockAuthenticateToken = vi.mocked(authenticateToken);
const mockRequireAuth = vi.mocked(requireAuth);

describe('Auth Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    (mockAuthenticateToken as any).mockImplementation((req: any, res: any, next: any) => { req.user = { _id: '507f1f77bcf86cd799439011', email: 'login@example.com', role: 'student', isActive: true, preferences: { notifications: { email: true, push: true, chat: true }, theme: 'auto', language: 'en' }, stats: { totalProjects: 0, totalConversations: 0, totalArtifacts: 0, lastActivity: new Date() } }; next(); });
    (mockRequireAuth as any).mockImplementation((req: any, res: any, next: any) => next());
    app.use('/api/auth', authRoutes);
  });

  afterEach(() => {
  vi.clearAllMocks();
  // @ts-ignore
  (User as any).__reset?.();
});

  it('POST /register should validate payload and create user', async () => {
    // Missing fields
    await request(app).post('/api/auth/register').send({}).expect(400);

    // Valid registration
    const res = await request(app).post('/api/auth/register').send({
      email: 'user@example.com',
      password: 'Password1!',
      firstName: 'Test',
      lastName: 'User',
      role: 'student',
      department: 'CS',
      studentId: 's123',
    }).expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBe('mock-jwt-token');
    expect(res.body.data.user.email).toBe('user@example.com');

    // Duplicate email
    await request(app).post('/api/auth/register').send({
      email: 'user@example.com',
      password: 'Password1!',
      firstName: 'Dup',
      lastName: 'User',
      role: 'student',
      department: 'CS',
      studentId: 's124',
    }).expect(409);
  });

  it('POST /login should authenticate user', async () => {
    // Ensure a user exists
    await request(app).post('/api/auth/register').send({
      email: 'login@example.com',
      password: 'Password1!',
      firstName: 'Log',
      lastName: 'In',
      role: 'student',
      department: 'CS',
      studentId: 's200',
    }).expect(201);

    // Wrong email
    await request(app).post('/api/auth/login').send({ email: 'nope@example.com', password: 'Password1!' }).expect(401);

    // Wrong password
    await request(app).post('/api/auth/login').send({ email: 'login@example.com', password: 'WrongPass1!' }).expect(401);

    // Correct
    const res = await request(app).post('/api/auth/login').send({ email: 'login@example.com', password: 'Password1!' }).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBe('mock-jwt-token');
  });

  it('GET /me should return current user when authenticated', async () => {
    const res = await request(app).get('/api/auth/me').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
  });
});