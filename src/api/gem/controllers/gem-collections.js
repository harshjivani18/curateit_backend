'use strict';

const { populate } = require('dotenv');
// const { v4: uuidv4 } = require("uuid");
const { nanoid } = require('nanoid');
const { default: slugify } = require('slugify');

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::gem.gem', ({strapi}) => ({
 
    fetchGemRelatedCollections: async (ctx) => {
        const { gemId } = ctx.params
        const gem       = await strapi.entityService.findOne("api::gem.gem", gemId, {
            populate: {
                collection_gems: {
                    populate: {
                        id: true,
                        parent_collection: {
                            fields: ["id", "name", "slug", "order_of_sub_collections", "order_of_gems", "wallpaper", "background", "avatar", "iconLink", "media_type", "otherSupportedMediaTypes"],
                            populate: {
                                author: {
                                    fields: ["id", "username", "email", "profilePhoto", "firstname", "lastname"]
                                },
                                gems: {
                                    fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId", "isApproved", "isPending"],
                                    populate: {
                                        author: {
                                            fields: ["id", "username", "firstname", "profilePhoto"]
                                        },
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        if (!gem) {
            return ctx.notFound("Gem not found")
        }

        const relatedCollections = gem.collection_gems?.parent_collection?.map((collection) => {
            const gems = collection.gems ? [ ...collection.gems ] : []
            delete collection.gems
            return {
                ...collection,
                bookmarks: gems.slice(0, 5)
            }
        })

        return ctx.send({ collectionId: gem.collection_gems.id, related_collections: relatedCollections || [] })
    },

    fetchCurateitGemMediaType: async (ctx) => {
        const { url }   = ctx.request.body
        if (!url.includes("curateit.com")) {
            return ctx.send({ media_type: "Link" })
        }

        const gem       = await strapi.db.query("api::gem.gem").findOne({
            where: {
                url: url
            },
            select: ["media_type"]
        })

        return ctx.send({ media_type: gem?.media_type || "Link" })
    }
      
}));
