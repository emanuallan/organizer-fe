import { getErrorMessage } from "@/lib/errors";
import { useRemoveTeamFromLeague } from "@/lib/queries/league";
import { useOrganization } from "@/lib/queries/organization";
import { useTeamBySlug } from "@/lib/queries/team";
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
  Skeleton,
} from "@repo/ui";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Users as UsersIcon } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/(app)/teams/$teamSlug")({
  validateSearch: (search: Record<string, unknown>): { fromLeagueId?: string } => ({
    fromLeagueId:
      typeof search.fromLeagueId === "string" ? search.fromLeagueId : undefined,
  }),
  component: TeamDetail,
});

function TeamDetail() {
  const router = useRouter();
  const { teamSlug } = Route.useParams();
  const { fromLeagueId } = Route.useSearch();
  const { data: organizations } = useOrganization();
  const organizationId = organizations?.[0]?.id;
  const { data: team, isPending, error } = useTeamBySlug(teamSlug);
  const removeTeamFromLeague = useRemoveTeamFromLeague();
  const [showRemoveFromLeagueConfirm, setShowRemoveFromLeagueConfirm] = useState(false);

  const backToLeague = fromLeagueId != null;
  const backLink = backToLeague ? (
    <Link
      to="/leagues/$leagueId"
      params={{ leagueId: fromLeagueId }}
      aria-label="Back to league"
    >
      <ArrowLeft className="h-4 w-4" />
    </Link>
  ) : (
    <Link to="/teams" aria-label="Back to teams">
      <ArrowLeft className="h-4 w-4" />
    </Link>
  );

  const handleRemoveFromLeagueConfirm = () => {
    if (!organizationId || !fromLeagueId || !team?.id) return;
    removeTeamFromLeague.mutate(
      { organizationId, leagueId: fromLeagueId, teamId: team.id },
      {
        onSuccess: () => {
          toast.success("Team removed from league");
          setShowRemoveFromLeagueConfirm(false);
          router.navigate({ to: "/leagues/$leagueId", params: { leagueId: fromLeagueId } });
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  };

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            {backLink}
          </Button>
          <p className="text-destructive">
            {error.message ?? "Team not found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          {backLink}
        </Button>
        <div className="flex-1 min-w-0">
          {isPending ? (
            <>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold">{team?.name}</h2>
              <p className="text-muted-foreground">Team details and members</p>
            </>
          )}
        </div>
        {fromLeagueId != null && team != null && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowRemoveFromLeagueConfirm(true)}
          >
            Remove from league
          </Button>
        )}
      </div>

      {isPending ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ) : team ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5" />
                <CardTitle>Team information</CardTitle>
              </div>
              <CardDescription>Details for {team.name}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Name
                </p>
                <p className="font-medium">{team.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Team Code
                </p>
                <p className="font-mono text-sm">{team.slug}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Status
                </p>
                <span
                  className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                    team.status === "active"
                      ? "bg-green-100 text-green-700"
                      : team.status === "inactive"
                        ? "bg-gray-100 text-gray-700"
                        : team.status === "suspended"
                          ? "bg-amber-100 text-amber-700"
                          : team.status === "banned"
                            ? "bg-red-100 text-red-700"
                            : "bg-muted text-muted-foreground"
                  }`}
                >
                  {team.status ?? "—"}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Created
                </p>
                <p className="text-sm">
                  {new Date(team.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Last updated
                </p>
                <p className="text-sm">
                  {new Date(team.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Players</CardTitle>
              <CardDescription>Members enlisted on this team</CardDescription>
            </CardHeader>
            <CardContent>
              {team.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No players on this team yet.
                </p>
              ) : (
                <div className="border rounded-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-4 font-medium">Player</th>
                          <th className="text-left p-4 font-medium">Email</th>
                          <th className="text-left p-4 font-medium">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {team.members.map((m) => (
                          <tr key={m.id} className="border-b">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarFallback>
                                    {m.user.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("") || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <p className="font-medium">
                                  {m.user.name || "—"}
                                </p>
                              </div>
                            </td>
                            <td className="p-4 text-sm text-muted-foreground">
                              {m.user.email}
                            </td>
                            <td className="p-4 text-sm text-muted-foreground">
                              {new Date(m.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      <Dialog open={showRemoveFromLeagueConfirm} onOpenChange={setShowRemoveFromLeagueConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove team from league</DialogTitle>
            <DialogDescription>
              Remove {team?.name} from this league? The team will no longer participate in the league but will remain in your organization.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveFromLeagueConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveFromLeagueConfirm}
              disabled={removeTeamFromLeague.isPending}
            >
              {removeTeamFromLeague.isPending ? "Removing…" : "Remove from league"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
