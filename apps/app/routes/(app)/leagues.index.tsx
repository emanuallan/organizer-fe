import { getErrorMessage } from "@/lib/errors";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useOrganization } from "@/lib/queries/organization";
import {
  useDeleteLeague,
  useLeagueStats,
  useLeagues,
} from "@/lib/queries/league";
import { toast } from "@/lib/toast";
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
  Search,
  UserPlus,
  Trophy,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/(app)/leagues/")({
  component: LeaguesList,
});

const TABLE_SKELETON_ROWS = 5;
const SEARCH_DEBOUNCE_MS = 800;

function LeaguesList() {
  const { data: organizations } = useOrganization();
  const organizationId = organizations?.[0]?.id;
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const { data: leagues, isPending } = useLeagues(debouncedSearch);
  const { data: stats, isPending: isStatsPending } = useLeagueStats();
  const deleteLeague = useDeleteLeague();
  const [leagueToDelete, setLeagueToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleDeleteConfirm = () => {
    if (!leagueToDelete || !organizationId) return;
    deleteLeague.mutate(
      { organizationId, leagueId: leagueToDelete.id },
      {
        onSuccess: () => {
          toast.success("League deleted");
          setLeagueToDelete(null);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Leagues</h2>
          <p className="text-muted-foreground">
            Manage leagues and their participating teams.
          </p>
        </div>
        <Button className="gap-2" asChild>
          <Link to="/leagues/create">
            <UserPlus className="h-4 w-4" />
            Add League
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leagues</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isStatsPending ? (
              <>
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-3 w-28" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.totalLeagues ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.totalChangePercent !== undefined &&
                  stats.totalChangePercent !== 0
                    ? `${stats.totalChangePercent >= 0 ? "+" : ""}${stats.totalChangePercent}% from last month`
                    : "No change from last month"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leagues</CardTitle>
            <Trophy className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isStatsPending ? (
              <>
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-3 w-24" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.totalLeagues ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  All leagues in organization
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
            {isStatsPending ? (
              <>
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-3 w-28" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.newThisMonth ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.newThisMonthChangePercent !== undefined &&
                  stats.newThisMonthChangePercent !== 0
                    ? `${stats.newThisMonthChangePercent >= 0 ? "+" : ""}${stats.newThisMonthChangePercent}% from last month`
                    : "No change from last month"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>League Management</CardTitle>
          <CardDescription>View and manage all leagues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leagues..."
                className="pl-10"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search leagues by name"
              />
            </div>
          </div>

          <div className="border rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">League</th>
                    <th className="text-left p-4 font-medium">Last updated</th>
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
                              <Skeleton className="h-4 w-20" />
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Skeleton className="h-8 w-16 rounded-md" />
                                <Skeleton className="h-8 w-14 rounded-md" />
                              </div>
                            </td>
                          </tr>
                        ),
                      )
                    : leagues?.map((league) => (
                        <tr key={league.id} className="border-b">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {league.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{league.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  est.{" "}
                                  {new Date(
                                    league.createdAt,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {new Date(
                              league.updatedAt,
                            ).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" asChild>
                                <Link
                                  to="/leagues/$leagueId"
                                  params={{ leagueId: league.id }}
                                >
                                  View
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="cursor-pointer text-destructive hover:text-destructive"
                                onClick={() =>
                                  setLeagueToDelete({
                                    id: league.id,
                                    name: league.name,
                                  })
                                }
                              >
                                Delete
                              </Button>
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
        open={leagueToDelete !== null}
        onOpenChange={(open) => !open && setLeagueToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete league</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{leagueToDelete?.name}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLeagueToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteLeague.isPending}
            >
              {deleteLeague.isPending ? "Deleting…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
