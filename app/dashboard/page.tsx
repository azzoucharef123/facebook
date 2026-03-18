import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toPublicSettings } from "@/lib/settings";
import { DashboardShell } from "@/components/dashboard-shell";
import { LogoutButton } from "@/components/logout-button";
import { getBotRuntimeStatus } from "@/lib/worker";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

type DashboardComment = {
  id: string;
  commentId: string;
  commenterName: string;
  message: string;
  repliedAt: string;
  postId: string;
};

type DashboardLog = {
  id: string;
  level: "info" | "warn" | "error";
  message: string;
  createdAt: string;
  metaJson: string | null;
};

export default async function DashboardPage({ searchParams }: { searchParams?: { page?: string } }) {
  const user = await requireUser();
  const currentPage = Math.max(1, Number(searchParams?.page || "1") || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  let initialSettings = {
    pageId: "",
    intervalSeconds: 60,
    mode: "all_posts" as const,
    postId: "",
    replyText: "",
    keywords: "",
    processOldComments: false,
    sendPrivateMessage: false,
    autoLike: false,
    isEnabled: false,
    hasSavedAccessToken: false,
    maskedPageAccessToken: "",
    enabledAt: null as string | null
  };
  let processedComments: DashboardComment[] = [];
  let processedCommentsCount = 0;
  let recentLogs: DashboardLog[] = [];
  let workerEnabled = process.env.OPTIONAL_WORKER_ENABLED !== "false";
  let lockIsActive = false;

  try {
    const runtimeStatus = await getBotRuntimeStatus();
    const [comments, commentsCount, logs] = await Promise.all([
      prisma.processedComment.findMany({ orderBy: { repliedAt: "desc" }, skip, take: PAGE_SIZE }),
      prisma.processedComment.count(),
      prisma.botLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 })
    ]);

    initialSettings = toPublicSettings(runtimeStatus.settings);
    processedComments = comments.map((comment) => ({
      id: comment.id,
      commentId: comment.commentId,
      commenterName: comment.commenterName,
      message: comment.message,
      repliedAt: comment.repliedAt.toISOString(),
      postId: comment.postId
    }));
    processedCommentsCount = commentsCount;
    recentLogs = logs.map((log) => ({
      id: log.id,
      level: log.level,
      message: log.message,
      createdAt: log.createdAt.toISOString(),
      metaJson: log.metaJson ? JSON.stringify(log.metaJson, null, 2) : null
    }));
    workerEnabled = runtimeStatus.workerEnabledByEnv;
    lockIsActive = Boolean(runtimeStatus.lock.lockedUntil && runtimeStatus.lock.lockedUntil > new Date());
  } catch (error) {
    recentLogs = [
      {
        id: "dashboard-db-fallback",
        level: "error",
        message: "تعذر قراءة قاعدة البيانات حاليا، وتم فتح اللوحة بالوضع الآمن.",
        createdAt: new Date().toISOString(),
        metaJson: error instanceof Error ? error.message : "Unknown error"
      }
    ];
  }

  return (
    <main className="min-h-screen py-6">
      <div className="mx-auto flex max-w-7xl justify-start px-4 sm:px-6 lg:px-8">
        <LogoutButton />
      </div>
      <DashboardShell
        userEmail={user.email}
        initialSettings={initialSettings}
        processedComments={processedComments}
        recentLogs={recentLogs}
        privateMessageFeatureEnabled={process.env.ENABLE_PRIVATE_MESSAGE_FEATURE === "true"}
        workerEnabled={workerEnabled}
        lockIsActive={lockIsActive}
        processedCommentsCount={processedCommentsCount}
        commentsPage={currentPage}
        commentsTotalPages={Math.max(1, Math.ceil(processedCommentsCount / PAGE_SIZE))}
      />
    </main>
  );
}
