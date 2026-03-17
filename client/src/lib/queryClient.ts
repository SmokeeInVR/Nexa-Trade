import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();

export async function apiRequest(method: string, url: string, body?: any): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export function getQueryFn({ on401: unauthorizedBehavior }: { on401: UnauthorizedBehavior }) {
  return async ({ queryKey }: { queryKey: readonly unknown[] }) => {
    const res = await fetch(queryKey[0] as string, { credentials: "include" });
    if (unauthorizedBehavior === "returnNull" && res.status === 401) return null;
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  };
}

queryClient.setDefaultOptions({
  queries: {
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: false,
  },
});
