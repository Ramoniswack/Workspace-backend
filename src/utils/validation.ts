import { Request, Response, NextFunction } from "express";
import { z, ZodSchema } from "zod";

const AppError = require("./AppError");

const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        // Safety check: ensure errors array exists
        const zodError = result.error as any;
        if (!zodError || !zodError.errors || !Array.isArray(zodError.errors)) {
          return next(new AppError("Validation failed", 400));
        }

        const errors = zodError.errors.map((err: any) => ({
          field: err.path.join("."),
          message: err.message
        }));

        return next(new AppError(
          `Validation failed: ${errors.map((e: any) => e.message).join(", ")}`,
          400
        ));
      }

      req.body = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = validate;
export {};
