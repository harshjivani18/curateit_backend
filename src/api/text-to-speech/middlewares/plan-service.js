'use strict';

/**
 * collection service
 */

module.exports = (config, { strapi }) => {

    return async (ctx, next) => {
        const { user } = ctx.state;
        const data =  ctx.request.body;

        const userPlan = await strapi.db.query('api::plan-service.plan-service').findOne({
            where: {
                author: user.id
            }
        })
        const speechLimit = await strapi.db.query("api::text-to-speech.text-to-speech").findOne({
            where: { url: data.url, author: user.id}
        })

        // const configLimit = await strapi.entityService.findMany('api::config-limit.config-limit')
        // if (userPlan && userPlan.plan === 'free' && parseInt(userPlan.speech_used) >= parseInt(configLimit[0].speech_limit)) {
        //     // return ctx.send({ msg: 'Folders bookmark limit is exceeded Please extend your service plan' })
        //     return ctx.tooManyRequests('Folders bookmark limit is exceeded Please extend your service plan')
        // }
        if (!speechLimit) {
            if (userPlan && parseInt(userPlan?.speech_used) >= parseInt(userPlan?.speech_limit)) {
                return ctx.tooManyRequests('Text to speech Limit exceeded, please upgrade your plan, buy add-ons or earn some credits to unlock more!')
            }
        }

        return next()
    }
}

