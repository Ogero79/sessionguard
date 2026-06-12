import type { Request, Response, NextFunction } from "express";
import { ZodError, type ZodSchema } from "zod";

/**
 * Body-validation middleware: runs the supplied Zod schema against `req.body`,
 * replaces it with the parsed/normalized shape on success, or short-circuits
 * with a 400 listing every Zod issue when the input is invalid.
 */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const error = result.error as ZodError;
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    req.body = result.data;
    next();
  };
}
