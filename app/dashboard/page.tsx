import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toPublicSettings } from "@/lib/settings";
import { DashboardShell } from "@/components/dashboard-shell";
import { LogoutButton } from "@/components/logout-button";
import { getBotRuntimeStatus } from "@/lib/worker";

const PAGE_SIZE = 10;

export default async function DashboardPage({ searchParams }: { searchParams?: { page?: string } }) {
  const user = await requireUser();
  const currentPage = Math.max(1, Number(searchParams?.page || "1") || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;
  const runtimeStatus = await getBotRuntimeStatus();
  const [processedComments, processedCommentsCount, recentLogs] = await Promise.all([
    prisma.processedComment.findMany({ orderBy: { repliedAt: "desc" }, skip, take: PAGE_SIZE }),
    prisma.processedComment.count(),
    prisma.botLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 })
  ]);

  return (
    <main className="min-h-screen py-6">
      <div className="mx-auto flex max-w-7xl justify-start px-4 sm:px-6 lg:px-8">
        <LogoutButton />
      </div>
      <DashboardShell
        userEmail={user.email}
        initialSettings={toPublicSettings(runtimeStatus.settings)}
        processedComments={processedComments.map((comment) => ({ id: comment.id, commentId: comment.commentId, commenterName: comment.commenterName, message: comment.message, repliedAt: comment.repliedAt.toISOString(), postId: comment.postId }))}
        recentLogs={recentLogs.map((log) => ({ id: log.id, level: log.level, message: log.message, createdAt: log.createdAt.toISOString(), metaJson: log.metaJson ? JSON.stringify(log.metaJson, null, 2) : null }))}
        privateMessageFeatureEnabled={process.env.ENABLE_PRIVATE_MESSAGE_FEATURE === "true"}
        workerEnabled={runtimeStatus.workerEnabledByEnv}
        lockIsActive={Boolean(runtimeStatus.lock.lockedUntil && runtimeStatus.lock.lockedUntil > new Date())}
        processedCommentsCount={processedCommentsCount}
        commentsPage={currentPage}
        commentsTotalPages={Math.max(1, Math.ceil(processedCommentsCount / PAGE_SIZE))}
      />
    </main>
  );
}
