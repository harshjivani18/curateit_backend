'use strict';

const { default: slugify } = require('slugify');

/**
 * gem controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::tag.tag', ({strapi}) => ({
    tagMigration: async (ctx) => {
        const tags = await strapi.entityService.findMany('api::tag.tag', {
            populate: {
                users: {
                    fields: ["id", "username"]
                }
            }
        });
        // try {
            for (const tag of tags) {
                const slug   = slugify(tag.tag, { lower: true, remove: /[&,+()$~%.'":*?<>{}/\/]/g  })
                const author = tag?.users?.[0]
                const updateObj = {
                    slug
                }
                if (tag.sharable_links && tag.sharable_links !== "") {
                    updateObj.sharable_links = `${process.env.REDIRECT_URI}/u/${author?.username}/tags/${tag.id}/${slug}?public=true`
                }
                await strapi.entityService.update('api::tag.tag', tag.id, { data: updateObj })
            }
            return ctx.send("Tags Migrated!")
        // } catch (error) {
        //     return ctx.send({
        //         message: error
        //     })
        // }

    },

    orderOfGemsByTag: async (ctx) => {
        try {
            const tags = await strapi.entityService.findMany("api::tag.tag", {
                populate: {
                    gems: {
                        fields: ["id"]
                    }
                }
            })

            tags.forEach((t) => {
                const orderArr = [];
                t?.gems?.forEach((g) => {
                    orderArr.push(g.id)
                })
                strapi.entityService.update("api::tag.tag", t.id, {
                    data: {
                        order_of_gems: orderArr
                    }
                })
            })

            return ctx.send("Order of Gems Updated!")
        } catch (error) {
            return ctx.send({ status: 400, error: error.message})
        }
    }
      
}));
