import { member, organization, team } from "@repo/db";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../lib/trpc.js";

export const organizationRouter = router({
  memberships: protectedProcedure.query(async ({ ctx }) => {
    // get list of organizations the user is a member of
    const memberships = await ctx.db.query.member.findMany({
      where: eq(member.userId, ctx.user.id),
    });

    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.query.organization.findFirst({
          where: eq(organization.id, membership.organizationId),
        });
        return org;
      }),
    );

    return organizations;
  }),

  /** List teams for an organization. User must be a member of the org. */
  listTeams: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const membership = await ctx.db.query.member.findFirst({
        where: and(
          eq(member.userId, ctx.user.id),
          eq(member.organizationId, input.organizationId),
        ),
      });
      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this organization",
        });
      }
      return ctx.db
        .select()
        .from(team)
        .where(eq(team.organizationId, input.organizationId));
    }),

  /** Create a team in an organization. User must be a member of the org. */
  createTeam: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1, "Team name is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.query.member.findFirst({
        where: and(
          eq(member.userId, ctx.user.id),
          eq(member.organizationId, input.organizationId),
        ),
      });
      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this organization",
        });
      }
      const [created] = await ctx.db
        .insert(team)
        .values({
          organizationId: input.organizationId,
          name: input.name.trim(),
        })
        .returning();
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create team",
        });
      }
      return created;
    }),

  list: protectedProcedure.query(() => {
    // TODO: Implement organization listing logic
    return {
      organizations: [],
    };
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .mutation(({ input, ctx }) => {
      // TODO: Implement organization creation logic
      return {
        id: "org_" + Date.now(),
        name: input.name,
        description: input.description,
        ownerId: ctx.user.id,
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(({ input }) => {
      // TODO: Implement organization update logic
      return {
        ...input,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      // TODO: Implement organization deletion logic
      return { success: true, id: input.id };
    }),

  /** List staff (members) for an organization with user details. User must be a member of the org. */
  listStaff: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const membership = await ctx.db.query.member.findFirst({
        where: and(
          eq(member.userId, ctx.user.id),
          eq(member.organizationId, input.organizationId),
        ),
      });
      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this organization",
        });
      }
      return ctx.db.query.member.findMany({
        where: eq(member.organizationId, input.organizationId),
        with: {
          user: {
            columns: { id: true, name: true, email: true },
          },
        },
      });
    }),

  invite: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        email: z.email({ error: "Invalid email address" }),
        role: z.enum(["admin", "member"]).default("member"),
      }),
    )
    .mutation(() => {
      // TODO: Implement organization invite logic
      return {
        success: true,
        inviteId: "invite_" + Date.now(),
      };
    }),
});
