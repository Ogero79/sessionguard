import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function main() {
  console.log("Seeding database...");

  const demoHash = await bcrypt.hash("demo123", SALT_ROUNDS);
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@sessionguard.dev" },
    update: { passwordHash: demoHash },
    create: {
      email: "demo@sessionguard.dev",
      passwordHash: demoHash,
      displayName: "Demo User",
      role: "USER",
    },
  });

  console.log(`Created/updated demo user: ${demoUser.email} (id: ${demoUser.id})`);

  const adminHash = await bcrypt.hash("admin123", SALT_ROUNDS);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@sessionguard.dev" },
    update: { passwordHash: adminHash, role: "ADMIN" },
    create: {
      email: "admin@sessionguard.dev",
      passwordHash: adminHash,
      displayName: "Admin User",
      role: "ADMIN",
    },
  });

  console.log(`Created/updated admin user: ${adminUser.email} (id: ${adminUser.id})`);
  console.log("Seeding complete. Credentials: demo@sessionguard.dev/demo123 | admin@sessionguard.dev/admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
