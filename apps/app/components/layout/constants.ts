import {
  Calendar,
  MapPin,
  Settings,
  Trophy,
  UserCog,
  UserCircle2,
  UsersRound,
} from "lucide-react";

export const sidebarItems = [
  // { icon: Home, label: "Dashboard", to: "/" },
  { icon: Calendar, label: "Calendar", to: "/Calendar" },
  { icon: Trophy, label: "Leagues", to: "/leagues" },
  { icon: UsersRound, label: "Teams", to: "/teams" },
  { icon: UserCircle2, label: "Players", to: "/players" },
  { icon: MapPin, label: "Facilities", to: "/facilities" },
  { icon: UserCog, label: "Staff", to: "/staff" },
  // { icon: Activity, label: "Analytics", to: "/analytics" },
  // { icon: FileText, label: "Reports", to: "/reports" },
  { icon: Settings, label: "Settings", to: "/settings" },
];
