import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/staff")({
  component: StaffLayout,
});

function StaffLayout() {
  return <Outlet />;
}
