import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/facilities/$facilityId")({
  component: FacilityLayout,
});

function FacilityLayout() {
  return <Outlet />;
}
