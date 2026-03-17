import type { BotMode } from "@prisma/client";

export const SESSION_COOKIE_NAME = "fb-comment-bot-session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const DEFAULT_SETTINGS_ID = 1;
export const DEFAULT_INTERVAL_SECONDS = 60;
export const MIN_INTERVAL_SECONDS = 5;
export const MAX_INTERVAL_SECONDS = 3600;
export const DEFAULT_GRAPH_VERSION = "v23.0";
export const SUPPORTED_BOT_MODES: BotMode[] = ["all_posts", "single_post"];
