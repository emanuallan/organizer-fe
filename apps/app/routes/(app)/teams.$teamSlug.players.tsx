import { getErrorMessage } from "@/lib/errors";
import {
  useAddPlayerToTeam,
  usePlayersAvailableForTeam,
  useRemovePlayerFromTeam,
  useTeamBySlug,
} from "@/lib/queries/team";
import { useOrganization } from "@/lib/queries/organization";
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
  Input,
  Skeleton,
} from "@repo/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Plus, Save, Search, Users as UsersIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PlayerItem = { userId: string; userName: string | null; userEmail: string | null };

function filterPlayers(players: PlayerItem[], query: string): PlayerItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return players;
  return players.filter(
    (p) =>
      (p.userName?.toLowerCase().includes(q) ?? false) ||
      (p.userEmail?.toLowerCase().includes(q) ?? false),
  );
}

export const Route = createFileRoute("/(app)/teams/$teamSlug/players")({
  component: TeamPlayers,
});

function TeamPlayers() {
  const { teamSlug } = Route.useParams();
  const { data: organizations } = useOrganization();
  const organizationId = organizations?.[0]?.id;
  const { data: team, isPending: teamPending } = useTeamBySlug(teamSlug);
  const { data: availablePlayers, isPending: availablePending } =
    usePlayersAvailableForTeam({ teamId: team?.id, search: undefined });
  const addPlayerToTeam = useAddPlayerToTeam();
  const removePlayerFromTeam = useRemovePlayerFromTeam();

  const prevTeamIdRef = useRef<string | null>(null);
  const [initialMemberUserIds, setInitialMemberUserIds] = useState<string[]>([]);
  const [localMemberUserIds, setLocalMemberUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const teamMembers = team?.members ?? [];

  useEffect(() => {
    if (!team?.id || teamMembers === undefined) return;
    if (prevTeamIdRef.current !== team.id) {
      prevTeamIdRef.current = team.id;
      const ids = teamMembers.map((m) => m.userId);
      setInitialMemberUserIds(ids);
      setLocalMemberUserIds(ids);
    }
  }, [team?.id, teamMembers]);

  const allPlayersForDisplay: PlayerItem[] = useMemo(() => {
    const fromMembers = teamMembers.map((m) => ({
      userId: m.userId,
      userName: m.user?.name ?? null,
      userEmail: m.user?.email ?? null,
    }));
    const fromAvailable = (availablePlayers ?? []).map((p) => ({
      userId: p.userId,
      userName: p.userName ?? null,
      userEmail: p.userEmail ?? null,
    }));
    const byUserId = new Map<string, PlayerItem>();
    fromMembers.forEach((p) => byUserId.set(p.userId, p));
    fromAvailable.forEach((p) => byUserId.set(p.userId, p));
    return Array.from(byUserId.values());
  }, [teamMembers, availablePlayers]);

  const participatingDisplay = useMemo(
    () =>
      localMemberUserIds
        .map((userId) => allPlayersForDisplay.find((p) => p.userId === userId))
        .filter((p): p is PlayerItem => p != null),
    [localMemberUserIds, allPlayersForDisplay],
  );

  const availableDisplay = useMemo(
    () =>
      allPlayersForDisplay.filter((p) => !localMemberUserIds.includes(p.userId)),
    [allPlayersForDisplay, localMemberUserIds],
  );

  const participatingFiltered = useMemo(() => {
    const filtered = filterPlayers(participatingDisplay, searchQuery);
    const adminUserId = teamMembers.find((m) => m.role === "admin")?.userId;
    if (!adminUserId) return filtered;
    return [...filtered].sort((a, b) => {
      if (a.userId === adminUserId) return -1;
      if (b.userId === adminUserId) return 1;
      return 0;
    });
  }, [participatingDisplay, searchQuery, teamMembers]);

  const availableFiltered = useMemo(
    () => filterPlayers(availableDisplay, searchQuery),
    [availableDisplay, searchQuery],
  );

  const hasChanges = useMemo(() => {
    if (initialMemberUserIds.length !== localMemberUserIds.length) return true;
    const initialSet = new Set(initialMemberUserIds);
    return localMemberUserIds.some((id) => !initialSet.has(id));
  }, [initialMemberUserIds, localMemberUserIds]);

  const handleAddPlayer = useCallback((userId: string) => {
    setLocalMemberUserIds((prev) => [...prev, userId]);
  }, []);

  const handleRemovePlayer = useCallback((userId: string) => {
    setLocalMemberUserIds((prev) => prev.filter((id) => id !== userId));
  }, []);

  const handleSave = useCallback(async () => {
    if (!organizationId || !team?.id || !hasChanges) return;
    const toAdd = localMemberUserIds.filter(
      (id) => !initialMemberUserIds.includes(id),
    );
    const toRemove = initialMemberUserIds.filter(
      (id) => !localMemberUserIds.includes(id),
    );
    try {
      await Promise.all(
        toAdd.map((userId) =>
          addPlayerToTeam.mutateAsync({
            organizationId,
            teamId: team.id,
            userId,
          }),
        ),
      );
      await Promise.all(
        toRemove.map((userId) =>
          removePlayerFromTeam.mutateAsync({
            organizationId,
            teamId: team.id,
            userId,
          }),
        ),
      );
      setInitialMemberUserIds(localMemberUserIds);
      toast.success("Players saved.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [
    organizationId,
    team?.id,
    hasChanges,
    localMemberUserIds,
    initialMemberUserIds,
    addPlayerToTeam,
    removePlayerFromTeam,
  ]);

  const isSaving =
    addPlayerToTeam.isPending || removePlayerFromTeam.isPending;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link
            to="/teams/$teamSlug"
            params={{ teamSlug }}
            aria-label="Back to team"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          {teamPending ? (
            <Skeleton className="h-8 w-48 mb-2" />
          ) : (
            <>
              <h2 className="text-2xl font-bold">{team?.name}</h2>
              <p className="text-muted-foreground text-sm">
                Manage players on this team. Add or remove below, then press
                Save.
              </p>
            </>
          )}
        </div>
        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="shrink-0"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search players by name or email…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          aria-label="Search players"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            <CardTitle>Players on this team</CardTitle>
          </div>
          <CardDescription>
            Players currently on this team. Add or remove below, then press
            Save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamPending ? (
            <Skeleton className="h-20 w-full rounded-lg" />
          ) : participatingFiltered.length > 0 ? (
            <ul className="space-y-2">
              {participatingFiltered.map((p) => {
                const role = teamMembers.find((m) => m.userId === p.userId)?.role;
                return (
                <li
                  key={p.userId}
                  className="flex items-center justify-between gap-4 p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {(p.userName ?? "?")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{p.userName ?? "—"}</p>
                        {role === "admin" && (
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {p.userEmail ?? "—"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/50 hover:bg-destructive/10"
                    onClick={() => handleRemovePlayer(p.userId)}
                  >
                    Remove from team
                  </Button>
                </li>
              );
              })}
            </ul>
          ) : searchQuery.trim() ? (
            <p className="text-sm text-muted-foreground py-2">
              No players on this team match &quot;{searchQuery}&quot;.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              No players on this team yet. Add one from the list below.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add player to team</CardTitle>
          <CardDescription>
            Organization players not on this team. Add any to this team (then
            press Save).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availablePending ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : availableFiltered.length > 0 ? (
            <ul className="space-y-2">
              {availableFiltered.map((p) => (
                <li
                  key={p.userId}
                  className="flex items-center justify-between gap-4 p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {(p.userName ?? "?")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{p.userName ?? "—"}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.userEmail ?? "—"}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleAddPlayer(p.userId)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add to team
                  </Button>
                </li>
              ))}
            </ul>
          ) : searchQuery.trim() ? (
            <p className="text-sm text-muted-foreground py-2">
              No available players match &quot;{searchQuery}&quot;.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              No players available. All org players are already on this team.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
