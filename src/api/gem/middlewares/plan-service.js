'use strict';

/**
 * collection service
 */

module.exports = (config, { strapi }) => {
 
    return async (ctx, next) => {
        const { user } = ctx.state;
        const { data } = ctx.request.body
        const { module, isPublic, isRecord } = ctx.request.query;

        if(isPublic === "true") { return next() }

        const userPlan = await strapi.db.query('api::plan-service.plan-service').findOne({
            where: {
                author: user.id
            }
        })

        // const configLimit = await strapi.entityService.findMany('api::config-limit.config-limit')
        
        //     if (userPlan && userPlan.plan === 'free' && parseInt(userPlan.gem_used) >= parseInt(configLimit[0].gem_limit)) {
        //         return ctx.tooManyRequests('Folders bookmark limit is exceeded Please extend your service plan')
        //     }
        // if (isRecord) {
        //     if (userPlan && parseInt(userPlan?.audio_recording_used) >= parseInt(userPlan?.audio_recording)) {
        //         return ctx.tooManyRequests('Audio recording bookmark limit is exceeded Please extend your service plan')
        //     }
        // }
        if (data && Array.isArray(data) && data.length > 0 && data?.[0]?.isBookmarkImport) return next()
        if (data && Array.isArray(data) && (parseInt(userPlan.gem_used) + data.length) >= parseInt(userPlan.gem_limit)) {
            return ctx.tooManyRequests('Your Gem Limit exceeded, please upgrade your plan, buy add-ons or earn some credits to unlock more!')
        }

        if (userPlan && parseInt(userPlan?.gem_used) >= parseInt(userPlan?.gem_limit)) {
            return ctx.tooManyRequests('Your Gem Limit exceeded, please upgrade your plan, buy add-ons or earn some credits to unlock more!')
        }

        return next()

    }
}

