import { getErrorMessage } from "@/lib/errors";
import { useOrganization } from "@/lib/queries/organization";
import { useCreateLeague } from "@/lib/queries/league";
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
import { ArrowLeft, Trophy } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/(app)/leagues/create")({
  component: CreateLeague,
});

function CreateLeague() {
  const router = useRouter();
  const { data: organizations } = useOrganization();
  const currentOrg = organizations?.[0];
  const organizationId = currentOrg?.id;

  const createLeague = useCreateLeague();
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !name.trim()) return;
    createLeague.mutate(
      { organizationId, name: name.trim() },
      {
        onSuccess: () => {
          toast.success("League created");
          router.navigate({ to: "/leagues" });
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
          <Link to="/leagues" aria-label="Back to leagues">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Create League</h2>
          <p className="text-muted-foreground">
            Add a new league to your organization.
          </p>
        </div>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            <CardTitle>League details</CardTitle>
          </div>
          <CardDescription>Enter the league name.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">League name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!organizationId}
                autoFocus
                aria-invalid={createLeague.isError ? true : undefined}
                aria-describedby={createLeague.isError ? "name-error" : undefined}
              />
              {createLeague.isError && (
                <p
                  id="name-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {createLeague.error?.message ?? "Failed to create league"}
                </p>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={
                  !name.trim() || createLeague.isPending || !organizationId
                }
              >
                {createLeague.isPending ? "Creating…" : "Create league"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/leagues">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
