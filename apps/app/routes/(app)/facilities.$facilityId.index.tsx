import {
  getInitialOperatingScheduleFormState,
  OperatingScheduleForm,
  scheduleFromFormState,
  type OperatingScheduleFormState,
} from "@/components/operating-schedule-form";
import { getErrorMessage } from "@/lib/errors";
import { getFacilityScheduleGroups } from "@/lib/facility-schedule";
import {
  useAddFacilitySurface,
  useDeleteFacility,
  useFacility,
  useRemoveFacilitySurface,
  useUpdateFacility,
} from "@/lib/queries/facility";
import { useOrganization } from "@/lib/queries/organization";
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
  Label,
  Skeleton,
} from "@repo/ui";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Clock, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const SURFACE_TYPES = [
  { value: "field", label: "Field" },
  { value: "court", label: "Court" },
  { value: "diamond", label: "Diamond" },
  { value: "rink", label: "Rink" },
  { value: "other", label: "Other" },
] as const;

export const Route = createFileRoute("/(app)/facilities/$facilityId/")({
  component: FacilityDetail,
});

function FacilityDetail() {
  const router = useRouter();
  const { facilityId } = Route.useParams();
  const { data: organizations } = useOrganization();
  const organizationId = organizations?.[0]?.id;
  const { data: facility, isPending, error } = useFacility(facilityId);
  const deleteFacility = useDeleteFacility();
  const addSurface = useAddFacilitySurface();
  const removeSurface = useRemoveFacilitySurface();
  const updateFacility = useUpdateFacility();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddSurface, setShowAddSurface] = useState(false);
  const [newSurfaceName, setNewSurfaceName] = useState("");
  const [newSurfaceType, setNewSurfaceType] = useState<
    "field" | "court" | "diamond" | "rink" | "other"
  >("other");
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [editingAddress, setEditingAddress] = useState(false);
  const [editAddress, setEditAddress] = useState("");
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<OperatingScheduleFormState>(
    getInitialOperatingScheduleFormState(null),
  );

  const handleDeleteConfirm = () => {
    if (!organizationId || !facility?.id) return;
    deleteFacility.mutate(
      { organizationId, facilityId: facility.id },
      {
        onSuccess: () => {
          toast.success("Facility removed");
          setShowDeleteConfirm(false);
          router.navigate({ to: "/facilities" });
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  const handleAddSurface = () => {
    if (!organizationId || !facilityId || !newSurfaceName.trim()) return;
    addSurface.mutate(
      {
        organizationId,
        facilityId,
        name: newSurfaceName.trim(),
        type: newSurfaceType,
      },
      {
        onSuccess: () => {
          toast.success("Surface added");
          setShowAddSurface(false);
          setNewSurfaceName("");
          setNewSurfaceType("other");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  const handleRemoveSurface = (surfaceId: string) => {
    if (!organizationId || !facilityId) return;
    removeSurface.mutate(
      { organizationId, facilityId, surfaceId },
      {
        onSuccess: () => toast.success("Surface removed"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  const startEditName = () => {
    setEditName(facility?.name ?? "");
    setEditingName(true);
  };
  const startEditAddress = () => {
    setEditAddress(facility?.address ?? "");
    setEditingAddress(true);
  };

  const startEditSchedule = () => {
    setScheduleForm(
      getInitialOperatingScheduleFormState(facility?.operatingSchedule ?? null),
    );
    setEditingSchedule(true);
  };

  const saveSchedule = () => {
    if (!organizationId || !facility?.id) return;
    const payload = scheduleFromFormState(scheduleForm);
    updateFacility.mutate(
      {
        organizationId,
        facilityId: facility.id,
        operatingSchedule: payload,
      },
      {
        onSuccess: () => {
          toast.success("Operating schedule updated");
          setEditingSchedule(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  const saveName = () => {
    if (!organizationId || !facility?.id || editName.trim() === facility.name) {
      setEditingName(false);
      return;
    }
    updateFacility.mutate(
      { organizationId, facilityId: facility.id, name: editName.trim() },
      {
        onSuccess: () => {
          toast.success("Name updated");
          setEditingName(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  const saveAddress = () => {
    if (
      !organizationId ||
      !facility?.id ||
      (editAddress.trim() || "") === (facility.address ?? "")
    ) {
      setEditingAddress(false);
      return;
    }
    updateFacility.mutate(
      {
        organizationId,
        facilityId: facility.id,
        address: editAddress.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Address updated");
          setEditingAddress(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/facilities" aria-label="Back to facilities">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <p className="text-destructive">{error.message ?? "Facility not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/facilities" aria-label="Back to facilities">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          {isPending ? (
            <>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold">{facility?.name}</h2>
              <p className="text-muted-foreground">
                {facility?.address ?? "No address"}
              </p>
            </>
          )}
        </div>
        {facility && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Remove facility
          </Button>
        )}
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
          </CardContent>
        </Card>
      ) : facility ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <CardTitle>Facility information</CardTitle>
              </div>
              <CardDescription>Venue details for scheduling</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                {editingName ? (
                  <div className="flex gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={saveName}
                      onKeyDown={(e) =>
                        e.key === "Enter" ? saveName() : e.key === "Escape" && setEditingName(false)
                      }
                      autoFocus
                    />
                    <Button size="sm" onClick={saveName}>
                      Save
                    </Button>
                  </div>
                ) : (
                  <p
                    className="font-medium cursor-pointer hover:underline"
                    onClick={startEditName}
                    role="button"
                  >
                    {facility.name}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Address</p>
                {editingAddress ? (
                  <div className="flex gap-2">
                    <Input
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      onBlur={saveAddress}
                      onKeyDown={(e) =>
                        e.key === "Enter"
                          ? saveAddress()
                          : e.key === "Escape" && setEditingAddress(false)
                      }
                      placeholder="Optional"
                      autoFocus
                    />
                    <Button size="sm" onClick={saveAddress}>
                      Save
                    </Button>
                  </div>
                ) : (
                  <p
                    className="text-sm cursor-pointer hover:underline"
                    onClick={startEditAddress}
                    role="button"
                  >
                    {facility.address || "—"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <div>
                    <CardTitle>Operating schedule</CardTitle>
                    <CardDescription>
                      Hours open by day. Leave empty for closed.
                    </CardDescription>
                  </div>
                </div>
                {!editingSchedule && (
                  <Button variant="outline" size="sm" onClick={startEditSchedule}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingSchedule ? (
                <div className="space-y-4">
                  <OperatingScheduleForm
                    value={scheduleForm}
                    onChange={setScheduleForm}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={saveSchedule}
                      disabled={updateFacility.isPending}
                    >
                      {updateFacility.isPending ? "Saving…" : "Save schedule"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setScheduleForm(
                          getInitialOperatingScheduleFormState(
                            facility?.operatingSchedule ?? null,
                          ),
                        );
                        setEditingSchedule(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {getFacilityScheduleGroups(facility.operatingSchedule).length ===
                  0 ? (
                    <p className="text-sm text-muted-foreground">No hours set.</p>
                  ) : (
                    getFacilityScheduleGroups(facility.operatingSchedule).map(
                      (group, i) => (
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
                          <span className="text-sm text-muted-foreground">
                            {group.timeRange}
                          </span>
                        </div>
                      ),
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Surfaces</CardTitle>
                  <CardDescription>
                    Fields, courts, or other bookable areas at this facility
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddSurface(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add surface
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {facility.surfaces.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No surfaces yet. Add a field, court, or other area.
                </p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-4 font-medium">Name</th>
                        <th className="text-left p-4 font-medium">Type</th>
                        <th className="text-right p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facility.surfaces.map((s) => (
                        <tr key={s.id} className="border-b">
                          <td className="p-4 font-medium">{s.name}</td>
                          <td className="p-4 text-sm text-muted-foreground capitalize">
                            {s.type}
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemoveSurface(s.id)}
                              disabled={removeSurface.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
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
        </>
      ) : null}

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove facility</DialogTitle>
            <DialogDescription>
              Remove {facility?.name}? All surfaces will be deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
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

      <Dialog open={showAddSurface} onOpenChange={setShowAddSurface}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add surface</DialogTitle>
            <DialogDescription>
              Add a field, court, or other bookable area at this facility.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="surface-name">Name</Label>
              <Input
                id="surface-name"
                value={newSurfaceName}
                onChange={(e) => setNewSurfaceName(e.target.value)}
                placeholder="e.g. Field 1, Court A"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="surface-type">Type</Label>
              <select
                id="surface-type"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={newSurfaceType}
                onChange={(e) =>
                  setNewSurfaceType(
                    e.target.value as "field" | "court" | "diamond" | "rink" | "other",
                  )
                }
              >
                {SURFACE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSurface(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSurface}
              disabled={!newSurfaceName.trim() || addSurface.isPending}
            >
              {addSurface.isPending ? "Adding…" : "Add surface"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
