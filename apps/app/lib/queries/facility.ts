/**
 * Facility queries for the current user's organization.
 * Facilities are venues (e.g. parks, community centers) with surfaces (fields, courts).
 */

import { trpcClient } from "@/lib/trpc";
import type { AppRouter } from "@repo/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useOrganization } from "./organization";

export const facilityListQueryKey = ["organization", "facilities"] as const;

export type Facility =
  inferRouterOutputs<AppRouter>["organization"]["listFacilities"][number];

export type FacilityWithSurfaces =
  inferRouterOutputs<AppRouter>["organization"]["getFacility"];

export function useFacilities(search?: string) {
  const { data: organizations } = useOrganization();
  const organizationId = organizations?.[0]?.id;
  const searchTerm = search?.trim() || undefined;

  return useQuery({
    queryKey: [...facilityListQueryKey, organizationId ?? "", searchTerm ?? ""],
    queryFn: () =>
      trpcClient.organization.listFacilities.query({
        organizationId: organizationId!,
        ...(searchTerm ? { search: searchTerm } : {}),
      }),
    enabled: Boolean(organizationId),
  });
}

const facilityDetailQueryKey = ["organization", "facility"] as const;

export function useFacility(facilityId: string | undefined) {
  const { data: organizations } = useOrganization();
  const organizationId = organizations?.[0]?.id;

  return useQuery({
    queryKey: [...facilityDetailQueryKey, organizationId ?? "", facilityId ?? ""],
    queryFn: () =>
      trpcClient.organization.getFacility.query({
        organizationId: organizationId!,
        facilityId: facilityId!,
      }),
    enabled: Boolean(organizationId && facilityId),
  });
}

export function useCreateFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      organizationId: string;
      name: string;
      address?: string;
      slug?: string;
      operatingSchedule?: import("@repo/db/schema/facility").FacilityOperatingSchedule;
    }) => trpcClient.organization.createFacility.mutate(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...facilityListQueryKey, variables.organizationId],
      });
    },
  });
}

export function useUpdateFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      organizationId: string;
      facilityId: string;
      name?: string;
      address?: string;
      operatingSchedule?: import("@repo/db/schema/facility").FacilityOperatingSchedule;
    }) => trpcClient.organization.updateFacility.mutate(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...facilityListQueryKey, variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: [...facilityDetailQueryKey, variables.organizationId, variables.facilityId],
      });
    },
  });
}

export function useDeleteFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { organizationId: string; facilityId: string }) =>
      trpcClient.organization.deleteFacility.mutate(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...facilityListQueryKey, variables.organizationId],
      });
      queryClient.removeQueries({
        queryKey: facilityDetailQueryKey,
      });
    },
  });
}

export function useAddFacilitySurface() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      organizationId: string;
      facilityId: string;
      name: string;
      type?: "field" | "court" | "diamond" | "rink" | "other";
    }) => trpcClient.organization.addFacilitySurface.mutate(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...facilityDetailQueryKey, variables.organizationId, variables.facilityId],
      });
    },
  });
}

export function useUpdateFacilitySurface() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      organizationId: string;
      facilityId: string;
      surfaceId: string;
      name?: string;
      type?: "field" | "court" | "diamond" | "rink" | "other";
    }) => trpcClient.organization.updateFacilitySurface.mutate(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...facilityDetailQueryKey, variables.organizationId, variables.facilityId],
      });
    },
  });
}

export function useRemoveFacilitySurface() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      organizationId: string;
      facilityId: string;
      surfaceId: string;
    }) => trpcClient.organization.removeFacilitySurface.mutate(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...facilityDetailQueryKey, variables.organizationId, variables.facilityId],
      });
    },
  });
}
