import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/User';
import { logger } from '../config/logger';

// Define permission types
export type Permission =
  | 'project:read'
  | 'project:write'
  | 'project:delete'
  | 'project:manage'
  | 'persona:read'
  | 'persona:write'
  | 'persona:delete'
  | 'persona:manage'
  | 'conversation:read'
  | 'conversation:write'
  | 'conversation:delete'
  | 'conversation:moderate'
  | 'milestone:read'
  | 'milestone:write'
  | 'milestone:delete'
  | 'milestone:evaluate'
  | 'artifact:read'
  | 'artifact:write'
  | 'artifact:delete'
  | 'artifact:manage'
  | 'user:read'
  | 'user:write'
  | 'user:delete'
  | 'user:manage'
  | 'analytics:read'
  | 'analytics:write'
  | 'system:admin'
  | 'system:config'
  | 'system:monitor';

// Define role permissions mapping
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  student: [
    'project:read',
    'persona:read',
    'conversation:read',
    'conversation:write',
    'milestone:read',
    'milestone:write',
    'artifact:read',
    'artifact:write',
    'user:read', // Can read their own profile and team members
  ],
  instructor: [
    'project:read',
    'project:write',
    'project:manage',
    'persona:read',
    'persona:write',
    'persona:manage',
    'conversation:read',
    'conversation:write',
    'conversation:moderate',
    'milestone:read',
    'milestone:write',
    'milestone:evaluate',
    'artifact:read',
    'artifact:write',
    'artifact:manage',
    'user:read',
    'user:write',
    'analytics:read',
    'analytics:write',
  ],
  administrator: [
    'project:read',
    'project:write',
    'project:delete',
    'project:manage',
    'persona:read',
    'persona:write',
    'persona:delete',
    'persona:manage',
    'conversation:read',
    'conversation:write',
    'conversation:delete',
    'conversation:moderate',
    'milestone:read',
    'milestone:write',
    'milestone:delete',
    'milestone:evaluate',
    'artifact:read',
    'artifact:write',
    'artifact:delete',
    'artifact:manage',
    'user:read',
    'user:write',
    'user:delete',
    'user:manage',
    'analytics:read',
    'analytics:write',
    'system:admin',
    'system:config',
    'system:monitor',
  ],
};

// Define resource ownership check functions
export interface ResourceOwnership {
  projectId?: string;
  userId?: string;
  personaId?: string;
  conversationId?: string;
  milestoneId?: string;
  artifactId?: string;
}

// Check if user has permission
export const hasPermission = (user: IUser, permission: Permission): boolean => {
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return userPermissions.includes(permission);
};

// Check if user has any of the required permissions
export const hasAnyPermission = (
  user: IUser,
  permissions: Permission[]
): boolean => {
  return permissions.some(permission => hasPermission(user, permission));
};

// Check if user has all required permissions
export const hasAllPermissions = (
  user: IUser,
  permissions: Permission[]
): boolean => {
  return permissions.every(permission => hasPermission(user, permission));
};

// Check if user can access a specific resource
export const canAccessResource = async (
  user: IUser,
  resourceType: string,
  resourceId: string,
  action: Permission
): Promise<boolean> => {
  // Administrators have access to everything
  if (user.role === 'administrator') {
    return true;
  }

  // Check basic permission first
  if (!hasPermission(user, action)) {
    return false;
  }

  // For project-specific resources, check project access
  if (
    ['project', 'persona', 'conversation', 'milestone', 'artifact'].includes(
      resourceType
    )
  ) {
    return await user.canAccessProject(resourceId as any);
  }

  // For user resources, check if it's their own profile or they have user management permissions
  if (resourceType === 'user') {
    if (resourceId === user._id?.toString()) {
      return true; // Users can always access their own profile
    }
    return hasPermission(user, 'user:manage');
  }

  return true;
};

// Middleware to require specific permission
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!hasPermission(req.user, permission)) {
      logger.warn(
        `Permission denied: User ${req.user._id?.toString()} attempted to access ${permission}`
      );
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'PERMISSION_DENIED',
        requiredPermission: permission,
      });
      return;
    }

    next();
  };
};

// Middleware to require any of the specified permissions
export const requireAnyPermission = (permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!hasAnyPermission(req.user, permissions)) {
      logger.warn(
        `Permission denied: User ${req.user._id?.toString()} attempted to access permissions: ${permissions.join(', ')}`
      );
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'PERMISSION_DENIED',
        requiredPermissions: permissions,
      });
      return;
    }

    next();
  };
};

