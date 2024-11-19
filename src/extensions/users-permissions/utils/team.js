const createTeamData = async (result, code, team) => {
    try {
        const author = await strapi.db.query("plugin::users-permissions.user").findOne({
            where: { username: code }
        })
        const userPlanService = await strapi.db.query("api::plan-service.plan-service").findOne({
            where: { author: author?.id },
            select: ["id", "included_members", "included_members_used"],
            populate: {
                subscription: {
                    select: ["id"],
                    populate: {
                        author: {
                            select: ["id"],
                        }
                    }
                },
                related_plan: {
                    select: ["id", "display_name"]
                }
            }
        })

        if (team === "member") {
            if (parseInt(userPlanService?.subscription?.author?.id) !== parseInt(author?.id) || (userPlanService?.related_plan?.display_name === "Curator" || userPlanService?.related_plan?.display_name === "Explorer" || userPlanService?.related_plan?.display_name === "Influencer") || parseInt(userPlanService?.included_members_used) >= parseInt(userPlanService?.included_members)) {
                return
            }
            // if (parseInt(userPlanService?.included_members_used) >= parseInt(userPlanService?.included_members)) {
            //     return
            // }
        }

        if (team === "guest") {
            if (parseInt(userPlanService?.guest_users_used) >= parseInt(userPlanService?.guest_users)) {
                return
            }
        }


        const obj = {
            email: result?.email,
            isGuest: team === "guest" ? true : false,
            isMember: team === "member" ? true : false,
            author: author?.id,
            username: result?.id,
            publishedAt: new Date().toISOString()
        }

        await strapi.db.query("api::team.team").create({
            data: obj
        })

        const teamData = await strapi.db.query("api::team.team").findMany({
            where: { author: author?.id }
        })

        const members = [];
        const guests = [];
        teamData?.forEach((t) => {
            if (t.isMember === true) {
                members.push(t)
            } else {
                guests.push(t)
            }
        })

        await strapi.db.query("api::plan-service.plan-service").update({
            where: { author: author?.id },
            data: { included_members_used: members.length + 1, guest_users_used: guests.length }

        })


        return "success"
    } catch (error) {
        return error.message
    }
}

module.exports = {
    createTeamData
}