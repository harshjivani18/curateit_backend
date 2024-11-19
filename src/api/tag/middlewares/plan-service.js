'use strict';

/**
 * collection service
 */

module.exports = (config, { strapi }) => {

    return async (ctx, next) => {
        const { user } = ctx.state;
        const { isShare } = ctx.request.query;

        // const [userPlan, configLimit] = await Promise.all([
        //     strapi.db.query('api::plan-service.plan-service').findOne({
        //         where: {
        //             author: user.id
        //         }
        //     }),
        //     strapi.entityService.findMany('api::config-limit.config-limit')
        // ])

        const userPlan = await strapi.db.query('api::plan-service.plan-service').findOne({
            where: {
                author: user.id
            }
        })

        if (userPlan && isShare && parseInt(userPlan?.public_collection_and_tags_used) >= parseInt(userPlan?.public_collection_and_tags)) {
            return ctx.tooManyRequests('Public Tag limit is exceeded Please extend your service plan')
        }

        // if (userPlan && userPlan.plan === 'free' && parseInt(userPlan.tag_used) >= parseInt(configLimit[0].tag_limit)) {
        //     return ctx.tooManyRequests('Folders bookmark limit is exceeded Please extend your service plan')
        // }
        if (userPlan && !isShare && userPlan?.plan === 'free' && parseInt(userPlan?.tag_used) >= parseInt(userPlan?.tag_limit)) {
            return ctx.tooManyRequests('Tag limit is exceeded Please extend your service plan')
        }

        return next()
    }
}

