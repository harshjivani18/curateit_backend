'use strict';

/**
 * collection service
 */

module.exports = (config, { strapi }) => {

    return async (ctx, next) => {
 
        let { id, tagId, collectionId }                            = ctx.params
        const qTagId                                               = ctx.request.query.tagId
        if (tagId && !id) {
            id = tagId
        }

        if (qTagId && !id && !tagId) {
            id = qTagId
        }

        if (id) {
            const collectionRes = await strapi.service("api::tag.common-check").permissinosMiddlewareFunc(id, ctx.state?.user, ctx, collectionId)
            if (collectionRes.status === 403) {
                return ctx.forbidden("This action is unauthorized")
            }
        }

        return next()
    }
}

