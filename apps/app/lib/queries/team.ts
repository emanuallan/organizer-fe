/**
 * @file Team queries for the current user's organizations.
 *
 * Fetches teams for a given organization. Use useTeams(organizationId) in components
 * that need team lists; the query runs only when organizationId is set.
 */

import { trpcClient } from "@/lib/trpc";
import type { AppRouter } from "@repo/api";
import { useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useOrganization } from "./organization";

export const teamListQueryKey = ["organization", "teams"] as const;

export type Team =
  inferRouterOutputs<AppRouter>["organization"]["listTeams"][number];

/**
 * Fetches all teams for the given organization.
 * Automatically enabled when organizationId is set; requires the user to be a member of the org.
 */
export function useTeams() {
  const { data: organizations } = useOrganization();
  const currentOrg = organizations?.[0];
  const organizationId = currentOrg?.id;

  return useQuery({
    queryKey: [...teamListQueryKey, organizationId ?? ""],
    queryFn: () =>
      trpcClient.organization.listTeams.query({
        organizationId: organizationId!,
      }),
    enabled: Boolean(organizationId),
  });
}
