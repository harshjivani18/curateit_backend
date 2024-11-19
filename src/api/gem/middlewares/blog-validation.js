'use strict';

/**
 * collection service
 */

module.exports = (config, { strapi }) => {

    return async (ctx, next) => {
        const { blogId }    = ctx.request.query
        const blogGemId     = ctx?.request?.params?.blogId
        const { user }      = ctx.state
        
        let queryParam = {
            media: { $notNull: true, $containsi: blogId },
            media_type: "Blog" 
        }

        if (blogGemId && !blogId) {
            queryParam = {
                id: blogGemId
            }
        }

        const gem = await strapi.db.query('api::gem.gem').findOne({
            where: queryParam,
            populate: {
                author: {
                    fields: ["id", "username", "email", "profilePhoto", "firstname", "lastname"]
                },
                collection_gems: {
                    fields: ["id", "sharable_links"]
                },
                tags: {
                    fields: ["id", "sharable_links"]
                }
            }
        });

        if (user?.id === gem?.author?.id) return next()
        
        console.log("Gem ===>", gem?.media?.status, gem?.media?.publishedContent)
        if (gem?.media?.status === "Published" || (gem?.media?.status === "Draft" && gem?.media?.publishedContent !== null)) return next()

        let isPublic = false

        if (gem?.collection_gems?.sharable_links && gem?.collection_gems?.sharable_links !== "") {
            isPublic = true
        }

        const idx = gem?.tags.findIndex((t) => t.sharable_links && t.sharable_links !== "")
        if (idx !== -1) {
            isPublic = true
        }

        if (isPublic) return next()

        isPublic = await strapi.service('api::collection.checks').checkIsRootPublic(gem.collection_gems?.id)
        if (!isPublic) {
            for (const tag of gem.tags) {
                isPublic = await strapi.service('api::tag.checks').checkIsRootPublic(tag.id)
                if (isPublic) {
                    break
                }
            }
        }

        if (!isPublic) return ctx.forbidden("This action is unauthorized")
        
        return next()
    }
}