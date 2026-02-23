import { getErrorMessage } from "@/lib/errors";
import {
  useAddTeamToLeague,
  useLeagueById,
  useRemoveTeamFromLeague,
  useTeamsAvailableForLeague,
} from "@/lib/queries/league";
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

type TeamItem = { id: string; name: string; slug: string };

function filterTeams(teams: TeamItem[], query: string): TeamItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return teams;
  return teams.filter(
    (t) =>
      t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q),
  );
}

export const Route = createFileRoute("/(app)/leagues/$leagueId/teams")({
  component: LeagueTeams,
});

function LeagueTeams() {
  const { leagueId } = Route.useParams();
  const { data: organizations } = useOrganization();
  const organizationId = organizations?.[0]?.id;
  const { data: league, isPending: leaguePending } = useLeagueById(leagueId);
  const { data: availableTeams, isPending: availablePending } =
    useTeamsAvailableForLeague(leagueId);
  const addTeamToLeague = useAddTeamToLeague();
  const removeTeamFromLeague = useRemoveTeamFromLeague();

  const prevLeagueIdRef = useRef<string | null>(null);
  const [initialParticipatingIds, setInitialParticipatingIds] = useState<
    string[]
  >([]);
  const [localParticipatingIds, setLocalParticipatingIds] = useState<string[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = useState("");

  const participatingTeams = league?.participatingTeams ?? [];

  // Sync from server when league loads or leagueId changes
  useEffect(() => {
    if (!leagueId || participatingTeams === undefined) return;
    if (prevLeagueIdRef.current !== leagueId) {
      prevLeagueIdRef.current = leagueId;
      const ids = participatingTeams.map((t) => t.id);
      setInitialParticipatingIds(ids);
      setLocalParticipatingIds(ids);
    }
  }, [leagueId, participatingTeams]);

  const allTeams: TeamItem[] = useMemo(() => {
    const byId = new Map<string, TeamItem>();
    participatingTeams.forEach((t) => byId.set(t.id, { id: t.id, name: t.name, slug: t.slug }));
    (availableTeams ?? []).forEach((t) => byId.set(t.id, { id: t.id, name: t.name, slug: t.slug }));
    return Array.from(byId.values());
  }, [participatingTeams, availableTeams]);

  const participatingDisplay = useMemo(
    () =>
      localParticipatingIds
        .map((id) => allTeams.find((t) => t.id === id))
        .filter((t): t is TeamItem => t != null),
    [localParticipatingIds, allTeams],
  );

  const availableDisplay = useMemo(
    () => allTeams.filter((t) => !localParticipatingIds.includes(t.id)),
    [allTeams, localParticipatingIds],
  );

  const participatingFiltered = useMemo(
    () => filterTeams(participatingDisplay, searchQuery),
    [participatingDisplay, searchQuery],
  );

  const availableFiltered = useMemo(
    () => filterTeams(availableDisplay, searchQuery),
    [availableDisplay, searchQuery],
  );

  const hasChanges = useMemo(() => {
    if (initialParticipatingIds.length !== localParticipatingIds.length)
      return true;
    const initialSet = new Set(initialParticipatingIds);
    return localParticipatingIds.some((id) => !initialSet.has(id));
  }, [initialParticipatingIds, localParticipatingIds]);

  const handleAddTeam = useCallback((teamId: string) => {
    setLocalParticipatingIds((prev) => [...prev, teamId]);
  }, []);

  const handleRemoveTeam = useCallback((teamId: string) => {
    setLocalParticipatingIds((prev) => prev.filter((id) => id !== teamId));
  }, []);

  const handleSave = useCallback(async () => {
    if (!organizationId || !hasChanges) return;
    const toAdd = localParticipatingIds.filter(
      (id) => !initialParticipatingIds.includes(id),
    );
    const toRemove = initialParticipatingIds.filter(
      (id) => !localParticipatingIds.includes(id),
    );
    try {
      await Promise.all(
        toAdd.map((teamId) =>
          addTeamToLeague.mutateAsync({
            organizationId,
            leagueId,
            teamId,
          }),
        ),
      );
      await Promise.all(
        toRemove.map((teamId) =>
          removeTeamFromLeague.mutateAsync({
            organizationId,
            leagueId,
            teamId,
          }),
        ),
      );
      setInitialParticipatingIds(localParticipatingIds);
      toast.success("Teams saved.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [
    organizationId,
    leagueId,
    hasChanges,
    localParticipatingIds,
    initialParticipatingIds,
    addTeamToLeague,
    removeTeamFromLeague,
  ]);

  const isSaving =
    addTeamToLeague.isPending || removeTeamFromLeague.isPending;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link
            to="/leagues/$leagueId"
            params={{ leagueId }}
            aria-label="Back to league"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          {leaguePending ? (
            <Skeleton className="h-8 w-48 mb-2" />
          ) : (
            <>
              <h2 className="text-2xl font-bold">{league?.name}</h2>
              <p className="text-muted-foreground text-sm">
                Manage teams in this league. Changes are saved when you press
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search teams by name or slug…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          aria-label="Search teams"
        />
      </div>

      {/* Teams in this league */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            <CardTitle>Teams in this league</CardTitle>
          </div>
          <CardDescription>
            Teams participating in this league. Add or remove below, then press
            Save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaguePending ? (
            <Skeleton className="h-20 w-full rounded-lg" />
          ) : participatingFiltered.length > 0 ? (
            <ul className="space-y-2">
              {participatingFiltered.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-4 p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {t.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {t.slug}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        to="/teams/$teamSlug"
                        params={{ teamSlug: t.slug }}
                        search={{ fromLeagueId: leagueId }}
                      >
                        View
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/50 hover:bg-destructive/10"
                      onClick={() => handleRemoveTeam(t.id)}
                    >
                      Remove from league
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : searchQuery.trim() ? (
            <p className="text-sm text-muted-foreground py-2">
              No teams in this league match &quot;{searchQuery}&quot;.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              No teams in this league yet. Add one from the list below.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Available teams to add */}
      <Card>
        <CardHeader>
          <CardTitle>Add team to league</CardTitle>
          <CardDescription>
            Teams in your organization that are not in this league. Add any to
            this league (then press Save).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availablePending ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : availableFiltered.length > 0 ? (
            <ul className="space-y-2">
              {availableFiltered.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-4 p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {t.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {t.slug}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleAddTeam(t.id)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add to league
                  </Button>
                </li>
              ))}
            </ul>
          ) : searchQuery.trim() ? (
            <p className="text-sm text-muted-foreground py-2">
              No available teams match &quot;{searchQuery}&quot;.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              No teams available. All your organization&apos;s teams are already
              in this league.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
