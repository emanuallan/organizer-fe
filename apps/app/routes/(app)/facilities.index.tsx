import { getErrorMessage } from "@/lib/errors";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useOrganization } from "@/lib/queries/organization";
import {
  useDeleteFacility,
  useFacilities,
} from "@/lib/queries/facility";
import { toast } from "@/lib/toast";
import {
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
  Skeleton,
} from "@repo/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Plus, Search } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/(app)/facilities/")({
  component: FacilitiesList,
});

const SEARCH_DEBOUNCE_MS = 800;

function FacilitiesList() {
  const { data: organizations } = useOrganization();
  const organizationId = organizations?.[0]?.id;
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const { data: facilities, isPending } = useFacilities(debouncedSearch);
  const deleteFacility = useDeleteFacility();
  const [facilityToDelete, setFacilityToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleDeleteConfirm = () => {
    if (!facilityToDelete || !organizationId) return;
    deleteFacility.mutate(
      { organizationId, facilityId: facilityToDelete.id },
      {
        onSuccess: () => {
          toast.success("Facility removed");
          setFacilityToDelete(null);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Facilities</h2>
          <p className="text-muted-foreground">
            Venues, fields, and courts for your organization. Used for leagues and scheduling.
          </p>
        </div>
        <Button className="gap-2" asChild>
          <Link to="/facilities/create">
            <Plus className="h-4 w-4" />
            Add Facility
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div>
              <CardTitle>All facilities</CardTitle>
              <CardDescription>
                Search and manage venues and their surfaces (fields, courts).
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : facilities?.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {debouncedSearch
                ? "No facilities match your search."
                : "No facilities yet. Add one to get started."}
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Name</th>
                    <th className="text-left p-4 font-medium">Address</th>
                    <th className="text-left p-4 font-medium">Surfaces</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {facilities?.map((f) => (
                    <tr key={f.id} className="border-b hover:bg-muted/30">
                      <td className="p-4">
                        <Link
                          to="/facilities/$facilityId"
                          params={{ facilityId: f.id }}
                          className="font-medium text-primary hover:underline"
                        >
                          {f.name}
                        </Link>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {f.address || "—"}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {f.surfaces?.length ?? 0}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            setFacilityToDelete({ id: f.id, name: f.name })
                          }
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!facilityToDelete}
        onOpenChange={(open) => !open && setFacilityToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove facility</DialogTitle>
            <DialogDescription>
              Remove {facilityToDelete?.name}? All surfaces (fields, courts) at
              this facility will be deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFacilityToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteFacility.isPending}
            >
              {deleteFacility.isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
