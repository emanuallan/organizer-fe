import { useLeagueById } from "@/lib/queries/league";
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
import { ArrowLeft, Trophy, Users as UsersIcon } from "lucide-react";

export const Route = createFileRoute("/(app)/leagues/$leagueId")({
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
        <div>
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
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="font-medium">{league.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Status
                </p>
                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                  Placeholder
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Created
                </p>
                <p className="text-sm">
                  {new Date(league.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Last updated
                </p>
                <p className="text-sm">
                  {new Date(league.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Teams participating</CardTitle>
              <CardDescription>
                Teams enrolled in this league
              </CardDescription>
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
                                  <p className="text-sm text-muted-foreground font-mono">
                                    {t.slug}
                                  </p>
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
