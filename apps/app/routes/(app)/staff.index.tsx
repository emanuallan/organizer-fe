import { getErrorMessage } from "@/lib/errors";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useOrganization } from "@/lib/queries/organization";
import { useSessionQuery } from "@/lib/queries/session";
import {
  type StaffMember,
  STAFF_ROLES,
  type StaffRole,
  useRemoveStaff,
  useStaff,
  useUpdateStaff,
} from "@/lib/queries/staff";
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
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@repo/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Pencil,
  Search,
  UserPlus,
  Users as UsersIcon,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/(app)/staff/")({
  component: StaffList,
});

const TABLE_SKELETON_ROWS = 5;
const SEARCH_DEBOUNCE_MS = 800;

const ROLE_LABELS: Record<StaffRole, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

function StaffList() {
  const { data: session } = useSessionQuery();
  const currentUserId = session?.user?.id;
  const { data: organizations } = useOrganization();
  const organizationId = organizations?.[0]?.id;
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const { data, isPending } = useStaff(debouncedSearch);
  const updateStaff = useUpdateStaff();
  const removeStaff = useRemoveStaff();

  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [editRole, setEditRole] = useState<StaffRole>("viewer");

  const [memberToRemove, setMemberToRemove] = useState<StaffMember | null>(null);

  const handleEditOpen = (staff: StaffMember) => {
    setEditingMember(staff);
    setEditRole((staff.role ?? "viewer") as StaffRole);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !editingMember) return;
    updateStaff.mutate(
      {
        organizationId,
        memberId: editingMember.id,
        role: editRole,
      },
      {
        onSuccess: () => {
          toast.success("Role updated");
          setEditingMember(null);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  };

  const handleRemoveConfirm = () => {
    if (!organizationId || !memberToRemove) return;
    removeStaff.mutate(
      { organizationId, memberId: memberToRemove.id },
      {
        onSuccess: () => {
          toast.success("Staff member removed");
          setMemberToRemove(null);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  };

  const totalStaff = data?.length ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Staff</h2>
          <p className="text-muted-foreground">
            Manage staff accounts and permissions.
          </p>
        </div>
        <Button className="gap-2" asChild>
          <Link to="/staff/create">
            <UserPlus className="h-4 w-4" />
            Add Staff
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isPending ? (
              <>
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-3 w-28" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{totalStaff}</div>
                <p className="text-xs text-muted-foreground">
                  Organization members
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <UsersIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isPending ? (
              <>
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-3 w-24" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data?.filter((s) => s.role === "admin").length ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Can manage members and settings
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Editors & Viewers
            </CardTitle>
            <UserPlus className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {isPending ? (
              <>
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-3 w-28" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data?.filter(
                    (s) => s.role === "editor" || s.role === "viewer",
                  ).length ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Standard access roles
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Management</CardTitle>
          <CardDescription>View and manage all staff accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-10"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search staff"
              />
            </div>
          </div>

          <div className="border rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Staff</th>
                    <th className="text-left p-4 font-medium">Role</th>
                    <th className="text-left p-4 font-medium">Updated</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isPending
                    ? Array.from({ length: TABLE_SKELETON_ROWS }).map(
                        (_, i) => (
                          <tr key={i} className="border-b">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <Skeleton className="h-9 w-9 rounded-full" />
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-32" />
                                  <Skeleton className="h-3 w-40" />
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <Skeleton className="h-5 w-14 rounded-full" />
                            </td>
                            <td className="p-4">
                              <Skeleton className="h-4 w-20" />
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Skeleton className="h-8 w-16 rounded-md" />
                                <Skeleton className="h-8 w-14 rounded-md" />
                              </div>
                            </td>
                          </tr>
                        ),
                      )
                    : (data?.length ?? 0) === 0
                      ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="p-8 text-center text-muted-foreground"
                            >
                              No staff found. Add staff or send an invitation
                              from the &quot;Add Staff&quot; page.
                            </td>
                          </tr>
                        )
                      : data?.map((staff) => (
                          <tr key={staff.user.id} className="border-b">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarFallback>
                                    {staff.user.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {staff.user.name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {staff.user.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-secondary capitalize">
                                {ROLE_LABELS[staff.role as StaffRole] ??
                                  staff.role}
                              </span>
                            </td>
                            <td className="p-4 text-sm text-muted-foreground">
                              {new Date(
                                staff.updatedAt,
                              ).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditOpen(staff)}
                                >
                                  <Pencil className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="cursor-pointer text-destructive hover:text-destructive"
                                  onClick={() => setMemberToRemove(staff)}
                                  disabled={
                                    currentUserId !== undefined &&
                                    staff.user.id === currentUserId
                                  }
                                  title={
                                    staff.user.id === currentUserId
                                      ? "You cannot remove yourself"
                                      : "Remove from organization"
                                  }
                                >
                                  Remove
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog
        open={editingMember !== null}
        onOpenChange={(open) => !open && setEditingMember(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit role</DialogTitle>
            <DialogDescription>
              Change role for {editingMember?.user.name ?? editingMember?.user.email}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Role</label>
              <Select
                value={editRole}
                onValueChange={(v) => setEditRole(v as StaffRole)}
              >
                <SelectTrigger>
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingMember(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateStaff.isPending}>
                {updateStaff.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Confirm Dialog */}
      <Dialog
        open={memberToRemove !== null}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove staff member</DialogTitle>
            <DialogDescription>
              Remove {memberToRemove?.user.name ?? memberToRemove?.user.email}{" "}
              from the organization? They will lose access and must be re-invited
              to rejoin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMemberToRemove(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveConfirm}
              disabled={removeStaff.isPending}
            >
              {removeStaff.isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