// Middleware to require all specified permissions
export const requireAllPermissions = (permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!hasAllPermissions(req.user, permissions)) {
      logger.warn(
        `Permission denied: User ${req.user._id?.toString()} attempted to access all permissions: ${permissions.join(', ')}`
      );
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'PERMISSION_DENIED',
        requiredPermissions: permissions,
      });
      return;
    }

    next();
  };
};

// Middleware to require specific role
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(
        `Role denied: User ${req.user._id?.toString()} (${req.user.role}) attempted to access role-restricted endpoint`
      );
      res.status(403).json({
        success: false,
        message: 'Insufficient role privileges',
        code: 'ROLE_DENIED',
        requiredRoles: roles,
        userRole: req.user.role,
      });
      return;
    }

    next();
  };
};

// Middleware to check resource ownership
export const requireResourceAccess = (
  resourceType: string,
  action: Permission
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const resourceId =
      req.params.id || req.params.projectId || req.params.userId;

    if (!resourceId) {
      res.status(400).json({
        success: false,
        message: 'Resource ID is required',
        code: 'RESOURCE_ID_MISSING',
      });
      return;
    }

    try {
      const hasAccess = await canAccessResource(
        req.user,
        resourceType,
        resourceId,
        action
      );

      if (!hasAccess) {
        logger.warn(
          `Resource access denied: User ${req.user._id?.toString()} attempted to ${action} ${resourceType} ${resourceId}`
        );
        res.status(403).json({
          success: false,
          message: 'Access to resource denied',
          code: 'RESOURCE_ACCESS_DENIED',
          resourceType,
          resourceId,
          requiredAction: action,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Error checking resource access:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking resource access',
        code: 'RESOURCE_CHECK_ERROR',
      });
    }
  };
};

// Convenience middleware for common role combinations
export const requireInstructor = requireRole(['instructor', 'administrator']);
export const requireAdministrator = requireRole(['administrator']);
export const requireStudent = requireRole([
  'student',
  'instructor',
  'administrator',
]);

// Convenience middleware for common permission combinations
export const requireProjectAccess = (action: Permission) =>
  requireResourceAccess('project', action);
export const requirePersonaAccess = (action: Permission) =>
  requireResourceAccess('persona', action);
export const requireConversationAccess = (action: Permission) =>
  requireResourceAccess('conversation', action);
export const requireMilestoneAccess = (action: Permission) =>
  requireResourceAccess('milestone', action);
export const requireArtifactAccess = (action: Permission) =>
  requireResourceAccess('artifact', action);
export const requireUserAccess = (action: Permission) =>
  requireResourceAccess('user', action);

// Utility function to get user permissions
export const getUserPermissions = (user: IUser): Permission[] => {
  return ROLE_PERMISSIONS[user.role] || [];
};

// Utility function to check if user can perform action on resource
export const canPerformAction = async (
  user: IUser,
  action: Permission,
  resourceType?: string,
  resourceId?: string
): Promise<boolean> => {
  if (!hasPermission(user, action)) {
    return false;
  }

  if (resourceType && resourceId) {
    return await canAccessResource(user, resourceType, resourceId, action);
  }

  return true;
};

// Export permission constants for easy reference
export const PERMISSIONS = {
  PROJECT: {
    READ: 'project:read' as Permission,
    WRITE: 'project:write' as Permission,
    DELETE: 'project:delete' as Permission,
    MANAGE: 'project:manage' as Permission,
  },
  PERSONA: {
    READ: 'persona:read' as Permission,
    WRITE: 'persona:write' as Permission,
    DELETE: 'persona:delete' as Permission,
    MANAGE: 'persona:manage' as Permission,
  },
  CONVERSATION: {
    READ: 'conversation:read' as Permission,
    WRITE: 'conversation:write' as Permission,
    DELETE: 'conversation:delete' as Permission,
    MODERATE: 'conversation:moderate' as Permission,
  },
  MILESTONE: {
    READ: 'milestone:read' as Permission,
    WRITE: 'milestone:write' as Permission,
    DELETE: 'milestone:delete' as Permission,
    EVALUATE: 'milestone:evaluate' as Permission,
  },
  ARTIFACT: {
    READ: 'artifact:read' as Permission,
    WRITE: 'artifact:write' as Permission,
    DELETE: 'artifact:delete' as Permission,
    MANAGE: 'artifact:manage' as Permission,
  },
  USER: {
    READ: 'user:read' as Permission,
    WRITE: 'user:write' as Permission,
    DELETE: 'user:delete' as Permission,
    MANAGE: 'user:manage' as Permission,
  },
  ANALYTICS: {
    READ: 'analytics:read' as Permission,
    WRITE: 'analytics:write' as Permission,
  },
  SYSTEM: {
    ADMIN: 'system:admin' as Permission,
    CONFIG: 'system:config' as Permission,
    MONITOR: 'system:monitor' as Permission,
  },
};
