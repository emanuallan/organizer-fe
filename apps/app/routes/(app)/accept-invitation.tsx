import { auth } from "@/lib/auth";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";

export const Route = createFileRoute("/(app)/accept-invitation")({
  validateSearch: (search: Record<string, unknown>) => {
    const invitationId = search.invitationId;
    if (typeof invitationId !== "string" || !invitationId.trim()) {
      return { invitationId: null };
    }
    return { invitationId: invitationId.trim() };
  },
  component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
  const { invitationId } = Route.useSearch();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!invitationId || status !== "idle") return;
    setStatus("loading");
    auth.organization
      .acceptInvitation({ invitationId })
      .then((result) => {
        if (result.error) {
          setStatus("error");
          setErrorMessage(result.error.message ?? "Failed to accept invitation");
          return;
        }
        setStatus("success");
        router.navigate({ to: "/staff" });
      })
      .catch(() => {
        setStatus("error");
        setErrorMessage("Something went wrong");
      });
  }, [invitationId, status, router]);

  if (!invitationId) {
    return (
      <div className="p-6 flex justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invalid invitation</CardTitle>
            <CardDescription>
              This invitation link is missing an invitation ID. Please use the link from your invitation email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/">Go home</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 flex justify-center">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MailCheck className="h-5 w-5" />
            <CardTitle>Accept invitation</CardTitle>
          </div>
          <CardDescription>
            {status === "loading" && "Adding you to the organization…"}
            {status === "success" && "Accepted. Redirecting…"}
            {status === "error" && (errorMessage ?? "Could not accept the invitation.")}
            {status === "idle" && "You will be added to the organization."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "loading" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Please wait</span>
            </div>
          )}
          {status === "error" && (
            <Button asChild>
              <a href="/staff">Go to Staff</a>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
