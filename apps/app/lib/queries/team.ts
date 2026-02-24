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

export const teamStatsQueryKey = ["organization", "teamStats"] as const;

export type Team =
  inferRouterOutputs<AppRouter>["organization"]["listTeams"][number];

export type TeamStats =
  inferRouterOutputs<AppRouter>["organization"]["getTeamStats"];

/**
 * Fetches team statistics for the current org (total, active, new this month, and percentage deltas).
 * Used to fill the stats cards on the teams page.
 */
export function useTeamStats() {
  const { data: organizations } = useOrganization();
  const currentOrg = organizations?.[0];
  const organizationId = currentOrg?.id;

  return useQuery({
    queryKey: [...teamStatsQueryKey, organizationId ?? ""],
    queryFn: () =>
      trpcClient.organization.getTeamStats.query({
        organizationId: organizationId!,
      }),
    enabled: Boolean(organizationId),
  });
}

/**
 * Fetches teams for the given organization, optionally filtered by name (debounced search).
 * Automatically enabled when organizationId is set; requires the user to be a member of the org.
 */
export function useTeams(search?: string) {
  const { data: organizations } = useOrganization();
  const currentOrg = organizations?.[0];
  const organizationId = currentOrg?.id;
  const searchTerm = search?.trim() || undefined;

  return useQuery({
    queryKey: [...teamListQueryKey, organizationId ?? "", searchTerm ?? ""],
    queryFn: () =>
      trpcClient.organization.listTeams.query({
        organizationId: organizationId!,
        ...(searchTerm ? { search: searchTerm } : {}),
      }),
    enabled: Boolean(organizationId),
  });
}

export type TeamBySlug =
  inferRouterOutputs<AppRouter>["organization"]["getTeamBySlug"];

const teamBySlugQueryKey = ["organization", "teamBySlug"] as const;

/**
 * Fetches a single team by slug with members (for current org's link). For use on the team detail page.
 */
export function useTeamBySlug(slug: string | undefined) {
  const { data: organizations } = useOrganization();
  const currentOrg = organizations?.[0];
  const organizationId = currentOrg?.id;

  return useQuery({
    queryKey: [...teamBySlugQueryKey, slug ?? "", organizationId ?? ""],
    queryFn: () =>
      trpcClient.organization.getTeamBySlug.query({
        slug: slug!,
        organizationId: organizationId!,
      }),
    enabled: Boolean(slug && organizationId),
  });
}

/**
 * Deletes a team from the organization. Invalidates the team list on success.
 */
export function useDeleteTeam() {
  const queryClient = useQueryClient();
  const { data: organizations } = useOrganization();
  const currentOrg = organizations?.[0];
  const organizationId = currentOrg?.id;

  return useMutation({
    mutationFn: (payload: { organizationId: string; teamId: string }) =>
      trpcClient.organization.deleteTeam.mutate(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...teamListQueryKey, variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: [...teamStatsQueryKey, variables.organizationId],
      });
      queryClient.removeQueries({ queryKey: teamBySlugQueryKey });
    },
  });
}

/**
 * Creates a team in the given organization with a designated team admin. Invalidates the team list on success.
 */
export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      organizationId: string;
      name: string;
      adminUserId: string;
    }) => trpcClient.organization.createTeam.mutate(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...teamListQueryKey, variables.organizationId],
      });
    },
  });
}

const teamPlayersAvailableQueryKey = [
  "organization",
  "playersAvailableForTeam",
] as const;

export type PlayerAvailableForTeam =
  inferRouterOutputs<AppRouter>["organization"]["listPlayersAvailableForTeam"][number];

export function usePlayersAvailableForTeam(options: {
  teamId: string | undefined;
  search?: string;
}) {
  const { data: organizations } = useOrganization();
  const organizationId = organizations?.[0]?.id;
  const searchTerm = options.search?.trim() || undefined;

  return useQuery({
    queryKey: [
      ...teamPlayersAvailableQueryKey,
      organizationId ?? "",
      options.teamId ?? "",
      searchTerm ?? "",
    ],
    queryFn: () =>
      trpcClient.organization.listPlayersAvailableForTeam.query({
        organizationId: organizationId!,
        teamId: options.teamId!,
        ...(searchTerm ? { search: searchTerm } : {}),
      }),
    enabled: Boolean(organizationId && options.teamId),
  });
}

export function useAddPlayerToTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      organizationId: string;
      teamId: string;
      userId: string;
    }) => trpcClient.organization.addPlayerToTeam.mutate(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...teamPlayersAvailableQueryKey, variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: teamBySlugQueryKey,
      });
    },
  });
}

export function useRemovePlayerFromTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      organizationId: string;
      teamId: string;
      userId: string;
    }) => trpcClient.organization.removePlayerFromTeam.mutate(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...teamPlayersAvailableQueryKey, variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: teamBySlugQueryKey,
      });
    },
  });
}
