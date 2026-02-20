import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useDeleteTeam, useTeams } from "@/lib/queries/team";
import {
  Avatar,
  AvatarFallback,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Skeleton,
} from "@repo/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Eye,
  MoreVertical,
  Search,
  Trash2,
  UserPlus,
  Users as UsersIcon,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/(app)/teams/")({
  component: TeamsList,
});

const TABLE_SKELETON_ROWS = 5;

const SEARCH_DEBOUNCE_MS = 800;

function TeamsList() {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const { data: teams, isPending } = useTeams(debouncedSearch);
  const deleteTeam = useDeleteTeam();
  const [openMenuTeamId, setOpenMenuTeamId] = useState<string | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleDeleteConfirm = () => {
    if (!teamToDelete) return;
    deleteTeam.mutate(teamToDelete.id, {
      onSuccess: () => {
        setTeamToDelete(null);
      },
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Teams</h2>
          <p className="text-muted-foreground">
            Manage teams and their members.
          </p>
        </div>
        <Button className="gap-2" asChild>
          <Link to="/teams/create">
            <UserPlus className="h-4 w-4" />
            Add Team
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isPending ? (
              <>
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-3 w-28" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{teams?.length}</div>
                <p className="text-xs text-muted-foreground">
                  +10% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
            <UsersIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isPending ? (
              <>
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-3 w-24" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{teams?.length}</div>
                <p className="text-xs text-muted-foreground">
                  72% of total teams
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              New This Month
            </CardTitle>
            <UserPlus className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {isPending ? (
              <>
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-3 w-28" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">48</div>
                <p className="text-xs text-muted-foreground">
                  +32% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>View and manage all teams</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teams..."
                className="pl-10"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search teams by name"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Team</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Last Active</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isPending
                    ? Array.from({ length: TABLE_SKELETON_ROWS }).map(
                        (_, i) => (
                          <tr key={i} className="border-b">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <Skeleton className="h-9 w-9 rounded-full" />
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-32" />
                                  <Skeleton className="h-3 w-24" />
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <Skeleton className="h-5 w-14 rounded-full" />
                            </td>
                            <td className="p-4">
                              <Skeleton className="h-4 w-20" />
                            </td>
                            <td className="p-4">
                              <Skeleton className="h-8 w-8 rounded-md" />
                            </td>
                          </tr>
                        ),
                      )
                    : teams?.map((team) => (
                        <tr key={team.id} className="border-b">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {team.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{team.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  est.{" "}
                                  {new Date(
                                    team.createdAt,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                "Active" === "Active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {"Active"}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {new Date(team.updatedAt).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <div className="relative">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setOpenMenuTeamId((id) =>
                                    id === team.id ? null : team.id,
                                  )
                                }
                                aria-haspopup="true"
                                aria-expanded={openMenuTeamId === team.id}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                              {openMenuTeamId === team.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-40"
                                    aria-hidden
                                    onClick={() => setOpenMenuTeamId(null)}
                                  />
                                  <div className="absolute right-0 top-full z-50 mt-1 min-w-32 rounded-md border bg-popover py-1 shadow-md">
                                    <Link
                                      to="/teams/$teamSlug"
                                      params={{ teamSlug: team.slug }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                                      onClick={() => setOpenMenuTeamId(null)}
                                    >
                                      <Eye className="h-4 w-4" />
                                      View
                                    </Link>
                                    <button
                                      type="button"
                                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent hover:text-accent-foreground"
                                      onClick={() => {
                                        setTeamToDelete({
                                          id: team.id,
                                          name: team.name,
                                        });
                                        setOpenMenuTeamId(null);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={teamToDelete !== null}
        onOpenChange={(open) => !open && setTeamToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete team</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{teamToDelete?.name}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteTeam.isPending}
            >
              {deleteTeam.isPending ? "Deleting…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
