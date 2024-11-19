'use strict';

/**
 * collection service
 */

module.exports = (config, { strapi }) => {

    return async (ctx, next) => {
        const { gemId,
            id } = ctx.params
        const { body } = ctx.request
        const typeArr = ["number", "string"]
        const gId = gemId || id
        if (gId) {
            const gem = await strapi.entityService.findOne("api::gem.gem", gId, {
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
            console.log("Gem 2 ===>", gem?.media?.status, gem?.media?.publishedContent)
            if (gem?.media_type === "Blog" && ctx?.request?.method === "GET" && (gem?.media?.status === "Published" || (gem?.media?.status === "Draft" && gem?.media?.publishedContent !== null && gem?.media?.publishedContent !== undefined))) return next()
            if (gem?.isPublic && ctx?.request?.method === "GET") return next()

            if (gem) {
                let tagGemPermission;
                const tags = body?.data?.tags || gem.tags?.map((t) => t.id)
                if (tags?.length > 0) {
                    for (const t of tags) {
                        const tId = typeof t === "number" ? t : t?.id ? t?.id : null
                        if (tId !== null) {
                            tagGemPermission = await strapi.service("api::collection.common-check").tagPermissionMiddlewareFunc(tId, ctx.state?.user, ctx, true)
                            if (tagGemPermission.status === 200) break;
                        }
                    }
                }
                if (gem && tagGemPermission?.status !== 200) {
                    const gemPermission = await strapi.service("api::collection.common-check").permissinosMiddlewareFunc(gem?.collection_gems?.id, ctx.state?.user, ctx, true)
                    if (gemPermission.status === 403) return ctx.forbidden("This action is unauthorized")
                }
            }

            if (body.data && body.data.collection_gems && body.data.collection_gems !== gem.collection_gems.id) {
                const gemPermission = await strapi.service("api::collection.common-check").permissinosMiddlewareFunc(body.data.collection_gems, ctx.state?.user, ctx, true)
                if (gemPermission.status === 403) return ctx.forbidden("This action is unauthorized")
            }
        }

        else if (body.data && body.data.collection_gems) {
            const gemPermission = await strapi.service("api::collection.common-check").permissinosMiddlewareFunc(body.data.collection_gems, ctx.state?.user, ctx, true)
            if (gemPermission.status === 403) return ctx.forbidden("This action is unauthorized")
        }

        if (body.collections && typeArr.indexOf(typeof body.collections) !== -1) {
            const gemPermission = await strapi.service("api::collection.common-check").permissinosMiddlewareFunc((typeof body.collections === "string") ? parseInt(body.collections) : body.collections, ctx.state?.user, ctx, true)
            if (gemPermission.status === 403) return ctx.forbidden("This action is unauthorized")
        }

        if (body.collection_gems && typeArr.indexOf(typeof body.collection_gems) !== -1) {
            const gemPermission = await strapi.service("api::collection.common-check").permissinosMiddlewareFunc((typeof body.collection_gems === "string") ? parseInt(body.collection_gems) : body.collection_gems, ctx.state?.user, ctx, true)
            if (gemPermission.status === 403) return ctx.forbidden("This action is unauthorized")
        }

        return next()
    }
}

