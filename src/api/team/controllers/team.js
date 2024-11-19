'use strict';

/**
 * team controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::team.team', ({ strapi }) => ({

    async find(ctx) {
        try {
            const { id } = ctx.state.user;

            const planService = await strapi.db.query("api::plan-service.plan-service").findOne({
                where: { author: id },
                populate: {
                    subscription: {
                        select: ["id", "subscription_id"]
                    },
                    related_plan: {
                        select: ["id", "is_team_plan"]
                    }
                }
            })

            if (planService?.related_plan?.is_team_plan === true && planService?.subscription?.id) {
                const teamUsers = await strapi.db.query("api::plan-service.plan-service").findMany({
                    where: { subscription: planService?.subscription?.id },
                    populate: {
                        author: {
                            select: ["id", "username"]
                        }
                    }
                })
                if (teamUsers?.length > 0) {
                    const teamList = await strapi.entityService.findMany("api::team.team", {
                        filters: { author: { id: { $in: teamUsers?.map((t) => t.author.id)} } },
                        populate: {
                            username: {
                                fields: ["id", "username", "firstname", "lastname", "email", "profilePhoto"]
                            },
                            author: {
                                fields: ["id", "username"]
                            },
                            collections: {
                                fields: ["id", "name", "slug", "invitedUsersViaMail"],
                                populate: {
                                    author: {
                                        fields: ["id", "username"]
                                    },
                                }
                            },
                            tags: {
                                fields: ["id", "tag", "slug", "invitedUsersViaMail"],
                                populate: {
                                    users: {
                                        fields: ["id", "username"]
                                    },
                                }
                            }
                        }
                    })
        
                    teamList?.forEach((t) => {
                        t?.collections?.forEach((c) => {
                            c?.invitedUsersViaMail.forEach((i) => {
                                if ((parseInt(i?.id) === parseInt(t?.username?.id) || (i?.emailId === t?.email)) && !i.isGroupShare) {
                                    c.accesstype = i.accessType
                                }
                            })
                            delete c.invitedUsersViaMail
                        })
                        t?.tags?.forEach((c) => {
                            c?.invitedUsersViaMail.forEach((i) => {
                                if ((parseInt(i?.id) === parseInt(t?.username?.id) || (i?.emailId === t?.email)) && !i?.isGroupShare) {
                                    c.accesstype = i.accessType
                                }
                            })
                            delete c.invitedUsersViaMail
                        })
                    })
        
                    const members = [];
                    const guests = [];
        
                    teamList?.forEach((t) => {
                        if (t.isMember === true) {
                            members.push(t)
                        } else {
                            guests.push(t)
                        }
        
                    })
        
                    return ctx.send({ status: 200, members, guests })
                }
            }

            const teamList = await strapi.entityService.findMany("api::team.team", {
                filters: { author: id },
                populate: {
                    username: {
                        fields: ["id", "username", "firstname", "lastname", "email", "profilePhoto"]
                    },
                    author: {
                        fields: ["id", "username"]
                    },
                    collections: {
                        fields: ["id", "name", "slug", "invitedUsersViaMail"],
                        populate: {
                            author: {
                                fields: ["id", "username"]
                            },
                        }
                    },
                    tags: {
                        fields: ["id", "tag", "slug", "invitedUsersViaMail"],
                        populate: {
                            users: {
                                fields: ["id", "username"]
                            },
                        }
                    }
                }
            })

            teamList?.forEach((t) => {
                t?.collections?.forEach((c) => {
                    c?.invitedUsersViaMail?.forEach((i) => {
                        if ((parseInt(i?.id) === parseInt(t?.username?.id) || (i?.emailId === t?.email)) && !i.isGroupShare) {
                            c.accesstype = i.accessType
                        }
                    })
                    delete c.invitedUsersViaMail
                })
                t?.tags?.forEach((c) => {
                    c?.invitedUsersViaMail?.forEach((i) => {
                        if ((parseInt(i?.id) === parseInt(t?.username?.id) || (i?.emailId === t?.email)) && !i?.isGroupShare) {
                            c.accesstype = i.accessType
                        }
                    })
                    delete c.invitedUsersViaMail
                })
            })

            const members = [];
            const guests = [];

            teamList?.forEach((t) => {
                if (t.isMember === true) {
                    members.push(t)
                } else {
                    guests.push(t)
                }

            })

            return ctx.send({ status: 200, members, guests })
        } catch (error) {
            return ctx.send({ status: 400, error: error.message })
        }
    },

    async create(ctx) {
        const userId = ctx.state?.user?.id;
        const { data } = ctx.request.body;

        const isExist = await strapi.db.query("api::team.team").findOne({
            where: { email: data.email, author: userId },
            populate: {
                collections: {
                    select: ["id"]
                },
                tags: {
                    select: ["id"]
                }
            }
        })

        if (isExist) {
            // strapi.service('api::team.team').updateTeamCollectionOrTags(data, isExist);
            return ctx.send(isExist)
        }
        delete data.collections
        delete data.tags
        if (data.email) {
            data.email = data.email.toLowerCase()
        }
        const team = await strapi.db.query("api::team.team").create({
            data: {
                ...data,
                publishedAt: new Date().toISOString()
            }
        })

        strapi.service('api::team.team').sendInviteWorkspaceEmail(ctx?.state?.user, data);
        return ctx.send(team)
    }
}));
