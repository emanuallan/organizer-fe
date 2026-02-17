import { member, organization } from "@repo/db";
import { eq } from "drizzle-orm";
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

  members: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(() => {
      // TODO: Implement organization members listing
      return {
        members: [],
      };
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
