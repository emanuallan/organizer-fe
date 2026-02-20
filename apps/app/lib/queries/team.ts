/**
 * @file Team queries for the current user's organizations.
 *
 * Fetches teams for a given organization. Use useTeams(organizationId) in components
 * that need team lists; the query runs only when organizationId is set.
 */

import { trpcClient } from "@/lib/trpc";
import type { AppRouter } from "@repo/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export type TeamBySlug =
  inferRouterOutputs<AppRouter>["organization"]["getTeamBySlug"];

const teamBySlugQueryKey = ["organization", "teamBySlug"] as const;

/**
 * Fetches a single team by slug with members. For use on the team detail page.
 */
export function useTeamBySlug(slug: string | undefined) {
  const { data: organizations } = useOrganization();
  const currentOrg = organizations?.[0];
  const organizationId = currentOrg?.id;

  return useQuery({
    queryKey: [...teamBySlugQueryKey, slug ?? ""],
    queryFn: () =>
      trpcClient.organization.getTeamBySlug.query({ slug: slug! }),
    enabled: Boolean(slug && organizationId),
  });
}

/**
 * Deletes a team. Invalidates the team list on success.
 */
export function useDeleteTeam() {
  const queryClient = useQueryClient();
  const { data: organizations } = useOrganization();
  const currentOrg = organizations?.[0];
  const organizationId = currentOrg?.id;

  return useMutation({
    mutationFn: (teamId: string) =>
      trpcClient.organization.deleteTeam.mutate({ teamId }),
    onSuccess: () => {
      if (organizationId) {
        queryClient.invalidateQueries({
          queryKey: [...teamListQueryKey, organizationId],
        });
      }
      queryClient.removeQueries({ queryKey: teamBySlugQueryKey });
    },
  });
}

/**
 * Creates a team in the given organization. Invalidates the team list on success.
 */
export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { organizationId: string; name: string }) =>
      trpcClient.organization.createTeam.mutate(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...teamListQueryKey, variables.organizationId],
      });
    },
  });
}
