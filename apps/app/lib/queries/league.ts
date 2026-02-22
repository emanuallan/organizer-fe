/**
 * League queries for the current organization.
 */

import { trpcClient } from "@/lib/trpc";
import type { AppRouter } from "@repo/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useOrganization } from "./organization";

export const leagueListQueryKey = ["organization", "leagues"] as const;
export const leagueStatsQueryKey = ["organization", "leagueStats"] as const;

export type League =
  inferRouterOutputs<AppRouter>["organization"]["listLeagues"][number];
export type LeagueStats =
  inferRouterOutputs<AppRouter>["organization"]["getLeagueStats"];
export type LeagueById =
  inferRouterOutputs<AppRouter>["organization"]["getLeagueById"];

export function useLeagueStats() {
  const { data: organizations } = useOrganization();
  const organizationId = organizations?.[0]?.id;

  return useQuery({
    queryKey: [...leagueStatsQueryKey, organizationId ?? ""],
    queryFn: () =>
      trpcClient.organization.getLeagueStats.query({
        organizationId: organizationId!,
      }),
    enabled: Boolean(organizationId),
  });
}

export function useLeagues(search?: string) {
  const { data: organizations } = useOrganization();
  const organizationId = organizations?.[0]?.id;
  const searchTerm = search?.trim() || undefined;

  return useQuery({
    queryKey: [...leagueListQueryKey, organizationId ?? "", searchTerm ?? ""],
    queryFn: () =>
      trpcClient.organization.listLeagues.query({
        organizationId: organizationId!,
        ...(searchTerm ? { search: searchTerm } : {}),
      }),
    enabled: Boolean(organizationId),
  });
}

export function useLeagueById(leagueId: string | undefined) {
  const { data: organizations } = useOrganization();
  const organizationId = organizations?.[0]?.id;

  return useQuery({
    queryKey: ["organization", "leagueById", leagueId ?? "", organizationId ?? ""],
    queryFn: () =>
      trpcClient.organization.getLeagueById.query({
        leagueId: leagueId!,
        organizationId: organizationId!,
      }),
    enabled: Boolean(leagueId && organizationId),
  });
}

export function useDeleteLeague() {
  const queryClient = useQueryClient();
  const { data: organizations } = useOrganization();
  const organizationId = organizations?.[0]?.id;

  return useMutation({
    mutationFn: (payload: {
      organizationId: string;
      leagueId: string;
    }) => trpcClient.organization.deleteLeague.mutate(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...leagueListQueryKey, variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: [...leagueStatsQueryKey, variables.organizationId],
      });
      queryClient.removeQueries({ queryKey: ["organization", "leagueById"] });
    },
  });
}

export function useCreateLeague() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      organizationId: string;
      name: string;
      image?: string;
    }) => trpcClient.organization.createLeague.mutate(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...leagueListQueryKey, variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: [...leagueStatsQueryKey, variables.organizationId],
      });
    },
  });
}

export function useRemoveTeamFromLeague() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      organizationId: string;
      leagueId: string;
      teamId: string;
    }) => trpcClient.organization.removeTeamFromLeague.mutate(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["organization", "leagueById"],
      });
      queryClient.invalidateQueries({
        queryKey: [...leagueListQueryKey, variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["organization", "teamsAvailableForLeague", variables.leagueId],
      });
    },
  });
}

export type TeamAvailableForLeague =
  inferRouterOutputs<AppRouter>["organization"]["listTeamsAvailableForLeague"][number];

export function useTeamsAvailableForLeague(leagueId: string | undefined) {
  const { data: organizations } = useOrganization();
  const organizationId = organizations?.[0]?.id;

  return useQuery({
    queryKey: [
      "organization",
      "teamsAvailableForLeague",
      leagueId ?? "",
      organizationId ?? "",
    ],
    queryFn: () =>
      trpcClient.organization.listTeamsAvailableForLeague.query({
        organizationId: organizationId!,
        leagueId: leagueId!,
      }),
    enabled: Boolean(organizationId && leagueId),
  });
}

export function useAddTeamToLeague() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      organizationId: string;
      leagueId: string;
      teamId: string;
    }) => trpcClient.organization.addTeamToLeague.mutate(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["organization", "leagueById"],
      });
      queryClient.invalidateQueries({
        queryKey: [...leagueListQueryKey, variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["organization", "teamsAvailableForLeague", variables.leagueId],
      });
    },
  });
}
