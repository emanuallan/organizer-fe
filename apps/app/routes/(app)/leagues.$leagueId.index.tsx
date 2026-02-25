import { useLeagueById } from "@/lib/queries/league";
import { getLeagueAgeGroupLabel } from "@/lib/league-age-group";
import { getFacilityScheduleGroups } from "@/lib/facility-schedule";
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
import { ArrowLeft, Trophy, Users } from "lucide-react";

function LeagueScheduleDisplay({
  operatingSchedule,
}: {
  operatingSchedule: import("@repo/db/schema/facility").FacilityOperatingSchedule | null | undefined;
}) {
  const groups = getFacilityScheduleGroups(operatingSchedule).filter(
    (g) => g.timeRange !== "Closed",
  );
  if (groups.length === 0) return <p className="text-sm">—</p>;
  return (
    <div className="flex flex-col gap-2">
      {groups.map((group, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex flex-wrap gap-1">
            {group.dayLabels.map((label) => (
              <span
                key={label}
                className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-secondary"
              >
                {label}
              </span>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{group.timeRange}</p>
        </div>
      ))}
    </div>
  );
}

export const Route = createFileRoute("/(app)/leagues/$leagueId/")({
  component: LeagueDetail,
});

function LeagueDetail() {
  const { leagueId } = Route.useParams();
  const { data: league, isPending, error } = useLeagueById(leagueId);

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/leagues" aria-label="Back to leagues">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <p className="text-destructive">
            {error.message ?? "League not found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/leagues" aria-label="Back to leagues">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          {isPending ? (
            <>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold">{league?.name}</h2>
              <p className="text-muted-foreground">
                League details and participating teams
              </p>
            </>
          )}
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link
            to="/leagues/$leagueId/teams"
            params={{ leagueId }}
          >
            <Users className="h-4 w-4 mr-2" />
            {league?.participatingTeams?.length ? "Manage teams" : "Add team to league"}
          </Link>
        </Button>
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
      ) : league ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                <CardTitle>League information</CardTitle>
              </div>
              <CardDescription>Details for {league.name}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Name
                </p>
                <p className="font-medium">{league.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Age group
                </p>
                <p className="text-sm">
                  {getLeagueAgeGroupLabel(league.ageGroup ?? undefined)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Schedule
                </p>
                <LeagueScheduleDisplay operatingSchedule={league.operatingSchedule} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  League code
                </p>
                <p className="font-mono text-sm">{league.slug ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Start date
                </p>
                <p className="text-sm">
                  {league.startDate
                    ? new Date(league.startDate + "T12:00:00").toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  End date
                </p>
                <p className="text-sm">
                  {league.endDate
                    ? new Date(league.endDate + "T12:00:00").toLocaleDateString()
                    : "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Teams participating</CardTitle>
              <CardDescription>Teams enrolled in this league</CardDescription>
            </CardHeader>
            <CardContent>
              {!league.participatingTeams?.length ? (
                <p className="text-sm text-muted-foreground">
                  No teams in this league yet.
                </p>
              ) : (
                <div className="border rounded-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-4 font-medium">Team</th>
                          <th className="text-left p-4 font-medium">Status</th>
                          <th className="text-left p-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {league.participatingTeams.map((t) => (
                          <tr key={t.id} className="border-b">
                            <td className="p-4">
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
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-1 text-xs font-medium rounded-full capitalize bg-secondary">
                                {t.status ?? "—"}
                              </span>
                            </td>
                            <td className="p-4">
                              <Button variant="ghost" size="sm" asChild>
                                <Link
                                  to="/teams/$teamSlug"
                                  params={{ teamSlug: t.slug }}
                                  search={{ fromLeagueId: leagueId }}
                                >
                                  View
                                </Link>
                              </Button>
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
    </div>
  );
}
