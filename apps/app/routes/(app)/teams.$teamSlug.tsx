import { useTeamBySlug } from "@/lib/queries/team";
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
import { ArrowLeft, Users as UsersIcon } from "lucide-react";

export const Route = createFileRoute("/(app)/teams/$teamSlug")({
  component: TeamDetail,
});

function TeamDetail() {
  const { teamSlug } = Route.useParams();
  const { data: team, isPending, error } = useTeamBySlug(teamSlug);

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/teams" aria-label="Back to teams">
              <ArrowLeft className="h-4 w-4" />
            </Link>
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
          <Link to="/teams" aria-label="Back to teams">
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
              <h2 className="text-2xl font-bold">{team?.name}</h2>
              <p className="text-muted-foreground">
                Team details and members
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
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="font-medium">{team.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Slug</p>
                <p className="font-mono text-sm">{team.slug}</p>
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
              <CardDescription>
                Members enlisted on this team
              </CardDescription>
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
                          <th className="text-left p-4 font-medium">
                            Joined
                          </th>
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
    </div>
  );
}
