import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessResource,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  requireResourceAccess,
  getUserPermissions,
  canPerformAction,
  ROLE_PERMISSIONS,
  PERMISSIONS,
  Permission,
} from './roleCheck';
import { IUser } from '../models/User';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock the logger
vi.mock('../config/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the User model
vi.mock('../models/User', () => ({
  User: {
    findById: vi.fn(),
  },
}));

describe('Role-Based Access Control (RBAC)', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  // Create mock user objects
  const mockStudent: Partial<IUser> = {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
    email: 'student@test.com',
    firstName: 'John',
    lastName: 'Student',
    role: 'student',
    department: 'Computer Science',
    studentId: 'STU001',
    isActive: true,
    canAccessProject: vi.fn(),
  };

  const mockInstructor: Partial<IUser> = {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
    email: 'instructor@test.com',
    firstName: 'Jane',
    lastName: 'Instructor',
    role: 'instructor',
    department: 'Computer Science',
    instructorId: 'INS001',
    isActive: true,
    canAccessProject: vi.fn(),
  };

  const mockAdministrator: Partial<IUser> = {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
    email: 'admin@test.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'administrator',
    department: 'IT',
    isActive: true,
    canAccessProject: vi.fn(),
  };

  beforeEach(() => {
    mockRequest = {
      user: mockStudent as IUser,
      params: {},
      headers: {},
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Permission Checking Functions', () => {
    describe('hasPermission', () => {
      it('should return true for student with project:read permission', () => {
        const result = hasPermission(mockStudent as IUser, 'project:read');
        expect(result).toBe(true);
      });

      it('should return false for student with project:delete permission', () => {
        const result = hasPermission(mockStudent as IUser, 'project:delete');
        expect(result).toBe(false);
      });

      it('should return true for instructor with project:manage permission', () => {
        const result = hasPermission(mockInstructor as IUser, 'project:manage');
        expect(result).toBe(true);
      });

      it('should return true for administrator with system:admin permission', () => {
        const result = hasPermission(
          mockAdministrator as IUser,
          'system:admin'
        );
        expect(result).toBe(true);
      });
    });

    describe('hasAnyPermission', () => {
      it('should return true if user has any of the required permissions', () => {
        const permissions: Permission[] = ['project:read', 'project:delete'];
        const result = hasAnyPermission(mockStudent as IUser, permissions);
        expect(result).toBe(true);
      });

      it('should return false if user has none of the required permissions', () => {
        const permissions: Permission[] = ['project:delete', 'system:admin'];
        const result = hasAnyPermission(mockStudent as IUser, permissions);
        expect(result).toBe(false);
      });
    });

    describe('hasAllPermissions', () => {
      it('should return true if user has all required permissions', () => {
        const permissions: Permission[] = ['project:read', 'conversation:read'];
        const result = hasAllPermissions(mockStudent as IUser, permissions);
        expect(result).toBe(true);
      });

      it('should return false if user is missing any required permission', () => {
        const permissions: Permission[] = ['project:read', 'project:delete'];
        const result = hasAllPermissions(mockStudent as IUser, permissions);
        expect(result).toBe(false);
      });
    });

    describe('getUserPermissions', () => {
      it('should return correct permissions for student', () => {
        const permissions = getUserPermissions(mockStudent as IUser);
        expect(permissions).toEqual(ROLE_PERMISSIONS.student);
      });

      it('should return correct permissions for instructor', () => {
        const permissions = getUserPermissions(mockInstructor as IUser);
        expect(permissions).toEqual(ROLE_PERMISSIONS.instructor);
      });

      it('should return correct permissions for administrator', () => {
        const permissions = getUserPermissions(mockAdministrator as IUser);
        expect(permissions).toEqual(ROLE_PERMISSIONS.administrator);
      });
    });
  });

  describe('Resource Access Functions', () => {
    describe('canAccessResource', () => {
      beforeEach(() => {
        (
          mockStudent.canAccessProject as unknown as ReturnType<typeof vi.fn>
        ).mockResolvedValue(true);
        (
          mockInstructor.canAccessProject as unknown as ReturnType<typeof vi.fn>
        ).mockResolvedValue(true);
        (
          mockAdministrator.canAccessProject as unknown as ReturnType<
            typeof vi.fn
          >
        ).mockResolvedValue(true);
      });

      it('should return true for administrator regardless of resource', async () => {
        const result = await canAccessResource(
          mockAdministrator as IUser,
          'project',
          '507f1f77bcf86cd799439014',
          'project:delete'
        );
        expect(result).toBe(true);
      });

      it('should return false for student without permission', async () => {
        const result = await canAccessResource(
          mockStudent as IUser,
          'project',
          '507f1f77bcf86cd799439014',
          'project:delete'
        );
        expect(result).toBe(false);
      });

      it('should return true for student with permission and project access', async () => {
        const result = await canAccessResource(
          mockStudent as IUser,
          'project',
          '507f1f77bcf86cd799439014',
          'project:read'
        );
        expect(result).toBe(true);
      });

      it('should return false for student with permission but no project access', async () => {
        (
          mockStudent.canAccessProject as unknown as ReturnType<typeof vi.fn>
        ).mockResolvedValue(false);
        const result = await canAccessResource(
          mockStudent as IUser,
          'project',
          '507f1f77bcf86cd799439014',
          'project:read'
        );
        expect(result).toBe(false);
      });

      it('should allow users to access their own profile', async () => {
        const result = await canAccessResource(
          mockStudent as IUser,
          'user',
          mockStudent._id?.toString() || '',
          'user:read'
        );
        expect(result).toBe(true);
      });

      it('should allow instructors to access other user profiles with user:manage permission', async () => {
        const result = await canAccessResource(
          mockInstructor as IUser,
          'user',
          '507f1f77bcf86cd799439015',
          'user:read'
        );
        expect(result).toBe(true);
      });
    });

    describe('canPerformAction', () => {
      beforeEach(() => {
        (
          mockStudent.canAccessProject as unknown as ReturnType<typeof vi.fn>
        ).mockResolvedValue(true);
      });

      it('should return true for user with permission and no resource check', async () => {
        const result = await canPerformAction(
          mockStudent as IUser,
          'project:read'
        );
        expect(result).toBe(true);
      });

      it('should return false for user without permission', async () => {
        const result = await canPerformAction(
          mockStudent as IUser,
          'project:delete'
        );
        expect(result).toBe(false);
      });

      it('should check resource access when resource type and ID provided', async () => {
        const result = await canPerformAction(
          mockStudent as IUser,
          'project:read',
          'project',
          '507f1f77bcf86cd799439014'
        );
        expect(result).toBe(true);
        expect(mockStudent.canAccessProject).toHaveBeenCalledWith(
          '507f1f77bcf86cd799439014'
        );
      });
    });
  });

  describe('Middleware Functions', () => {
    describe('requirePermission', () => {
      it('should call next() for user with required permission', () => {
        const middleware = requirePermission('project:read');
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });

      it('should return 403 for user without required permission', () => {
        const middleware = requirePermission('project:delete');
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          requiredPermission: 'project:delete',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 401 for unauthenticated user', () => {
        mockRequest.user = undefined;
        const middleware = requirePermission('project:read');
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('requireAnyPermission', () => {
      it('should call next() for user with any required permission', () => {
        const middleware = requireAnyPermission([
          'project:read',
          'project:delete',
        ]);
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });

      it('should return 403 for user without any required permission', () => {
        const middleware = requireAnyPermission([
          'project:delete',
          'system:admin',
        ]);
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          requiredPermissions: ['project:delete', 'system:admin'],
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('requireAllPermissions', () => {
      it('should call next() for user with all required permissions', () => {
        const middleware = requireAllPermissions([
          'project:read',
          'conversation:read',
        ]);
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });

      it('should return 403 for user missing any required permission', () => {
        const middleware = requireAllPermissions([
          'project:read',
          'project:delete',
        ]);
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          requiredPermissions: ['project:read', 'project:delete'],
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('requireRole', () => {
      it('should call next() for user with required role', () => {
        const middleware = requireRole(['student', 'instructor']);
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });

      it('should return 403 for user without required role', () => {
        const middleware = requireRole(['instructor', 'administrator']);
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Insufficient role privileges',
          code: 'ROLE_DENIED',
          requiredRoles: ['instructor', 'administrator'],
          userRole: 'student',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('requireResourceAccess', () => {
      beforeEach(() => {
        (
          mockStudent.canAccessProject as unknown as ReturnType<typeof vi.fn>
        ).mockResolvedValue(true);
        mockRequest.params = { id: '507f1f77bcf86cd799439014' };
      });

      it('should call next() for user with resource access', async () => {
        const middleware = requireResourceAccess('project', 'project:read');
        await middleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });

      it('should return 403 for user without resource access', async () => {
        (
          mockStudent.canAccessProject as unknown as ReturnType<typeof vi.fn>
        ).mockResolvedValue(false);
        const middleware = requireResourceAccess('project', 'project:read');
        await middleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Access to resource denied',
          code: 'RESOURCE_ACCESS_DENIED',
          resourceType: 'project',
          resourceId: '507f1f77bcf86cd799439014',
          requiredAction: 'project:read',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 400 for missing resource ID', async () => {
        mockRequest.params = {};
        const middleware = requireResourceAccess('project', 'project:read');
        await middleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Resource ID is required',
          code: 'RESOURCE_ID_MISSING',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 500 for database error', async () => {
        (
          mockStudent.canAccessProject as unknown as ReturnType<typeof vi.fn>
        ).mockRejectedValue(new Error('Database error'));
        const middleware = requireResourceAccess('project', 'project:read');
        await middleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Error checking resource access',
          code: 'RESOURCE_CHECK_ERROR',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });

  describe('Permission Constants', () => {
    it('should export correct permission constants', () => {
      expect(PERMISSIONS.PROJECT.READ).toBe('project:read');
      expect(PERMISSIONS.PROJECT.WRITE).toBe('project:write');
      expect(PERMISSIONS.PROJECT.DELETE).toBe('project:delete');
      expect(PERMISSIONS.PROJECT.MANAGE).toBe('project:manage');

      expect(PERMISSIONS.PERSONA.READ).toBe('persona:read');
      expect(PERMISSIONS.PERSONA.WRITE).toBe('persona:write');
      expect(PERMISSIONS.PERSONA.DELETE).toBe('persona:delete');
      expect(PERMISSIONS.PERSONA.MANAGE).toBe('persona:manage');

      expect(PERMISSIONS.CONVERSATION.READ).toBe('conversation:read');
      expect(PERMISSIONS.CONVERSATION.WRITE).toBe('conversation:write');
      expect(PERMISSIONS.CONVERSATION.DELETE).toBe('conversation:delete');
      expect(PERMISSIONS.CONVERSATION.MODERATE).toBe('conversation:moderate');

      expect(PERMISSIONS.MILESTONE.READ).toBe('milestone:read');
      expect(PERMISSIONS.MILESTONE.WRITE).toBe('milestone:write');
      expect(PERMISSIONS.MILESTONE.DELETE).toBe('milestone:delete');
      expect(PERMISSIONS.MILESTONE.EVALUATE).toBe('milestone:evaluate');

      expect(PERMISSIONS.ARTIFACT.READ).toBe('artifact:read');
      expect(PERMISSIONS.ARTIFACT.WRITE).toBe('artifact:write');
      expect(PERMISSIONS.ARTIFACT.DELETE).toBe('artifact:delete');
      expect(PERMISSIONS.ARTIFACT.MANAGE).toBe('artifact:manage');

      expect(PERMISSIONS.USER.READ).toBe('user:read');
      expect(PERMISSIONS.USER.WRITE).toBe('user:write');
      expect(PERMISSIONS.USER.DELETE).toBe('user:delete');
      expect(PERMISSIONS.USER.MANAGE).toBe('user:manage');

      expect(PERMISSIONS.ANALYTICS.READ).toBe('analytics:read');
      expect(PERMISSIONS.ANALYTICS.WRITE).toBe('analytics:write');

      expect(PERMISSIONS.SYSTEM.ADMIN).toBe('system:admin');
      expect(PERMISSIONS.SYSTEM.CONFIG).toBe('system:config');
    });
  });

  describe('Role Permissions Mapping', () => {
    it('should have correct permissions for student role', () => {
      const studentPermissions = ROLE_PERMISSIONS.student;
      expect(studentPermissions).toContain('project:read');
      expect(studentPermissions).toContain('conversation:read');
      expect(studentPermissions).toContain('conversation:write');
      expect(studentPermissions).not.toContain('project:delete');
      expect(studentPermissions).not.toContain('system:admin');
    });

    it('should have correct permissions for instructor role', () => {
      const instructorPermissions = ROLE_PERMISSIONS.instructor;
      expect(instructorPermissions).toContain('project:manage');
      expect(instructorPermissions).toContain('persona:manage');
      expect(instructorPermissions).toContain('milestone:evaluate');
      expect(instructorPermissions).toContain('analytics:read');
      expect(instructorPermissions).not.toContain('system:admin');
    });

    it('should have correct permissions for administrator role', () => {
      const adminPermissions = ROLE_PERMISSIONS.administrator;
      expect(adminPermissions).toContain('project:delete');
      expect(adminPermissions).toContain('user:manage');
      expect(adminPermissions).toContain('system:admin');
      expect(adminPermissions).toContain('system:config');
    });
  });
});
