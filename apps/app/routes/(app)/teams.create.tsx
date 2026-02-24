import { getErrorMessage } from "@/lib/errors";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useOrganization } from "@/lib/queries/organization";
import type { Player } from "@/lib/queries/player";
import { usePlayers } from "@/lib/queries/player";
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
import { ArrowLeft, Users, X } from "lucide-react";
import { useRef, useState } from "react";

const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;

function playerLabel(p: Player) {
  return p.userName ?? p.userEmail ?? p.userId;
}

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
  const [adminUserId, setAdminUserId] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const searchTerm =
    debouncedSearch.trim().length >= MIN_SEARCH_LENGTH
      ? debouncedSearch.trim()
      : undefined;
  const { data: players = [], isPending: isSearching } = usePlayers({
    search: searchTerm,
  });

  const handleSelectPlayer = (p: Player) => {
    setAdminUserId(p.userId);
    setSelectedLabel(playerLabel(p));
    setSearchInput("");
    setDropdownOpen(false);
  };

  const handleClearAdmin = () => {
    setAdminUserId("");
    setSelectedLabel("");
    setSearchInput("");
    setDropdownOpen(true);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !name.trim() || !adminUserId) return;
    createTeam.mutate(
      { organizationId, name: name.trim(), adminUserId },
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
          <CardDescription>
            Enter the team name and assign a team admin (any organization
            player).
          </CardDescription>
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
            <div className="grid gap-2">
              <Label htmlFor="admin-search">Team admin</Label>
              <div className="relative">
                {adminUserId ? (
                  <div className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-muted/50 px-3 py-1 text-sm">
                    <span className="truncate">{selectedLabel}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={handleClearAdmin}
                      aria-label="Change team admin"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      ref={inputRef}
                      id="admin-search"
                      type="text"
                      value={searchInput}
                      onChange={(e) => {
                        setSearchInput(e.target.value);
                        setDropdownOpen(true);
                      }}
                      onFocus={() => setDropdownOpen(true)}
                      onBlur={() =>
                        setTimeout(() => setDropdownOpen(false), 150)
                      }
                      disabled={!organizationId}
                      placeholder="Search by name or email…"
                      autoComplete="off"
                      aria-autocomplete="list"
                      aria-expanded={dropdownOpen}
                      aria-controls="admin-player-list"
                      aria-required="true"
                    />
                    {dropdownOpen && (
                      <ul
                        id="admin-player-list"
                        role="listbox"
                        className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-input bg-popover py-1 text-popover-foreground shadow-md"
                      >
                        {searchTerm == null ? (
                          <li
                            className="px-3 py-2 text-sm text-muted-foreground"
                            role="option"
                          >
                            Type at least {MIN_SEARCH_LENGTH} characters to
                            search organization players.
                          </li>
                        ) : isSearching ? (
                          <li
                            className="px-3 py-2 text-sm text-muted-foreground"
                            role="option"
                          >
                            Searching…
                          </li>
                        ) : players.length === 0 ? (
                          <li
                            className="px-3 py-2 text-sm text-muted-foreground"
                            role="option"
                          >
                            No players found.
                          </li>
                        ) : (
                          players.map((p) => (
                            <li
                              key={p.userId}
                              role="option"
                              className="cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectPlayer(p);
                              }}
                            >
                              {playerLabel(p)}
                              {p.userEmail && p.userName && (
                                <span className="ml-2 text-muted-foreground">
                                  {p.userEmail}
                                </span>
                              )}
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                The team admin is the first member and can manage the team.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={
                  !name.trim() ||
                  !adminUserId ||
                  createTeam.isPending ||
                  !organizationId
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
