import { getErrorMessage } from "@/lib/errors";
import { useOrganization } from "@/lib/queries/organization";
import { useCreateTeam } from "@/lib/queries/team";
import { toast } from "@/lib/toast";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@repo/ui";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Users } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/(app)/teams/create")({
  component: CreateTeam,
});

function CreateTeam() {
  const router = useRouter();
  const { data: organizations } = useOrganization();
  const currentOrg = organizations?.[0];
  const organizationId = currentOrg?.id;

  const createTeam = useCreateTeam();
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !name.trim()) return;
    createTeam.mutate(
      { organizationId, name: name.trim() },
      {
        onSuccess: () => {
          toast.success("Team created");
          router.navigate({ to: "/teams" });
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/teams" aria-label="Back to teams">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Create Team</h2>
          <p className="text-muted-foreground">
            Add a new team to your organization.
          </p>
        </div>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Team details</CardTitle>
          </div>
          <CardDescription>Enter the team name.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Team name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!organizationId}
                autoFocus
                aria-invalid={createTeam.isError ? true : undefined}
                aria-describedby={createTeam.isError ? "name-error" : undefined}
              />
              {createTeam.isError && (
                <p
                  id="name-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {createTeam.error?.message ?? "Failed to create team"}
                </p>
              )}
            </div>
            {/* Placeholder for future image field */}
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={
                  !name.trim() || createTeam.isPending || !organizationId
                }
              >
                {createTeam.isPending ? "Creating…" : "Create team"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/teams">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
