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
  Skeleton,
} from "@repo/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Plus, Users as UsersIcon } from "lucide-react";

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

  const participatingTeams = league?.participatingTeams ?? [];
  const canAddTeam = (availableTeams?.length ?? 0) > 0;

  const handleAddTeam = (teamId: string) => {
    if (!organizationId) return;
    addTeamToLeague.mutate(
      { organizationId, leagueId, teamId },
      {
        onSuccess: () => toast.success("Team added to league"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  const handleRemoveTeam = (teamId: string) => {
    if (!organizationId) return;
    removeTeamFromLeague.mutate(
      { organizationId, leagueId, teamId },
      {
        onSuccess: () => toast.success("Team removed from league"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/leagues/$leagueId" params={{ leagueId }} aria-label="Back to league">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          {leaguePending ? (
            <Skeleton className="h-8 w-48 mb-2" />
          ) : (
            <>
              <h2 className="text-2xl font-bold">{league?.name}</h2>
              <p className="text-muted-foreground text-sm">
                Manage teams in this league
              </p>
            </>
          )}
        </div>
      </div>

      {/* Teams in this league */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            <CardTitle>Teams in this league</CardTitle>
          </div>
          <CardDescription>
            Teams participating in this league. You can add or remove teams below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaguePending ? (
            <Skeleton className="h-20 w-full rounded-lg" />
          ) : participatingTeams.length > 0 ? (
            <ul className="space-y-2">
              {participatingTeams.map((t) => (
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
                      disabled={removeTeamFromLeague.isPending}
                    >
                      {removeTeamFromLeague.isPending ? "Removing…" : "Remove from league"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
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
            Teams in your organization that are not in this league. Add any to this league.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availablePending ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : !canAddTeam ? (
            <p className="text-sm text-muted-foreground py-2">
              No teams available. All your organization's teams are already in this league.
            </p>
          ) : (
            <ul className="space-y-2">
              {availableTeams?.map((t) => (
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
                  <Button
                    size="sm"
                    onClick={() => handleAddTeam(t.id)}
                    disabled={addTeamToLeague.isPending}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {addTeamToLeague.isPending ? "Adding…" : "Add to league"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
