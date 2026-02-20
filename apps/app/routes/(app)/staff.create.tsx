import { getErrorMessage } from "@/lib/errors";
import { useOrganization } from "@/lib/queries/organization";
import { toast } from "@/lib/toast";
import { STAFF_ROLES, type StaffRole, useAddStaff } from "@/lib/queries/staff";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/(app)/staff/create")({
  component: CreateStaff,
});

const ROLE_LABELS: Record<StaffRole, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

function CreateStaff() {
  const router = useRouter();
  const { data: organizations } = useOrganization();
  const currentOrg = organizations?.[0];
  const organizationId = currentOrg?.id;

  const addStaff = useAddStaff();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("viewer");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !name.trim() || !email.trim()) return;
    addStaff.mutate(
      {
        organizationId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
      },
      {
        onSuccess: (data) => {
          if (data.type === "member") {
            toast.success("Staff member added");
          } else {
            toast.success("Invitation sent");
          }
          router.navigate({ to: "/staff" });
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
          <Link to="/staff" aria-label="Back to staff">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Add Staff</h2>
          <p className="text-muted-foreground">
            Add a new staff member or send an invitation.
          </p>
        </div>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            <CardTitle>Staff details</CardTitle>
          </div>
          <CardDescription>
            Enter name, email, and role. If they already have an account they’re
            added to the org right away. Otherwise an email is sent with a link
            to accept the invitation (they sign up or sign in, then accept).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!organizationId}
                autoFocus
                aria-invalid={addStaff.isError ? true : undefined}
                aria-describedby={addStaff.isError ? "form-error" : undefined}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!organizationId}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as StaffRole)}
                disabled={!organizationId}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {addStaff.isError && (
              <p
                id="form-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {addStaff.error
                  ? getErrorMessage(addStaff.error)
                  : "Failed to add staff"}
              </p>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={
                  !name.trim() ||
                  !email.trim() ||
                  addStaff.isPending ||
                  !organizationId
                }
              >
                {addStaff.isPending ? "Adding…" : "Add staff"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/staff">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
