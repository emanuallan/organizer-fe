import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/facilities")({
  component: FacilitiesLayout,
});

function FacilitiesLayout() {
  return <Outlet />;
}
