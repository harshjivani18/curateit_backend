'use strict';

/**
 * collection service
 */

module.exports = (config, { strapi }) => {

    return async (ctx, next) => {
        const { isPublic } = ctx.request.query;

        if(isPublic === "true") { return next() }
        const userId            = ctx.state.user?.id;
        const userPlan          = await strapi.db.query('api::plan-service.plan-service').findOne({
            where: {
                author: userId
            }
        })

        // const configLimit = await strapi.entityService.findMany('api::config-limit.config-limit')

        // if ( && userPlan.plan === 'free' && parseInt(userPlan.ocr_image_used) >= parseInt(configLimit[0].ocr_image_limit)) {
        //     return ctx.tooManyRequests('Your image to text conversion limit is exceeded Please extend your service plan');
        // }
        if (userPlan && userPlan?.plan === 'free' && parseInt(userPlan?.ocr_image_used) >= parseInt(userPlan?.ocr_image_limit)) {
            return ctx.tooManyRequests('Your image to text conversion limit is exceeded Please extend your service plan');
        }

        return next()
    }
}

