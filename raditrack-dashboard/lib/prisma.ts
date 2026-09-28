import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined; };

const connectionString = `${process.env.DATABASE_URL || "file:./radiology.db"}`;
const adapter = new PrismaBetterSqlite3({url: connectionString});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;


export default prisma;

