'use strict';

/**
 * collection service
 */

module.exports = (config, { strapi }) => {

    return async (ctx, next) => {
        const { user }      = ctx.state;
        const { isShare }   = ctx.request.query;

        const userPlan      = await strapi.db.query('api::plan-service.plan-service').findOne({
            where: {
                author: user.id
            }
        })

        // const configLimit = await strapi.entityService.findMany('api::config-limit.config-limit')

        // if (userPlan && userPlan.plan === 'free' && parseInt(userPlan.coll_used) >= parseInt(configLimit[0].coll_limit)) {
        //     return ctx.tooManyRequests('Folders bookmark limit is exceeded Please extend your service plan')
        // }
        if (ctx?.request?.body?.isBookmarkImport) return next()
        if (userPlan && isShare && parseInt(userPlan?.public_collection_and_tags_used) >= parseInt(userPlan?.public_collection_and_tags)) {
            return ctx.tooManyRequests('Public Collection and Tags limit exceeded, please upgrade your plan buy add-ons or earn some credits to unlock more!')
        }

        if (userPlan && !isShare && parseInt(userPlan?.coll_used) >= parseInt(userPlan?.coll_limit)) {
            return ctx.tooManyRequests('Collection Limit Exceeded, please upgrade your plan buy add-ons or earn some credits to unlock more!')
        }

        return next()

    }
}

