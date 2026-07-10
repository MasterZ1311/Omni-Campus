import { Request, Response, NextFunction } from 'express';

interface ValidationRule {
  field: string;
  type?: 'string' | 'number' | 'boolean';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  oneOf?: string[];
}

/**
 * Lightweight request body validation middleware factory.
 * Returns 400 with a clear error message if validation fails.
 */
export function validateBody(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = req.body[rule.field];

      // Required check
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`'${rule.field}' is required.`);
        continue;
      }

      // Skip further checks if optional and not provided
      if (value === undefined || value === null) continue;

      // Type check
      if (rule.type && typeof value !== rule.type) {
        errors.push(`'${rule.field}' must be of type ${rule.type}.`);
        continue;
      }

      // String-specific checks
      if (rule.type === 'string' || typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`'${rule.field}' must be at least ${rule.minLength} characters.`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`'${rule.field}' must be at most ${rule.maxLength} characters.`);
        }
        if (rule.oneOf && !rule.oneOf.includes(value)) {
          errors.push(`'${rule.field}' must be one of: ${rule.oneOf.join(', ')}.`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }

    next();
  };
}
