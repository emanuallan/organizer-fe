import { getErrorMessage } from "@/lib/errors";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useOrganization } from "@/lib/queries/organization";
import {
  type Player,
  type PlayerStatus,
  PLAYER_STATUSES,
  useAddPlayer,
  usePlayerStats,
  usePlayers,
  useRemovePlayer,
  useUpdatePlayer,
} from "@/lib/queries/player";
import { useTeams } from "@/lib/queries/team";
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
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Search, UserPlus, Users as UsersIcon } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/(app)/players")({
  component: Players,
});

const TABLE_SKELETON_ROWS = 5;
const SEARCH_DEBOUNCE_MS = 800;

const PLAYER_STATUS_STYLES: Record<
  string,
  { className: string; label: string }
> = {
  active: { className: "bg-green-100 text-green-700", label: "Active" },
  inactive: { className: "bg-gray-100 text-gray-700", label: "Inactive" },
  suspended: { className: "bg-amber-100 text-amber-700", label: "Suspended" },
  banned: { className: "bg-red-100 text-red-700", label: "Banned" },
  injured: { className: "bg-orange-100 text-orange-700", label: "Injured" },
};

function getStatusStyle(status: string) {
  return (
    PLAYER_STATUS_STYLES[status] ?? {
      className: "bg-muted text-muted-foreground",
      label: status || "—",
    }
  );
}

function Players() {
  const { data: organizations } = useOrganization();
  const organizationId = organizations?.[0]?.id;
  const [searchInput, setSearchInput] = useState("");
  const [teamFilterId, setTeamFilterId] = useState<string>("__all__");
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const { data: players, isPending } = usePlayers({
    search: debouncedSearch,
    teamId:
      teamFilterId === "__all__" || !teamFilterId ? undefined : teamFilterId,
  });
  const { data: stats, isPending: isStatsPending } = usePlayerStats();
  const { data: teams } = useTeams();
  const addPlayer = useAddPlayer();
  const updatePlayer = useUpdatePlayer();
  const removePlayer = useRemovePlayer();

  const [addOpen, setAddOpen] = useState(false);
  const [addTeamId, setAddTeamId] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addStatus, setAddStatus] = useState<PlayerStatus>("inactive");

  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editStatus, setEditStatus] = useState<PlayerStatus>("inactive");

  const [playerToRemove, setPlayerToRemove] = useState<Player | null>(null);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !addTeamId || !addEmail.trim()) return;
    addPlayer.mutate(
      {
        organizationId,
        teamId: addTeamId,
        email: addEmail.trim(),
        status: addStatus,
      },
      {
        onSuccess: () => {
          toast.success("Player added to team");
          setAddOpen(false);
          setAddTeamId("");
          setAddEmail("");
          setAddStatus("inactive");
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  };

  const handleEditOpen = (player: Player) => {
    setEditingPlayer(player);
    setEditStatus((player.status ?? "inactive") as PlayerStatus);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !editingPlayer) return;
    updatePlayer.mutate(
      {
        organizationId,
        playerId: editingPlayer.id,
        status: editStatus,
      },
      {
        onSuccess: () => {
          toast.success("Player status updated");
          setEditingPlayer(null);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  };

  const handleRemoveConfirm = () => {
    if (!organizationId || !playerToRemove) return;
    removePlayer.mutate(
      { organizationId, playerId: playerToRemove.id },
      {
        onSuccess: () => {
          toast.success("Player removed from team");
          setPlayerToRemove(null);
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
          <h2 className="text-2xl font-bold">Players</h2>
          <p className="text-muted-foreground">
            Manage player accounts and team assignments.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Add Player
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
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
                  {stats?.totalPlayers ?? 0}
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
            <CardTitle className="text-sm font-medium">
              Active Players
            </CardTitle>
            <UsersIcon className="h-4 w-4 text-green-600" />
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
                  {stats?.activePlayers ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.totalPlayers != null && stats.totalPlayers > 0
                    ? `${stats?.activePercent ?? 0}% of total players`
                    : "No players yet"}
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

      {/* Player List */}
      <Card>
        <CardHeader>
          <CardTitle>Player Management</CardTitle>
          <CardDescription>
            View and manage all players, including free agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-10"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search players"
              />
            </div>
            <Select value={teamFilterId} onValueChange={setTeamFilterId}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All teams</SelectItem>
                {teams?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Player</th>
                    <th className="text-left p-4 font-medium">Team</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Joined</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isPending ? (
                    Array.from({ length: TABLE_SKELETON_ROWS }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-9 w-9 rounded-full" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-40" />
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-5 w-14 rounded-full" />
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
                    ))
                  ) : (players?.length ?? 0) === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-muted-foreground"
                      >
                        No players found. Add a player to a team or add a free agent to get started.
                      </td>
                    </tr>
                  ) : (
                    players?.map((player) => {
                      const { className, label } = getStatusStyle(
                        player.status ?? "inactive",
                      );
                      return (
                        <tr key={player.id} className="border-b">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {player.userName
                                    ?.split(" ")
                                    .map((n) => n[0])
                                    .join("") ?? "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {player.userName ?? "—"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {player.userEmail ?? "—"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-sm">
                              {player.teamName ?? "Free agent"}
                            </span>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${className}`}
                            >
                              {label}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {player.createdAt
                              ? new Date(player.createdAt).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditOpen(player)}
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="cursor-pointer text-destructive hover:text-destructive"
                                onClick={() => setPlayerToRemove(player)}
                              >
                                Remove
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Player Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Player</DialogTitle>
            <DialogDescription>
              Add an existing user to a team by email. The user must already
              have an account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="add-team">Team</Label>
              <Select value={addTeamId} onValueChange={setAddTeamId} required>
                <SelectTrigger id="add-team">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="user@example.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-status">Status</Label>
              <Select
                value={addStatus}
                onValueChange={(v) => setAddStatus(v as PlayerStatus)}
              >
                <SelectTrigger id="add-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAYER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {getStatusStyle(s).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addPlayer.isPending}>
                {addPlayer.isPending ? "Adding…" : "Add Player"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      <Dialog
        open={editingPlayer !== null}
        onOpenChange={(open) => !open && setEditingPlayer(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit player status</DialogTitle>
            <DialogDescription>
              Update status for{" "}
              {editingPlayer?.userName ??
                editingPlayer?.userEmail ??
                "this player"}
              .
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={editStatus}
                onValueChange={(v) => setEditStatus(v as PlayerStatus)}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAYER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {getStatusStyle(s).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingPlayer(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updatePlayer.isPending}>
                {updatePlayer.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Confirm Dialog */}
      <Dialog
        open={playerToRemove !== null}
        onOpenChange={(open) => !open && setPlayerToRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove player</DialogTitle>
            <DialogDescription>
              Remove{" "}
              {playerToRemove?.userName ??
                playerToRemove?.userEmail ??
                "this player"}{" "}
              from the roster? They will be removed from any team assignments and
              can be added again later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlayerToRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveConfirm}
              disabled={removePlayer.isPending}
            >
              {removePlayer.isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
