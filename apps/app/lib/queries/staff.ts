/**
 * @file Staff (org members) queries.
 *
 * Fetches all members for the current organization with user details.
 * Use useStaff() in components that need the staff list; the query runs only when an org is selected.
 */

import { trpcClient } from "@/lib/trpc";
import type { AppRouter } from "@repo/api";
import { useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useOrganization } from "./organization";

export const staffListQueryKey = ["organization", "staff"] as const;

export type StaffMember =
  inferRouterOutputs<AppRouter>["organization"]["listStaff"][number];

/**
 * Fetches all staff (members) for the current organization, with user id, name, and email.
 * Uses the first organization from useOrganization(); enabled when that org is available.
 */
export function useStaff() {
  const { data: organizations } = useOrganization();
  const currentOrg = organizations?.[0];
  const organizationId = currentOrg?.id;

  return useQuery({
    queryKey: [...staffListQueryKey, organizationId ?? ""],
    queryFn: () =>
      trpcClient.organization.listStaff.query({
        organizationId: organizationId!,
      }),
    enabled: Boolean(organizationId),
  });
}
