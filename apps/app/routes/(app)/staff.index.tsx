import { useStaff } from "@/lib/queries/staff";
import {
  Avatar,
  AvatarFallback,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
} from "@repo/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Search,
  UserPlus,
  Users as UsersIcon,
} from "lucide-react";

export const Route = createFileRoute("/(app)/staff/")({
  component: StaffList,
});

const TABLE_SKELETON_ROWS = 5;

function StaffList() {
  const { data, isPending } = useStaff();

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
                <div className="text-2xl font-bold">{data?.length ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  +10% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
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
                <div className="text-2xl font-bold">{data?.length ?? 0}</div>
                <p className="text-xs text-muted-foreground">72% of total staff</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              New This Month
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
                <div className="text-2xl font-bold">48</div>
                <p className="text-xs text-muted-foreground">
                  +32% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Management</CardTitle>
          <CardDescription>View and manage all staff accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search staff..." className="pl-10" />
            </div>
            <Button variant="outline">Filter</Button>
          </div>

          {/* Staff Table */}
          <div className="border rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Staff</th>
                    <th className="text-left p-4 font-medium">Role</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Last Active</th>
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
                                <p className="font-medium">{staff.user.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {staff.user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-secondary">
                              {staff.role}
                            </span>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                "Active" === "Active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {"Active"}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {new Date(staff.updatedAt).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" disabled>
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="cursor-pointer text-destructive hover:text-destructive"
                                disabled
                              >
                                Delete
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
    </div>
  );
}
