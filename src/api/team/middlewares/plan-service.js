'use strict';

/**
 * collection service
 */

module.exports = (config, { strapi }) => {

    return async (ctx, next) => {
        const { user } = ctx.state;
        const { isMember, isGuest } = ctx.request.body.data
        const userPlan = await strapi.db.query('api::plan-service.plan-service').findOne({
            where: {
                author: user.id
            }
        })

        if (userPlan && isMember && parseInt(userPlan?.included_members_used) >= parseInt(userPlan?.included_members)) {
            return ctx.tooManyRequests('Member Limit exceeded, please upgrade your plan, buy add-ons or earn some credits to unlock more!')
        }

        if (userPlan && isGuest && parseInt(userPlan?.guest_users_used) >= parseInt(userPlan?.guest_users)) {
            return ctx.tooManyRequests('Guest user Limit exceeded, please upgrade your plan, buy add-ons or earn earn some credits to unlock more!')
        }

        return next()
    }
}

