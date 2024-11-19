'use strict';

/**
 * collection service
 */

module.exports = (config, { strapi }) => {

    return async (ctx, next) => {
        const { gemId }    = ctx.params
        const { body }     = ctx.request
        const typeArr      = ["number", "string"]
        
        if (gemId) {
            const gem      = await strapi.entityService.findOne("api::gem.gem", gemId, {
                // fields: ["isPublic"],
                populate: {
                    author: {
                        fields: ["id"]
                    },
                    collection_gems: {
                        fields: ["id"]
                    }
                }
            })

            if (gem.collection_gems?.id) {
                const gemPermission = await strapi.service("api::collection.common-check").permissinosMiddlewareFunc(gem.collection_gems?.id, ctx.state?.user, ctx, true)
                if (gemPermission.status === 403) return ctx.forbidden("This action is unauthorized")
            }
        }

        if (body.collections && typeArr.indexOf(typeof body.collections) !== -1) {
            const gemPermission = await strapi.service("api::collection.common-check").permissinosMiddlewareFunc(body.collections, ctx.state?.user, ctx, true)
            if (gemPermission.status === 403) return ctx.forbidden("This action is unauthorized")
        }  

        return next()
    }
}

