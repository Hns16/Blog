import { createRequestId } from "@/src/lib/admin-write-server";

export type AdminRequestContext = {
  route: string;
  requestId: string;
  durationMs: () => number;
};

export function createAdminRequestContext(route: string): AdminRequestContext {
  const startedAt = Date.now();
  return {
    route,
    requestId: createRequestId(),
    durationMs: () => Date.now() - startedAt
  };
}

