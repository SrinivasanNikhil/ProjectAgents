import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User';
import {
  authenticateToken,
  requireAuth,
  generateToken,
  logout,
  validatePassword,
  validateEmail,
} from '../middleware/auth';
import { logger } from '../config/logger';

const router = Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  authLimiter,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
    body('firstName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage(
        'First name is required and must be less than 50 characters'
      ),
    body('lastName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name is required and must be less than 50 characters'),
    body('role')
      .isIn(['student', 'instructor', 'administrator'])
      .withMessage('Role must be student, instructor, or administrator'),
    body('department')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Department must be less than 100 characters'),
    body('studentId')
      .optional()
      .trim()
      .isLength({ min: 3 })
      .withMessage('Student ID must be at least 3 characters long'),
    body('instructorId')
      .optional()
      .trim()
      .isLength({ min: 3 })
      .withMessage('Instructor ID must be at least 3 characters long'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
          code: 'VALIDATION_ERROR',
        });
      }

      const {
        email,
        password,
        firstName,
        lastName,
        role,
        department,
        studentId,
        instructorId,
      } = req.body;

      // Validate email format
      if (!validateEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
          code: 'INVALID_EMAIL',
        });
      }

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Password does not meet requirements',
          errors: passwordValidation.errors,
          code: 'WEAK_PASSWORD',
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists',
          code: 'USER_EXISTS',
        });
      }

      // Check for duplicate student/instructor IDs
      if (studentId) {
        const existingStudent = await User.findOne({ studentId });
        if (existingStudent) {
          return res.status(409).json({
            success: false,
            message: 'Student ID already exists',
            code: 'STUDENT_ID_EXISTS',
          });
        }
      }

      if (instructorId) {
        const existingInstructor = await User.findOne({ instructorId });
        if (existingInstructor) {
          return res.status(409).json({
            success: false,
            message: 'Instructor ID already exists',
            code: 'INSTRUCTOR_ID_EXISTS',
          });
        }
      }

      // Create new user
      const user = new User({
        email,
        password,
        firstName,
        lastName,
        role,
        department,
        studentId,
        instructorId,
      });

      await user.save();

      // Generate token
      const token = generateToken(user);

      // Log successful registration
      logger.info(`New user registered: ${email} (${role})`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          token,
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            department: user.department,
            studentId: user.studentId,
            instructorId: user.instructorId,
            isActive: user.isActive,
            createdAt: user.createdAt,
          },
        },
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        code: 'REGISTRATION_ERROR',
      });
    }
  }
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authLimiter,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
          code: 'VALIDATION_ERROR',
        });
      }

      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated',
          code: 'ACCOUNT_DEACTIVATED',
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        });
      }

      // Update last login
      user.lastLogin = new Date();
      user.stats.lastActivity = new Date();
      await user.save();

      // Generate token
      const token = generateToken(user);

      // Log successful login
      logger.info(`User logged in: ${email} (${user.role})`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            department: user.department,
            studentId: user.studentId,
            instructorId: user.instructorId,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            preferences: user.preferences,
            stats: user.stats,
          },
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        code: 'LOGIN_ERROR',
      });
    }
  }
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticateToken, requireAuth, logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  '/me',
  authenticateToken,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            department: user.department,
            studentId: user.studentId,
            instructorId: user.instructorId,
            profilePicture: user.profilePicture,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            preferences: user.preferences,
            stats: user.stats,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        },
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile',
        code: 'PROFILE_ERROR',
      });
    }
  }
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  authenticateToken,
  requireAuth,
  [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1 and 50 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be between 1 and 50 characters'),
    body('department')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Department must be less than 100 characters'),
    body('profilePicture')
      .optional()
      .isURL()
      .withMessage('Profile picture must be a valid URL'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
          code: 'VALIDATION_ERROR',
        });
      }

      const user = req.user!;
      const { firstName, lastName, department, profilePicture } = req.body;

      // Update user fields
      if (firstName !== undefined) user.firstName = firstName;
      if (lastName !== undefined) user.lastName = lastName;
      if (department !== undefined) user.department = department;
      if (profilePicture !== undefined) user.profilePicture = profilePicture;

      await user.save();

      // Log profile update
      logger.info(`Profile updated: ${user.email}`);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            department: user.department,
            studentId: user.studentId,
            instructorId: user.instructorId,
            profilePicture: user.profilePicture,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            preferences: user.preferences,
            stats: user.stats,
            updatedAt: user.updatedAt,
          },
        },
      });
    } catch (error) {
      logger.error('Profile update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        code: 'PROFILE_UPDATE_ERROR',
      });
    }
  }
);

/**
 * @route   PUT /api/auth/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put(
  '/preferences',
  authenticateToken,
  requireAuth,
  [
    body('preferences.notifications.email')
      .optional()
      .isBoolean()
      .withMessage('Email notifications must be a boolean'),
    body('preferences.notifications.push')
      .optional()
      .isBoolean()
      .withMessage('Push notifications must be a boolean'),
    body('preferences.notifications.chat')
      .optional()
      .isBoolean()
      .withMessage('Chat notifications must be a boolean'),
    body('preferences.theme')
      .optional()
      .isIn(['light', 'dark', 'auto'])
      .withMessage('Theme must be light, dark, or auto'),
    body('preferences.language')
      .optional()
      .matches(/^[a-z]{2}(-[A-Z]{2})?$/)
      .withMessage('Language must be in ISO 639-1 format (e.g., en, en-US)'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
          code: 'VALIDATION_ERROR',
        });
      }

      const user = req.user!;
      const { preferences } = req.body;

      // Update preferences
      if (preferences) {
        if (preferences.notifications) {
          user.preferences.notifications = {
            ...user.preferences.notifications,
            ...preferences.notifications,
          };
        }
        if (preferences.theme) {
          user.preferences.theme = preferences.theme;
        }
        if (preferences.language) {
          user.preferences.language = preferences.language;
        }
      }

      await user.save();

      res.json({
        success: true,
        message: 'Preferences updated successfully',
        data: {
          preferences: user.preferences,
        },
      });
    } catch (error) {
      logger.error('Preferences update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update preferences',
        code: 'PREFERENCES_UPDATE_ERROR',
      });
    }
  }
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
  '/change-password',
  authenticateToken,
  requireAuth,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
          code: 'VALIDATION_ERROR',
        });
      }

      const user = req.user!;
      const { currentPassword, newPassword } = req.body;

      // Verify current password
      const isCurrentPasswordValid =
        await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
          code: 'INVALID_CURRENT_PASSWORD',
        });
      }

      // Validate new password strength
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'New password does not meet requirements',
          errors: passwordValidation.errors,
          code: 'WEAK_PASSWORD',
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Log password change
      logger.info(`Password changed: ${user.email}`);

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      logger.error('Password change error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        code: 'PASSWORD_CHANGE_ERROR',
      });
    }
  }
);

export default router;
