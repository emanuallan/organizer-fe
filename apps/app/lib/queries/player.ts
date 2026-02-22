/**
 * Player (team member) queries and mutations for the current organization.
 */

import { trpcClient } from "@/lib/trpc";
import type { AppRouter } from "@repo/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useOrganization } from "./organization";

export const playerListQueryKey = ["organization", "players"] as const;
export const playerStatsQueryKey = ["organization", "playerStats"] as const;

export type Player =
  inferRouterOutputs<AppRouter>["organization"]["listPlayers"][number];
export type PlayerStats =
  inferRouterOutputs<AppRouter>["organization"]["getPlayerStats"];

export const PLAYER_STATUSES = [
  "active",
  "inactive",
  "banned",
  "suspended",
  "injured",
] as const;
export type PlayerStatus = (typeof PLAYER_STATUSES)[number];

export function usePlayerStats() {
  const { data: organizations } = useOrganization();
  const organizationId = organizations?.[0]?.id;

  return useQuery({
    queryKey: [...playerStatsQueryKey, organizationId ?? ""],
    queryFn: () =>
      trpcClient.organization.getPlayerStats.query({
        organizationId: organizationId!,
      }),
    enabled: Boolean(organizationId),
  });
}

export function usePlayers(options?: {
  search?: string;
  teamId?: string;
}) {
  const { data: organizations } = useOrganization();
  const organizationId = organizations?.[0]?.id;
  const searchTerm = options?.search?.trim() || undefined;
  const teamId = options?.teamId;

  return useQuery({
    queryKey: [
      ...playerListQueryKey,
      organizationId ?? "",
      searchTerm ?? "",
      teamId ?? "",
    ],
    queryFn: () =>
      trpcClient.organization.listPlayers.query({
        organizationId: organizationId!,
        ...(searchTerm ? { search: searchTerm } : {}),
        ...(teamId ? { teamId } : {}),
      }),
    enabled: Boolean(organizationId),
  });
}

export function useAddPlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      organizationId: string;
      teamId: string;
      email: string;
      status?: PlayerStatus;
    }) => trpcClient.organization.addPlayer.mutate(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...playerListQueryKey, variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: [...playerStatsQueryKey, variables.organizationId],
      });
    },
  });
}

export function useUpdatePlayer() {
  const queryClient = useQueryClient();
  const { data: organizations } = useOrganization();
  const organizationId = organizations?.[0]?.id;

  return useMutation({
    mutationFn: (input: {
      organizationId: string;
      playerId: string;
      status: PlayerStatus;
    }) => trpcClient.organization.updatePlayer.mutate(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...playerListQueryKey, variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: [...playerStatsQueryKey, variables.organizationId],
      });
    },
  });
}

export function useRemovePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      organizationId: string;
      playerId: string;
    }) => trpcClient.organization.removePlayer.mutate(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...playerListQueryKey, variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: [...playerStatsQueryKey, variables.organizationId],
      });
    },
  });
}
