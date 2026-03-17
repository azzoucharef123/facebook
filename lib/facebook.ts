import "server-only";

import { DEFAULT_GRAPH_VERSION } from "./constants";
import { sleep } from "./utils";

type GraphRequestOptions = {
  accessToken: string;
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, string | number | boolean | undefined | null>;
};

type FacebookErrorPayload = {
  error?: {
    message?: string;
    code?: number;
    type?: string;
    error_subcode?: number;
    is_transient?: boolean;
  };
};
export type FacebookPagePost = {
  id: string;
  message?: string;
  created_time?: string;
};

export type FacebookComment = {
  id: string;
  message?: string;
  created_time?: string;
  from?: {
    id?: string;
    name?: string;
  };
  parent?: {
    id?: string;
  };
};

function getGraphBaseUrl() {
  const version = process.env.FACEBOOK_GRAPH_VERSION || DEFAULT_GRAPH_VERSION;
  return "https://graph.facebook.com/" + version;
}
function buildUrl(path: string, accessToken: string, query: GraphRequestOptions["query"] = {}) {
  const search = new URLSearchParams();
  search.set("access_token", accessToken);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }

  return getGraphBaseUrl() + path + "?" + search.toString();
}

function shouldRetry(status: number, payload: FacebookErrorPayload) {
  return status >= 500 || status === 429 || payload.error?.is_transient === true || payload.error?.code === 2;
}

async function graphRequest<T>(path: string, options: GraphRequestOptions, attempt = 0): Promise<T> {
  const method = options.method ?? "GET";
  const response = await fetch(buildUrl(path, options.accessToken, options.query), {
    method,
    headers: method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : undefined,
    body: method === "POST" && options.body ? new URLSearchParams(Object.entries(options.body).filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => [key, String(value)])).toString() : undefined,
    cache: "no-store"
  });

  const payload = (await response.json()) as FacebookErrorPayload & T;

  if ((!response.ok || payload.error) && attempt < 2 && shouldRetry(response.status, payload)) {
    await sleep((attempt + 1) * 1000);
    return graphRequest<T>(path, options, attempt + 1);
  }
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || "Facebook Graph API request failed with status " + response.status + ".");
  }

  return payload;
}

export async function testPageConnection(pageId: string, accessToken: string) {
  return graphRequest<{ id: string; name: string }>("/" + pageId, {
    accessToken,
    query: { fields: "id,name" }
  });
}

export async function getPagePosts(pageId: string, accessToken: string) {
  const payload = await graphRequest<{ data: FacebookPagePost[] }>("/" + pageId + "/posts", {
    accessToken,
    query: { fields: "id,message,created_time", limit: 15 }
  });

  return payload.data ?? [];
}

export async function getPostComments(postId: string, accessToken: string) {
  const payload = await graphRequest<{ data: FacebookComment[] }>("/" + postId + "/comments", {
    accessToken,
    query: { fields: "id,message,created_time,from{id,name},parent{id}", filter: "stream", limit: 100 }
  });

  return payload.data ?? [];
}
export async function likeComment(commentId: string, accessToken: string) {
  return graphRequest<{ success: boolean }>("/" + commentId + "/likes", {
    accessToken,
    method: "POST"
  });
}

export async function replyToComment(commentId: string, accessToken: string, message: string) {
  return graphRequest<{ id: string }>("/" + commentId + "/comments", {
    accessToken,
    method: "POST",
    body: { message }
  });
}

export async function sendPrivateReply(commentId: string, accessToken: string, message: string) {
  return graphRequest<{ success: boolean }>("/" + commentId + "/private_replies", {
    accessToken,
    method: "POST",
    body: { message }
  });
}
