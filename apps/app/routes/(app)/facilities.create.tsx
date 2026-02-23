import { getErrorMessage } from "@/lib/errors";
import { useOrganization } from "@/lib/queries/organization";
import { useCreateFacility } from "@/lib/queries/facility";
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
import { ArrowLeft, MapPin } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/(app)/facilities/create")({
  component: CreateFacility,
});

function CreateFacility() {
  const router = useRouter();
  const { data: organizations } = useOrganization();
  const currentOrg = organizations?.[0];
  const organizationId = currentOrg?.id;

  const createFacility = useCreateFacility();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !name.trim()) return;
    createFacility.mutate(
      {
        organizationId,
        name: name.trim(),
        ...(address.trim() ? { address: address.trim() } : {}),
      },
      {
        onSuccess: (data) => {
          toast.success("Facility created");
          router.navigate({ to: "/facilities/$facilityId", params: { facilityId: data.id } });
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
          <Link to="/facilities" aria-label="Back to facilities">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Add Facility</h2>
          <p className="text-muted-foreground">
            Add a venue (e.g. park, community center) where your organization runs games.
          </p>
        </div>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <CardTitle>Facility details</CardTitle>
          </div>
          <CardDescription>
            Enter the facility name and optional address. You can add fields and courts on the next screen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Riverside Park"
                disabled={!organizationId}
                autoFocus
                aria-invalid={createFacility.isError ? true : undefined}
                aria-describedby={createFacility.isError ? "name-error" : undefined}
              />
              {createFacility.isError && (
                <p
                  id="name-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {createFacility.error?.message ?? "Failed to create facility"}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address (optional)</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 123 Main St, City"
                disabled={!organizationId}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={
                  !name.trim() || createFacility.isPending || !organizationId
                }
              >
                {createFacility.isPending ? "Creating…" : "Create facility"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/facilities">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
