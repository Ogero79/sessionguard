import { errorHandler } from "../middleware/errorHandler";
import { ZodError, z } from "zod";
import type { Request, Response, NextFunction } from "express";

describe("errorHandler middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    mockReq = {};
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    mockNext = jest.fn();
    // Silence console.error during expected test errors
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("handles generic Error with 500 status and masks internal message in non-dev mode", () => {
    const error = new Error("Database connection lost");
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "Internal server error",
      })
    );
  });

  it("handles custom status codes on errors", () => {
    const error: any = new Error("Forbidden resource");
    error.statusCode = 403;
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "Forbidden resource",
      })
    );
  });

  it("handles ZodError with 400 status and issue paths", () => {
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: "invalid-email" });
    if (!result.success) {
      errorHandler(result.error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Validation failed",
          details: expect.arrayContaining([
            expect.objectContaining({ path: "email" }),
          ]),
        })
      );
    }
  });

  it("handles JWT authentication errors with 401 status", () => {
    const jwtError: any = new Error("jwt expired");
    jwtError.name = "TokenExpiredError";

    errorHandler(jwtError, mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "Invalid or expired authentication token",
      })
    );
  });

  it("handles Prisma P2002 unique constraint error with 409 Conflict", () => {
    const prismaError: any = new Error("Unique constraint failed on the fields: (`email`)");
    prismaError.code = "P2002";
    prismaError.meta = { target: ["email"] };

    errorHandler(prismaError, mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(409);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "A record with this email already exists.",
      })
    );
  });

  it("handles Prisma P2025 record not found error with 404", () => {
    const prismaError: any = new Error("Record to update not found.");
    prismaError.code = "P2025";

    errorHandler(prismaError, mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "Requested record not found.",
      })
    );
  });
});
