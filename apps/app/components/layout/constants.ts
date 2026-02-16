import { Activity, FileText, Home, Settings, Users } from "lucide-react";

export const sidebarItems = [
  { icon: Home, label: "Dashboard", to: "/" },
  { icon: Users, label: "Teams", to: "/teams" },
  { icon: Users, label: "Users", to: "/users" },
  { icon: Users, label: "Matches", to: "/matches" },
  { icon: Activity, label: "Analytics", to: "/analytics" },

  { icon: FileText, label: "Reports", to: "/reports" },
  { icon: Settings, label: "Settings", to: "/settings" },
];
