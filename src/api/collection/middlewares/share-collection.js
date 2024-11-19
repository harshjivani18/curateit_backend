'use strict';

/**
 * collection service
 */

module.exports = (config, { strapi }) => {

    return async (ctx, next) => {
        let collId                                 = null
        const { collectionId, sourceCollectionId,
                id,
                gemId }                            = ctx.params
        const { body }                             = ctx.request
        let sourceResp                             = null
        
        if (!collectionId && id) {
            collId = id
        }
        else if (!collectionId && !id) {
            collId = ctx.request.query.collectionId
        }
        else if (collectionId) {
            collId = collectionId
        }

        if(ctx.request.query.isBio) {
            return next()
        }

        if (gemId) {
            const gem   = await strapi.entityService.findOne("api::gem.gem", gemId, {
                // fields: ["isPublic"],
                populate: {
                    author: {
                        fields: ["id"]
                    },
                    collection_gems: {
                        fields: ["id"]
                    },
                    tags: {
                        fields: ["id"]
                    }
                }
            })


            if (gem?.author?.id === ctx?.state?.user?.id && !collId) return next()

            if (gem.tags && gem.tags.lenth > 0) {
                let tagGemPermission;
                for (const t of gem.tags) {
                    const tId = typeof t === "number" ? t : t?.id ? t?.id : null
                    if (tId !== null) {
                        tagGemPermission = await strapi.service("api::collection.common-check").tagPermissionMiddlewareFunc(tId, ctx.state?.user, ctx)
                    }
                }
            }

            if (gem?.collection_gems?.id) {
                const gemPermission = await strapi.service("api::collection.common-check").permissinosMiddlewareFunc(gem.collection_gems?.id, ctx.state?.user, ctx)
                if (gemPermission.status === 403) return ctx.forbidden("This action is unauthorized")
            }

            if (collId) {
                const collRes = await strapi.service("api::collection.common-check").permissinosMiddlewareFunc(collId, ctx.state?.user, ctx)
                if (collRes?.status === 403) return ctx.forbidden("This action is unauthorized")
            }

            return next()
        }

        if (!collId && !sourceCollectionId && body) {
            if (body.data?.collection) {
                const collRes = await strapi.service("api::collection.common-check").permissinosMiddlewareFunc(body.data?.collection, ctx.state?.user, ctx)
                if (collRes?.status === 403) return ctx.forbidden("This action is unauthorized")
            }
            else if (body.data?.collection_gems) {
                const collRes = await strapi.service("api::collection.common-check").permissinosMiddlewareFunc(body.data?.collection_gems, ctx.state?.user, ctx)
                if (collRes?.status === 403) return ctx.forbidden("This action is unauthorized")
            }
            return next()
        }

        if (sourceCollectionId) {
            sourceResp = await strapi.service("api::collection.common-check").permissinosMiddlewareFunc(sourceCollectionId, ctx.state?.user, ctx)                  
        }

        if (sourceResp?.status === 403) {
            return ctx.forbidden("This action is unauthorized")
        }

        if (collId) {
            const collectionRes = await strapi.service("api::collection.common-check").permissinosMiddlewareFunc(collId, ctx.state?.user, ctx)
            if (collectionRes.status === 403) {
                return ctx.forbidden("This action is unauthorized")
            }
        }

        return next()
    }
}

