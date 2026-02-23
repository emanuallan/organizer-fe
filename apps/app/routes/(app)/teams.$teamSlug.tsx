import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/teams/$teamSlug")({
  validateSearch: (search: Record<string, unknown>): { fromLeagueId?: string } => ({
    fromLeagueId:
      typeof search.fromLeagueId === "string" ? search.fromLeagueId : undefined,
  }),
  component: TeamSlugLayout,
});

function TeamSlugLayout() {
  return <Outlet />;
}
