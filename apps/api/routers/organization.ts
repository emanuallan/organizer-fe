import {
  facility,
  facilitySurface,
  invitation,
  league,
  leagueTeam,
  member,
  organization,
  organizationPlayer,
  team,
  teamMember,
  user,
} from "@repo/db";
import { TRPCError } from "@trpc/server";
import { and, count, eq, gte, ilike, inArray, isNull, lt, ne, or } from "drizzle-orm";
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

  /** List org teams that are not in this league (available to add to this league). User must be a member of the org. */
  listTeamsAvailableForLeague: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        leagueId: z.string(),
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
      return ctx.db
        .select({
          id: team.id,
          name: team.name,
          slug: team.slug,
          status: team.status,
        })
        .from(team)
        .leftJoin(
          leagueTeam,
          and(
            eq(leagueTeam.teamId, team.id),
            eq(leagueTeam.leagueId, input.leagueId),
          ),
        )
        .where(
          and(
            eq(team.organizationId, input.organizationId),
            isNull(leagueTeam.teamId),
          ),
        );
    }),

  /** Add a team to a league (insert league_team). Team must be in org and not already in this league. User must be a member of the org. */
  addTeamToLeague: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        leagueId: z.string(),
        teamId: z.string(),
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
      const [leagueRow] = await ctx.db
        .select({ id: league.id })
        .from(league)
        .where(
          and(
            eq(league.id, input.leagueId),
            eq(league.organizationId, input.organizationId),
          ),
        );
      if (!leagueRow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "League not found",
        });
      }
      const [teamRow] = await ctx.db
        .select({ id: team.id })
        .from(team)
        .where(
          and(
            eq(team.id, input.teamId),
            eq(team.organizationId, input.organizationId),
          ),
        );
      if (!teamRow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team not found",
        });
      }
      const [alreadyInThisLeague] = await ctx.db
        .select({ id: leagueTeam.id })
        .from(leagueTeam)
        .where(
          and(
            eq(leagueTeam.leagueId, input.leagueId),
            eq(leagueTeam.teamId, input.teamId),
          ),
        );
      if (alreadyInThisLeague) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This team is already in this league",
        });
      }
      const [created] = await ctx.db
        .insert(leagueTeam)
        .values({
          leagueId: input.leagueId,
          teamId: input.teamId,
        })
        .returning();
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add team to league",
        });
      }
      return created;
    }),

  /** Remove a team from a league (delete league_team row). User must be a member of the org. */
  removeTeamFromLeague: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        leagueId: z.string(),
        teamId: z.string(),
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
      const [leagueRow] = await ctx.db
        .select({ id: league.id })
        .from(league)
        .where(
          and(
            eq(league.id, input.leagueId),
            eq(league.organizationId, input.organizationId),
          ),
        );
      if (!leagueRow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "League not found",
        });
      }
      const deleted = await ctx.db
        .delete(leagueTeam)
        .where(
          and(
            eq(leagueTeam.leagueId, input.leagueId),
            eq(leagueTeam.teamId, input.teamId),
          ),
        )
        .returning({ id: leagueTeam.id });
      if (deleted.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team is not in this league",
        });
      }
      return { success: true };
    }),

  /** List org players not on this team (available to add). User must be a member of the org. */
  listPlayersAvailableForTeam: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        teamId: z.string(),
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
      const [teamRow] = await ctx.db
        .select({ id: team.id })
        .from(team)
        .where(
          and(
            eq(team.id, input.teamId),
            eq(team.organizationId, input.organizationId),
          ),
        );
      if (!teamRow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team not found",
        });
      }
      const searchTerm = input.search?.trim();
      const nameOrEmailCondition = searchTerm
        ? or(
            ilike(user.name, `%${searchTerm}%`),
            ilike(user.email, `%${searchTerm}%`),
          )
        : undefined;
      return ctx.db
        .select({
          userId: organizationPlayer.userId,
          userName: user.name,
          userEmail: user.email,
          status: organizationPlayer.status,
        })
        .from(organizationPlayer)
        .innerJoin(user, eq(user.id, organizationPlayer.userId))
        .leftJoin(
          teamMember,
          and(
            eq(teamMember.userId, organizationPlayer.userId),
            eq(teamMember.teamId, input.teamId),
          ),
        )
        .where(
          and(
            eq(organizationPlayer.organizationId, input.organizationId),
            isNull(teamMember.id),
            ...(nameOrEmailCondition ? [nameOrEmailCondition] : []),
          ),
        );
    }),

  /** Add a player to a team. Player must be in org roster; inserts team_member. User must be a member of the org. */
  addPlayerToTeam: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        teamId: z.string(),
        userId: z.string(),
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
      const [teamRow] = await ctx.db
        .select({ id: team.id })
        .from(team)
        .where(
          and(
            eq(team.id, input.teamId),
            eq(team.organizationId, input.organizationId),
          ),
        );
      if (!teamRow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team not found",
        });
      }
      const [op] = await ctx.db
        .select({ userId: organizationPlayer.userId })
        .from(organizationPlayer)
        .where(
          and(
            eq(organizationPlayer.organizationId, input.organizationId),
            eq(organizationPlayer.userId, input.userId),
          ),
        );
      if (!op) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found in organization roster",
        });
      }
      const alreadyOnTeam = await ctx.db.query.teamMember.findFirst({
        where: eq(teamMember.userId, input.userId),
        columns: { id: true },
      });
      if (alreadyOnTeam) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This player is already on a team",
        });
      }
      const [created] = await ctx.db
        .insert(teamMember)
        .values({
          teamId: input.teamId,
          userId: input.userId,
          role: "member",
        })
        .returning();
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add player to team",
        });
      }
      return created;
    }),

  /** Remove a player from a team (delete team_member). If removing the team admin, another member is promoted to admin. User must be a member of the org. */
  removePlayerFromTeam: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        teamId: z.string(),
        userId: z.string(),
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
      const current = await ctx.db.query.teamMember.findFirst({
        where: and(
          eq(teamMember.teamId, input.teamId),
          eq(teamMember.userId, input.userId),
        ),
        columns: { id: true, role: true },
      });
      if (!current) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player is not on this team",
        });
      }
      if (current.role === "admin") {
        const [nextAdminRow] = await ctx.db
          .select({ id: teamMember.id })
          .from(teamMember)
          .where(
            and(
              eq(teamMember.teamId, input.teamId),
              ne(teamMember.userId, input.userId),
            ),
          )
          .limit(1);
        if (nextAdminRow) {
          await ctx.db
            .update(teamMember)
            .set({ role: "admin", updatedAt: new Date() })
            .where(eq(teamMember.id, nextAdminRow.id));
        }
      }
      await ctx.db
        .delete(teamMember)
        .where(
          and(
            eq(teamMember.teamId, input.teamId),
            eq(teamMember.userId, input.userId),
          ),
        );
      return { success: true };
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
        ageGroup: z
          .enum([
            "toddlers",
            "u6",
            "u7",
            "u8",
            "u9",
            "u10",
            "u11",
            "u12",
            "u13",
            "u14",
            "u15",
            "u16",
            "u17",
            "u18",
            "adult",
            "o30",
            "o50",
            "o60",
          ])
          .optional(),
        days: z
          .array(
            z.enum([
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ]),
          )
          .optional(),
        startTime: z
          .string()
          .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Use HH:mm format")
          .optional(),
        endTime: z
          .string()
          .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Use HH:mm format")
          .optional(),
        startDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
          .optional(),
        endDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
          .optional(),
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
      const baseSlug =
        input.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "league";
      let slug = baseSlug;
      let suffix = 0;
      while (true) {
        const [existing] = await ctx.db
          .select({ id: league.id })
          .from(league)
          .where(
            and(
              eq(league.organizationId, input.organizationId),
              eq(league.slug, slug),
            ),
          );
        if (!existing) break;
        suffix += 1;
        slug = `${baseSlug}-${suffix}`;
      }
      const [created] = await ctx.db
        .insert(league)
        .values({
          organizationId: input.organizationId,
          name: input.name.trim(),
          slug,
          ...(input.image ? { image: input.image } : {}),
          ...(input.ageGroup ? { ageGroup: input.ageGroup } : {}),
          ...(input.days?.length ? { days: input.days } : {}),
          ...(input.startTime ? { startTime: input.startTime } : {}),
          ...(input.endTime ? { endTime: input.endTime } : {}),
          ...(input.startDate ? { startDate: input.startDate } : {}),
          ...(input.endDate ? { endDate: input.endDate } : {}),
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

  /** Create a team in the organization with a designated team admin. Admin can be any org player; they are added to the roster if needed and as the first team member with role admin. */
  createTeam: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1, "Team name is required"),
        adminUserId: z.string().min(1, "Team admin is required"),
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
      await ctx.db
        .insert(organizationPlayer)
        .values({
          organizationId: input.organizationId,
          userId: input.adminUserId,
          status: "inactive",
        })
        .onConflictDoNothing({
          target: [
            organizationPlayer.organizationId,
            organizationPlayer.userId,
          ],
        });
      const [adminMember] = await ctx.db
        .insert(teamMember)
        .values({
          teamId: createdTeam.id,
          userId: input.adminUserId,
          role: "admin",
        })
        .returning();
      if (!adminMember) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add team admin",
        });
      }
      return createdTeam;
    }),

  // ——— Players (team members) ———

  /** Player statistics for the org (organization_player = roster including free agents). */
  getPlayerStats: protectedProcedure
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

      const baseWhere = eq(
        organizationPlayer.organizationId,
        input.organizationId,
      );

      const [totalRow] = await ctx.db
        .select({ value: count(organizationPlayer.id) })
        .from(organizationPlayer)
        .where(baseWhere);

      const [totalLastMonthRow] = await ctx.db
        .select({ value: count(organizationPlayer.id) })
        .from(organizationPlayer)
        .where(
          and(baseWhere, lt(organizationPlayer.createdAt, startOfThisMonth)),
        );

      const [activeRow] = await ctx.db
        .select({ value: count(organizationPlayer.id) })
        .from(organizationPlayer)
        .where(
          and(baseWhere, eq(organizationPlayer.status, "active")),
        );

      const [newThisMonthRow] = await ctx.db
        .select({ value: count(organizationPlayer.id) })
        .from(organizationPlayer)
        .where(
          and(baseWhere, gte(organizationPlayer.createdAt, startOfThisMonth)),
        );

      const [newLastMonthRow] = await ctx.db
        .select({ value: count(organizationPlayer.id) })
        .from(organizationPlayer)
        .where(
          and(
            baseWhere,
            gte(organizationPlayer.createdAt, startOfLastMonth),
            lt(organizationPlayer.createdAt, startOfThisMonth),
          ),
        );

      const totalPlayers = Number(totalRow?.value ?? 0);
      const totalLastMonth = Number(totalLastMonthRow?.value ?? 0);
      const activePlayers = Number(activeRow?.value ?? 0);
      const newThisMonth = Number(newThisMonthRow?.value ?? 0);
      const newLastMonth = Number(newLastMonthRow?.value ?? 0);

      const totalChangePercent =
        totalLastMonth > 0
          ? Math.round(
              ((totalPlayers - totalLastMonth) / totalLastMonth) * 100,
            )
          : totalPlayers > 0
            ? 100
            : 0;

      const activePercent =
        totalPlayers > 0
          ? Math.round((activePlayers / totalPlayers) * 100)
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
        totalPlayers,
        totalChangePercent,
        activePlayers,
        activePercent,
        newThisMonth,
        newThisMonthChangePercent,
      };
    }),

  /** List players for the org (organization_player = roster including free agents). Optional team filter and search by name/email. */
  listPlayers: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        teamId: z.string().optional(),
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
      const nameOrEmailCondition = searchTerm
        ? or(
            ilike(user.name, `%${searchTerm}%`),
            ilike(user.email, `%${searchTerm}%`),
          )
        : undefined;

      const conditions = [
        eq(organizationPlayer.organizationId, input.organizationId),
        ...(input.teamId ? [eq(team.id, input.teamId)] : []),
        ...(nameOrEmailCondition ? [nameOrEmailCondition] : []),
      ];

      return ctx.db
        .select({
          id: organizationPlayer.id,
          teamId: team.id,
          userId: organizationPlayer.userId,
          status: organizationPlayer.status,
          createdAt: organizationPlayer.createdAt,
          updatedAt: organizationPlayer.updatedAt,
          teamName: team.name,
          teamSlug: team.slug,
          userName: user.name,
          userEmail: user.email,
        })
        .from(organizationPlayer)
        .innerJoin(user, eq(user.id, organizationPlayer.userId))
        .leftJoin(teamMember, eq(teamMember.userId, organizationPlayer.userId))
        .leftJoin(
          team,
          and(
            eq(team.id, teamMember.teamId),
            eq(team.organizationId, organizationPlayer.organizationId),
          ),
        )
        .where(and(...conditions));
    }),

  /** Add a player (add user to team). User must exist; team must belong to org. */
  addPlayer: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        teamId: z.string(),
        email: z.string().email("Invalid email"),
        status: z
          .enum(["active", "inactive", "banned", "suspended", "injured"])
          .default("inactive"),
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
      const [teamRow] = await ctx.db
        .select()
        .from(team)
        .where(
          and(
            eq(team.id, input.teamId),
            eq(team.organizationId, input.organizationId),
          ),
        );
      if (!teamRow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team not found",
        });
      }
      const existingUser = await ctx.db.query.user.findFirst({
        where: eq(user.email, input.email.toLowerCase().trim()),
        columns: { id: true },
      });
      if (!existingUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No user found with this email",
        });
      }
      const alreadyInTeam = await ctx.db.query.teamMember.findFirst({
        where: eq(teamMember.userId, existingUser.id),
        columns: { id: true },
      });
      if (alreadyInTeam) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This user is already assigned to a team",
        });
      }
      await ctx.db
        .insert(organizationPlayer)
        .values({
          organizationId: input.organizationId,
          userId: existingUser.id,
          status: input.status,
        })
        .onConflictDoUpdate({
          target: [
            organizationPlayer.organizationId,
            organizationPlayer.userId,
          ],
          set: { status: input.status, updatedAt: new Date() },
        });
      const [created] = await ctx.db
        .insert(teamMember)
        .values({
          teamId: input.teamId,
          userId: existingUser.id,
          role: "member",
        })
        .returning();
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add player",
        });
      }
      return {
        ...created,
        status: input.status,
      };
    }),

  /** Update a player's status. playerId = organization_player.id */
  updatePlayer: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        playerId: z.string(),
        status: z.enum([
          "active",
          "inactive",
          "banned",
          "suspended",
          "injured",
        ]),
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
      const [op] = await ctx.db
        .select()
        .from(organizationPlayer)
        .where(
          and(
            eq(organizationPlayer.id, input.playerId),
            eq(organizationPlayer.organizationId, input.organizationId),
          ),
        );
      if (!op) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found",
        });
      }
      const [updated] = await ctx.db
        .update(organizationPlayer)
        .set({ status: input.status })
        .where(eq(organizationPlayer.id, input.playerId))
        .returning();
      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update player",
        });
      }
      return updated;
    }),

  /** Remove a player from the org roster. playerId = organization_player.id. Deletes from roster and any team assignments. */
  removePlayer: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        playerId: z.string(),
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
      const [op] = await ctx.db
        .select({ userId: organizationPlayer.userId })
        .from(organizationPlayer)
        .where(
          and(
            eq(organizationPlayer.id, input.playerId),
            eq(organizationPlayer.organizationId, input.organizationId),
          ),
        );
      if (!op) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found",
        });
      }
      const orgTeams = await ctx.db
        .select({ id: team.id })
        .from(team)
        .where(eq(team.organizationId, input.organizationId));
      const orgTeamIds = orgTeams.map((t) => t.id);
      if (orgTeamIds.length > 0) {
        await ctx.db
          .delete(teamMember)
          .where(
            and(
              eq(teamMember.userId, op.userId),
              inArray(teamMember.teamId, orgTeamIds),
            ),
          );
      }
      const deleted = await ctx.db
        .delete(organizationPlayer)
        .where(eq(organizationPlayer.id, input.playerId))
        .returning({ id: organizationPlayer.id });
      if (deleted.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove player",
        });
      }
      return { success: true };
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

  /** List staff (members) for an organization with user details. Optional search by name/email. User must be a member of the org. */
  listStaff: protectedProcedure
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
      if (!searchTerm) {
        return ctx.db.query.member.findMany({
          where: eq(member.organizationId, input.organizationId),
          with: {
            user: {
              columns: { id: true, name: true, email: true },
            },
          },
        });
      }
      const rows = await ctx.db
        .select({
          id: member.id,
          userId: member.userId,
          organizationId: member.organizationId,
          role: member.role,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
          userName: user.name,
          userEmail: user.email,
        })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(
          and(
            eq(member.organizationId, input.organizationId),
            or(
              ilike(user.name, `%${searchTerm}%`),
              ilike(user.email, `%${searchTerm}%`),
            ),
          ),
        );
      return rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        organizationId: r.organizationId,
        role: r.role,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        user: { id: r.userId, name: r.userName, email: r.userEmail },
      }));
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

  /** Update a staff member's role. User must be a member of the org. */
  updateStaff: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        memberId: z.string(),
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
      const [target] = await ctx.db
        .select({ id: member.id })
        .from(member)
        .where(
          and(
            eq(member.id, input.memberId),
            eq(member.organizationId, input.organizationId),
          ),
        );
      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Staff member not found",
        });
      }
      const [updated] = await ctx.db
        .update(member)
        .set({ role: input.role })
        .where(eq(member.id, input.memberId))
        .returning();
      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update staff",
        });
      }
      return updated;
    }),

  /** Remove a staff member from the organization. User must be a member of the org. */
  removeStaff: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        memberId: z.string(),
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
      const [target] = await ctx.db
        .select({ id: member.id, userId: member.userId })
        .from(member)
        .where(
          and(
            eq(member.id, input.memberId),
            eq(member.organizationId, input.organizationId),
          ),
        );
      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Staff member not found",
        });
      }
      if (target.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove yourself; use a different account or ask another admin.",
        });
      }
      const deleted = await ctx.db
        .delete(member)
        .where(eq(member.id, input.memberId))
        .returning({ id: member.id });
      if (deleted.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove staff",
        });
      }
      return { success: true };
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

  // ——— Facilities ———

  /** List facilities for an organization. Optional search by name. */
  listFacilities: protectedProcedure
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
      const conditions = [eq(facility.organizationId, input.organizationId)];
      if (searchTerm) {
        conditions.push(ilike(facility.name, `%${searchTerm}%`));
      }
      const list = await ctx.db.query.facility.findMany({
        where: and(...conditions),
        orderBy: (f, { asc }) => [asc(f.name)],
        columns: {
          id: true,
          name: true,
          slug: true,
          address: true,
          createdAt: true,
          updatedAt: true,
        },
        with: {
          surfaces: { columns: { id: true } },
        },
      });
      return list;
    }),

  /** Get a facility by id with its surfaces. Facility must belong to the organization. */
  getFacility: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        facilityId: z.string(),
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
      const found = await ctx.db.query.facility.findFirst({
        where: and(
          eq(facility.id, input.facilityId),
          eq(facility.organizationId, input.organizationId),
        ),
        with: {
          surfaces: {
            orderBy: (s, { asc }) => [asc(s.sortOrder), asc(s.name)],
          },
        },
      });
      if (!found) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Facility not found",
        });
      }
      return found;
    }),

  /** Create a facility. Slug is derived from name if not provided. */
  createFacility: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1, "Name is required"),
        address: z.string().optional(),
        slug: z.string().optional(),
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
      const baseSlug =
        input.slug?.trim() ||
        input.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") ||
        "facility";
      let slug = baseSlug;
      let suffix = 0;
      while (true) {
        const [existing] = await ctx.db
          .select({ id: facility.id })
          .from(facility)
          .where(
            and(
              eq(facility.organizationId, input.organizationId),
              eq(facility.slug, slug),
            ),
          );
        if (!existing) break;
        suffix += 1;
        slug = `${baseSlug}-${suffix}`;
      }
      const [created] = await ctx.db
        .insert(facility)
        .values({
          organizationId: input.organizationId,
          name: input.name.trim(),
          slug,
          ...(input.address != null ? { address: input.address.trim() || null } : {}),
        })
        .returning();
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create facility",
        });
      }
      return created;
    }),

  /** Update a facility. Facility must belong to the organization. */
  updateFacility: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        facilityId: z.string(),
        name: z.string().min(1).optional(),
        address: z.string().optional(),
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
      const [updated] = await ctx.db
        .update(facility)
        .set({
          ...(input.name != null ? { name: input.name.trim() } : {}),
          ...(input.address !== undefined ? { address: input.address?.trim() || null } : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(facility.id, input.facilityId),
            eq(facility.organizationId, input.organizationId),
          ),
        )
        .returning();
      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Facility not found",
        });
      }
      return updated;
    }),

  /** Delete a facility. Cascades to surfaces. */
  deleteFacility: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        facilityId: z.string(),
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
      const [deleted] = await ctx.db
        .delete(facility)
        .where(
          and(
            eq(facility.id, input.facilityId),
            eq(facility.organizationId, input.organizationId),
          ),
        )
        .returning({ id: facility.id });
      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Facility not found",
        });
      }
      return { id: deleted.id };
    }),

  /** Add a surface to a facility. Facility must belong to the organization. */
  addFacilitySurface: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        facilityId: z.string(),
        name: z.string().min(1, "Name is required"),
        type: z.enum(["field", "court", "diamond", "rink", "other"]).optional(),
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
      const [facilityRow] = await ctx.db
        .select({ id: facility.id })
        .from(facility)
        .where(
          and(
            eq(facility.id, input.facilityId),
            eq(facility.organizationId, input.organizationId),
          ),
        );
      if (!facilityRow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Facility not found",
        });
      }
      const [created] = await ctx.db
        .insert(facilitySurface)
        .values({
          facilityId: input.facilityId,
          name: input.name.trim(),
          type: input.type ?? "other",
        })
        .returning();
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add surface",
        });
      }
      return created;
    }),

  /** Update a facility surface. */
  updateFacilitySurface: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        facilityId: z.string(),
        surfaceId: z.string(),
        name: z.string().min(1).optional(),
        type: z.enum(["field", "court", "diamond", "rink", "other"]).optional(),
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
      const [facilityRow] = await ctx.db
        .select({ id: facility.id })
        .from(facility)
        .where(
          and(
            eq(facility.id, input.facilityId),
            eq(facility.organizationId, input.organizationId),
          ),
        );
      if (!facilityRow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Facility not found",
        });
      }
      const [updated] = await ctx.db
        .update(facilitySurface)
        .set({
          ...(input.name != null ? { name: input.name.trim() } : {}),
          ...(input.type != null ? { type: input.type } : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(facilitySurface.id, input.surfaceId),
            eq(facilitySurface.facilityId, input.facilityId),
          ),
        )
        .returning();
      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Surface not found",
        });
      }
      return updated;
    }),

  /** Remove a surface from a facility. */
  removeFacilitySurface: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        facilityId: z.string(),
        surfaceId: z.string(),
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
      const [facilityRow] = await ctx.db
        .select({ id: facility.id })
        .from(facility)
        .where(
          and(
            eq(facility.id, input.facilityId),
            eq(facility.organizationId, input.organizationId),
          ),
        );
      if (!facilityRow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Facility not found",
        });
      }
      const [deleted] = await ctx.db
        .delete(facilitySurface)
        .where(
          and(
            eq(facilitySurface.id, input.surfaceId),
            eq(facilitySurface.facilityId, input.facilityId),
          ),
        )
        .returning({ id: facilitySurface.id });
      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Surface not found",
        });
      }
      return { id: deleted.id };
    }),
});
