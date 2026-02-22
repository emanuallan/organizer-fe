import {
  invitation,
  league,
  leagueTeam,
  member,
  organization,
  team,
  user,
} from "@repo/db";
import { TRPCError } from "@trpc/server";
import { and, count, eq, gte, ilike, lt } from "drizzle-orm";
import { z } from "zod";
import { sendOrganizationInvitation } from "../lib/email.js";
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

  /** Team statistics for the org (from team). User must be a member of the org. */
  getTeamStats: protectedProcedure
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
      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );
      const baseWhere = eq(team.organizationId, input.organizationId);

      const [totalRow] = await ctx.db
        .select({ value: count(team.id) })
        .from(team)
        .where(baseWhere);

      const [totalLastMonthRow] = await ctx.db
        .select({ value: count(team.id) })
        .from(team)
        .where(and(baseWhere, lt(team.createdAt, startOfThisMonth)));

      const [activeRow] = await ctx.db
        .select({ value: count(team.id) })
        .from(team)
        .where(and(baseWhere, eq(team.status, "active")));

      const [newThisMonthRow] = await ctx.db
        .select({ value: count(team.id) })
        .from(team)
        .where(and(baseWhere, gte(team.createdAt, startOfThisMonth)));

      const [newLastMonthRow] = await ctx.db
        .select({ value: count(team.id) })
        .from(team)
        .where(
          and(
            baseWhere,
            gte(team.createdAt, startOfLastMonth),
            lt(team.createdAt, startOfThisMonth),
          ),
        );

      const totalTeams = Number(totalRow?.value ?? 0);
      const totalTeamsLastMonth = Number(totalLastMonthRow?.value ?? 0);
      const activeTeams = Number(activeRow?.value ?? 0);
      const newThisMonth = Number(newThisMonthRow?.value ?? 0);
      const newLastMonth = Number(newLastMonthRow?.value ?? 0);

      const totalChangePercent =
        totalTeamsLastMonth > 0
          ? Math.round(
              ((totalTeams - totalTeamsLastMonth) / totalTeamsLastMonth) * 100,
            )
          : totalTeams > 0
            ? 100
            : 0;

      const activePercent =
        totalTeams > 0 ? Math.round((activeTeams / totalTeams) * 100) : 0;

      const newThisMonthChangePercent =
        newLastMonth > 0
          ? Math.round(
              ((newThisMonth - newLastMonth) / newLastMonth) * 100,
            )
          : newThisMonth > 0
            ? 100
            : 0;

      return {
        totalTeams,
        totalChangePercent,
        activeTeams,
        activePercent,
        newThisMonth,
        newThisMonthChangePercent,
      };
    }),

  /** List teams for an organization. Optional search by team name. User must be a member of the org. */
  listTeams: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        search: z.string().optional(),
      }),
    )
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
      const searchTerm = input.search?.trim();
      const nameCondition = searchTerm
        ? ilike(team.name, `%${searchTerm}%`)
        : undefined;
      return ctx.db
        .select({
          id: team.id,
          name: team.name,
          slug: team.slug,
          createdAt: team.createdAt,
          updatedAt: team.updatedAt,
          status: team.status,
        })
        .from(team)
        .where(
          nameCondition
            ? and(
                eq(team.organizationId, input.organizationId),
                nameCondition,
              )
            : eq(team.organizationId, input.organizationId),
        );
    }),

  /** Get a team by slug with members (players). Team must belong to the organization. User must be a member of the org. */
  getTeamBySlug: protectedProcedure
    .input(
      z.object({
        slug: z.string().min(1),
        organizationId: z.string(),
      }),
    )
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
      const foundTeam = await ctx.db.query.team.findFirst({
        where: and(
          eq(team.slug, input.slug),
          eq(team.organizationId, input.organizationId),
        ),
        with: {
          members: {
            with: {
              user: {
                columns: { id: true, name: true, email: true },
              },
            },
          },
        },
      });
      if (!foundTeam) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team not found",
        });
      }
      return foundTeam;
    }),

  /** Delete a team. Team must belong to the organization. User must be a member of the org. */
  deleteTeam: protectedProcedure
    .input(
      z.object({ organizationId: z.string(), teamId: z.string() }),
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
      const deleted = await ctx.db
        .delete(team)
        .where(
          and(
            eq(team.id, input.teamId),
            eq(team.organizationId, input.organizationId),
          ),
        )
        .returning({ id: team.id });
      if (deleted.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team not found or does not belong to this organization",
        });
      }
      return { success: true };
    }),

  /** League statistics for the org. User must be a member of the org. */
  getLeagueStats: protectedProcedure
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
      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );
      const baseWhere = eq(league.organizationId, input.organizationId);

      const [totalRow] = await ctx.db
        .select({ value: count(league.id) })
        .from(league)
        .where(baseWhere);

      const [totalLastMonthRow] = await ctx.db
        .select({ value: count(league.id) })
        .from(league)
        .where(and(baseWhere, lt(league.createdAt, startOfThisMonth)));

      const [newThisMonthRow] = await ctx.db
        .select({ value: count(league.id) })
        .from(league)
        .where(and(baseWhere, gte(league.createdAt, startOfThisMonth)));

      const [newLastMonthRow] = await ctx.db
        .select({ value: count(league.id) })
        .from(league)
        .where(
          and(
            baseWhere,
            gte(league.createdAt, startOfLastMonth),
            lt(league.createdAt, startOfThisMonth),
          ),
        );

      const totalLeagues = Number(totalRow?.value ?? 0);
      const totalLastMonth = Number(totalLastMonthRow?.value ?? 0);
      const newThisMonth = Number(newThisMonthRow?.value ?? 0);
      const newLastMonth = Number(newLastMonthRow?.value ?? 0);

      const totalChangePercent =
        totalLastMonth > 0
          ? Math.round(
              ((totalLeagues - totalLastMonth) / totalLastMonth) * 100,
            )
          : totalLeagues > 0
            ? 100
            : 0;

      const newThisMonthChangePercent =
        newLastMonth > 0
          ? Math.round(
              ((newThisMonth - newLastMonth) / newLastMonth) * 100,
            )
          : newThisMonth > 0
            ? 100
            : 0;

      return {
        totalLeagues,
        totalChangePercent,
        newThisMonth,
        newThisMonthChangePercent,
      };
    }),

  /** List leagues for an organization. Optional search by league name. User must be a member of the org. */
  listLeagues: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        search: z.string().optional(),
      }),
    )
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
      const searchTerm = input.search?.trim();
      const nameCondition = searchTerm
        ? ilike(league.name, `%${searchTerm}%`)
        : undefined;
      return ctx.db
        .select()
        .from(league)
        .where(
          nameCondition
            ? and(
                eq(league.organizationId, input.organizationId),
                nameCondition,
              )
            : eq(league.organizationId, input.organizationId),
        );
    }),

  /** Get a league by id with teams participating (via league_team). User must be a member of the org. */
  getLeagueById: protectedProcedure
    .input(
      z.object({
        leagueId: z.string(),
        organizationId: z.string(),
      }),
    )
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
      const [foundLeague] = await ctx.db
        .select()
        .from(league)
        .where(
          and(
            eq(league.id, input.leagueId),
            eq(league.organizationId, input.organizationId),
          ),
        );
      if (!foundLeague) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "League not found",
        });
      }
      const participatingTeams = await ctx.db
        .select({
          id: team.id,
          name: team.name,
          slug: team.slug,
          status: team.status,
        })
        .from(leagueTeam)
        .innerJoin(team, eq(leagueTeam.teamId, team.id))
        .where(eq(leagueTeam.leagueId, input.leagueId));
      return { ...foundLeague, participatingTeams };
    }),

  /** Delete a league. User must be a member of the org. Cascade deletes league_team rows. */
  deleteLeague: protectedProcedure
    .input(z.object({ leagueId: z.string(), organizationId: z.string() }))
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
      const deleted = await ctx.db
        .delete(league)
        .where(
          and(
            eq(league.id, input.leagueId),
            eq(league.organizationId, input.organizationId),
          ),
        )
        .returning({ id: league.id });
      if (deleted.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "League not found",
        });
      }
      return { success: true };
    }),

  /** Create a league. User must be a member of the org. */
  createLeague: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1, "League name is required"),
        image: z.string().optional(),
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
        .insert(league)
        .values({
          organizationId: input.organizationId,
          name: input.name.trim(),
          ...(input.image ? { image: input.image } : {}),
        })
        .returning();
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create league",
        });
      }
      return created;
    }),

  /** Create a team in the organization. User must be a member of the org. */
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
      const [createdTeam] = await ctx.db
        .insert(team)
        .values({
          organizationId: input.organizationId,
          name: input.name.trim(),
        })
        .returning();
      if (!createdTeam) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create team",
        });
      }
      return createdTeam;
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

  /** Add staff: add existing user as member, or create invitation if no user. Role enum: admin | editor | viewer. */
  addStaff: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email address"),
        role: z.enum(["admin", "editor", "viewer"]),
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
      const existingUser = await ctx.db.query.user.findFirst({
        where: eq(user.email, input.email.toLowerCase().trim()),
        columns: { id: true },
      });
      if (existingUser) {
        const existingMember = await ctx.db.query.member.findFirst({
          where: and(
            eq(member.userId, existingUser.id),
            eq(member.organizationId, input.organizationId),
          ),
        });
        if (existingMember) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This user is already a member of the organization",
          });
        }
        const [created] = await ctx.db
          .insert(member)
          .values({
            userId: existingUser.id,
            organizationId: input.organizationId,
            role: input.role,
          })
          .returning();
        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to add member",
          });
        }
        return { type: "member" as const, member: created };
      }
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      const [inv] = await ctx.db
        .insert(invitation)
        .values({
          email: input.email.toLowerCase().trim(),
          inviterId: ctx.user.id,
          organizationId: input.organizationId,
          role: input.role,
          status: "pending",
          expiresAt,
        })
        .returning();
      if (!inv) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create invitation",
        });
      }
      const org = await ctx.db.query.organization.findFirst({
        where: eq(organization.id, input.organizationId),
        columns: { name: true },
      });
      try {
        await sendOrganizationInvitation(ctx.env, {
          email: input.email.toLowerCase().trim(),
          invitationId: inv.id,
          inviterName: ctx.user.name ?? "A team member",
          organizationName: org?.name ?? "the organization",
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send invitation email",
        });
      }
      return { type: "invitation" as const, invitation: inv };
    }),

  invite: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        email: z.string().email("Invalid email address"),
        role: z.enum(["admin", "editor", "viewer"]).default("viewer"),
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
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      const [inv] = await ctx.db
        .insert(invitation)
        .values({
          email: input.email.toLowerCase().trim(),
          inviterId: ctx.user.id,
          organizationId: input.organizationId,
          role: input.role,
          status: "pending",
          expiresAt,
        })
        .returning();
      if (!inv) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create invitation",
        });
      }
      const org = await ctx.db.query.organization.findFirst({
        where: eq(organization.id, input.organizationId),
        columns: { name: true },
      });
      await sendOrganizationInvitation(ctx.env, {
        email: input.email.toLowerCase().trim(),
        invitationId: inv.id,
        inviterName: ctx.user.name ?? "A team member",
        organizationName: org?.name ?? "the organization",
      });
      return { type: "invitation" as const, invitation: inv };
    }),
});
