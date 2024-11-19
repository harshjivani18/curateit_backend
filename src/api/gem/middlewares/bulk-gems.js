'use strict';

/**
 * collection service
 */

module.exports = (config, { strapi }) => {

    return async (ctx, next) => {
        const { body }     = ctx.request

        // To check whether bulk bookmark able to update or not
        if (body.bookmarks && body.bookmarks.length !== 0) {
            const bookmark = body.bookmarks[0]
            const gem      = await strapi.entityService.findOne("api::gem.gem", bookmark.id, {
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

            if (gem.author.id === ctx?.state?.user?.id) return next()

            if (gem.collection_gems?.id) {
                const gemPermission = await strapi.service("api::collection.common-check").permissinosMiddlewareFunc(gem.collection_gems?.id, ctx.state?.user, ctx, true)
                if (gemPermission.status === 403) return ctx.forbidden("This action is unauthorized")
            }

            if (bookmark.collection_gems && bookmark.collection_gems !== gem.collection_gems?.id) {
                const gemPermission = await strapi.service("api::collection.common-check").permissinosMiddlewareFunc(bookmark.collection_gems, ctx.state?.user, ctx, true)
                if (gemPermission.status === 403) return ctx.forbidden("This action is unauthorized")
            }

            return next()

        }
        
        // To check whether bulk add able to add in collection
        if (body.data && body.data.length !== 0) {
            const obj = body.data[0]
            if (obj.collection_gems && typeof obj.collection_gems === "number") {
                const gemPermission = await strapi.service("api::collection.common-check").permissinosMiddlewareFunc(obj.collection_gems, ctx.state?.user, ctx, true)
                if (gemPermission.status === 403) return ctx.forbidden("This action is unauthorized")
            }

            return next()
        }

        // To check for bulk gem delete
        if (body.gemId && Array.isArray(body.gemId)) {
            const resArr = []
            for (const idx in body.gemId) {
                const gId   = body.gemId[idx]
                const gem   = await strapi.entityService.findOne("api::gem.gem", gId, {
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
                if (gem.author.id === ctx.state?.user?.id) resArr.push({ status: 200 })
                const gemPermission = await strapi.service("api::collection.common-check").permissinosMiddlewareFunc(gem.collection_gems?.id, ctx.state?.user, ctx, true)
                resArr.push(gemPermission)
            }
            const idx = resArr.findIndex((r) => { return r.status === 403 })
            if (idx !== -1) return ctx.forbidden("This action is not authorized")
        }

        return next()
    }
}

