/**
 * @file Staff (org members) queries.
 *
 * Fetches all members for the current organization with user details.
 * Use useStaff() in components that need the staff list; the query runs only when an org is selected.
 */

import { trpcClient } from "@/lib/trpc";
import type { AppRouter } from "@repo/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useOrganization } from "./organization";

export const staffListQueryKey = ["organization", "staff"] as const;

export const STAFF_ROLES = ["admin", "editor", "viewer"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export type StaffMember =
  inferRouterOutputs<AppRouter>["organization"]["listStaff"][number];

/**
 * Fetches all staff (members) for the current organization, with user id, name, and email.
 * Optional search by name or email. Uses the first organization from useOrganization(); enabled when that org is available.
 */
export function useStaff(search?: string) {
  const { data: organizations } = useOrganization();
  const currentOrg = organizations?.[0];
  const organizationId = currentOrg?.id;
  const searchTerm = search?.trim() || undefined;

  return useQuery({
    queryKey: [...staffListQueryKey, organizationId ?? "", searchTerm ?? ""],
    queryFn: () =>
      trpcClient.organization.listStaff.query({
        organizationId: organizationId!,
        ...(searchTerm ? { search: searchTerm } : {}),
      }),
    enabled: Boolean(organizationId),
  });
}

/**
 * Adds staff: adds existing user as member or creates an invitation. Invalidates staff list on success.
 */
export function useAddStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      organizationId: string;
      name: string;
      email: string;
      role: StaffRole;
    }) => trpcClient.organization.addStaff.mutate(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...staffListQueryKey, variables.organizationId],
      });
    },
  });
}

/**
 * Updates a staff member's role. Invalidates staff list on success.
 */
export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      organizationId: string;
      memberId: string;
      role: StaffRole;
    }) => trpcClient.organization.updateStaff.mutate(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...staffListQueryKey, variables.organizationId],
      });
    },
  });
}

/**
 * Removes a staff member from the organization. Invalidates staff list on success. Cannot remove yourself.
 */
export function useRemoveStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      organizationId: string;
      memberId: string;
    }) => trpcClient.organization.removeStaff.mutate(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...staffListQueryKey, variables.organizationId],
      });
    },
  });
}
