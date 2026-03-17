import prisma from "./prisma";

const LOCK_KEY = "bot-cycle";
const LOCK_TTL_MS = 10 * 60 * 1000;

export async function getWorkerLock() {
  return prisma.workerLock.upsert({
    where: { key: LOCK_KEY },
    update: {},
    create: { key: LOCK_KEY }
  });
}

export async function acquireWorkerLock(ownerId: string, ttlMs = LOCK_TTL_MS) {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + ttlMs);

  await getWorkerLock();

  const result = await prisma.workerLock.updateMany({
    where: {
      key: LOCK_KEY,
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }]
    },
    data: {
      ownerId,
      lockedAt: now,
      lockedUntil
    }
  });

  return result.count > 0;
}

export async function releaseWorkerLock(ownerId: string) {
  await prisma.workerLock.updateMany({
    where: {
      key: LOCK_KEY,
      ownerId
    },
    data: {
      ownerId: null,
      lockedAt: null,
      lockedUntil: null
    }
  });
}
