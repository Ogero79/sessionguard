// Prisma client mock — used by unit tests to avoid requiring a real database.
export const prisma = {
  baselineModel: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  session: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  behaviouralData: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  riskAssessment: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    createMany: jest.fn(),
    findFirst: jest.fn(),
  },
  systemSettings: {
    findUnique: jest.fn(),
  },
  experiment: {
    findFirst: jest.fn(),
  },
  experimentLog: {
    create: jest.fn(),
  },
};
