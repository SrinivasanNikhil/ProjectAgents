import { Types } from 'mongoose';

/**
 * Validate if a string is a valid MongoDB ObjectId
 */
export function validateObjectId(id: any): boolean {
  return Types.ObjectId.isValid(id);
}

/**
 * Validate and parse date range
 */
export function validateDateRange(startDate?: string, endDate?: string): {
  isValid: boolean;
  errors: string[];
  range?: { start?: Date; end?: Date };
} {
  const errors: string[] = [];
  let range: { start?: Date; end?: Date } = {};

  if (startDate) {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      errors.push('Invalid start date format');
    } else {
      range.start = start;
    }
  }

  if (endDate) {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      errors.push('Invalid end date format');
    } else {
      range.end = end;
    }
  }

  // If both dates are valid, check that start is before end
  if (range.start && range.end && range.start >= range.end) {
    errors.push('Start date must be before end date');
  }

  return {
    isValid: errors.length === 0,
    errors,
    range: errors.length === 0 ? range : undefined,
  };
}

/**
 * Validate pagination parameters
 */
export function validatePagination(params: {
  page?: any;
  limit?: any;
}): string[] {
  const errors: string[] = [];
  const { page, limit } = params;

  if (page !== undefined) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push('Page must be a positive integer');
    } else if (pageNum > 1000) {
      errors.push('Page number too large (max 1000)');
    }
  }

  if (limit !== undefined) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1) {
      errors.push('Limit must be a positive integer');
    } else if (limitNum > 100) {
      errors.push('Limit too large (max 100)');
    }
  }

  return errors;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate required fields in an object
 */
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[]
): string[] {
  const errors: string[] = [];
  
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      errors.push(`${field} is required`);
    }
  }
  
  return errors;
}

/**
 * Validate string length constraints
 */
export function validateStringLength(
  value: string,
  fieldName: string,
  minLength?: number,
  maxLength?: number
): string[] {
  const errors: string[] = [];
  
  if (minLength && value.length < minLength) {
    errors.push(`${fieldName} must be at least ${minLength} characters long`);
  }
  
  if (maxLength && value.length > maxLength) {
    errors.push(`${fieldName} must not exceed ${maxLength} characters`);
  }
  
  return errors;
}

/**
 * Validate array constraints
 */
export function validateArray(
  value: any[],
  fieldName: string,
  minItems?: number,
  maxItems?: number
): string[] {
  const errors: string[] = [];
  
  if (!Array.isArray(value)) {
    errors.push(`${fieldName} must be an array`);
    return errors;
  }
  
  if (minItems && value.length < minItems) {
    errors.push(`${fieldName} must have at least ${minItems} items`);
  }
  
  if (maxItems && value.length > maxItems) {
    errors.push(`${fieldName} must not have more than ${maxItems} items`);
  }
  
  return errors;
}

/**
 * Validate numeric range
 */
export function validateNumericRange(
  value: number,
  fieldName: string,
  min?: number,
  max?: number
): string[] {
  const errors: string[] = [];
  
  if (typeof value !== 'number' || isNaN(value)) {
    errors.push(`${fieldName} must be a valid number`);
    return errors;
  }
  
  if (min !== undefined && value < min) {
    errors.push(`${fieldName} must be at least ${min}`);
  }
  
  if (max !== undefined && value > max) {
    errors.push(`${fieldName} must not exceed ${max}`);
  }
  
  return errors;
}

/**
 * Validate enum values
 */
export function validateEnum(
  value: any,
  fieldName: string,
  allowedValues: any[]
): string[] {
  const errors: string[] = [];
  
  if (!allowedValues.includes(value)) {
    errors.push(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }
  
  return errors;
}