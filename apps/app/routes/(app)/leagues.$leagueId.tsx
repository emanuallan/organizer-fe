import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/leagues/$leagueId")({
  component: LeagueLayout,
});

function LeagueLayout() {
  return <Outlet />;
}
