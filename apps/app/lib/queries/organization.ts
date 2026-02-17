/**
 * @file Organization state for the current user.
 *
 * Fetches the user's memberships (member + organization) once session is available.
 * Use useOrganization() in components that need org info; it does not fetch until the user is authenticated.
 */

import { trpcClient } from "@/lib/trpc";
import type { AppRouter } from "@repo/api";
import { useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useSessionQuery } from "./session";

export const organizationQueryKey = ["organization", "memberships"] as const;

export type OrganizationMembership =
  inferRouterOutputs<AppRouter>["organization"]["memberships"][number];

/**
 * Fetches the current user's organization memberships (member + organization rows).
 * Automatically enabled when session user is available; does not run when unauthenticated.
 */
export function useOrganization() {
  const { data: session } = useSessionQuery();

  return useQuery({
    queryKey: organizationQueryKey,
    queryFn: () => trpcClient.organization.memberships.query(),
    enabled: session?.user != null,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
