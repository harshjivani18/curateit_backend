'use strict';

const { getURLBufferData, uploadUrlFile } = require('../../../../utils');

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::collection.collection', ({ strapi }) => ({

    async createInstawall(ctx) {
        try {
            const { id } = ctx.state.user;
            const data = ctx.request.body;

            let instaCollection
            instaCollection = await strapi.db.query("api::collection.collection").findOne({
                where: { author: id, name: "Insta Wall" }
            })

            if (!instaCollection) {
                instaCollection = await strapi.entityService.create("api::collection.collection", {
                    data: {
                        name: "Insta Wall",
                        author: id,
                        publishedAt: new Date().toISOString()
                    }
                })
                
                await strapi.db.query("plugin::users-permissions.user").update({
                    where: { id },
                    data: {
                        instawall_collection: instaCollection.id
                    }
                })

            }

            for (const d of data) {
                const gem = await strapi.db.query("api::gem.gem").findOne({
                    where: { author: id, collection_gems: instaCollection.id, url: d.fileUrl }
                })

                if (!gem) {
                    const urlData = await getURLBufferData(d.fileUrl);
                    const filename = urlData.filename
                    const s3Link = await uploadUrlFile(id, urlData, filename)
    
                    const obj = {
                        title: d.title,
                        description: d.description,
                        url: d.fileUrl,
                        FileName: d.fileName,
                        item_id: d.id,
                        fileType: d.fileType,
                        S3_link: [s3Link],
                        redirect_url: d.redirect_url,
                        author: id,
                        collection_gems: instaCollection,
                        publishedAt: new Date().toISOString()
                    }
                    await strapi.entityService.create("api::gem.gem", {
                        data: obj
                    })
                }
            }

            return ctx.send({ status: 200, message: "Insta Wall updated" })
        } catch (error) {
            return ctx.send({ status: 400, error: error.message });
        }
    },

    async getInstawall(ctx) {
        try {
            const { id } = ctx.state.user;

            const instaCollection = await strapi.db.query("api::collection.collection").findOne({
                where: { name: "Insta Wall", author: id },
                populate: {
                    gems: {
                        select: ["id", "title", "description", "url", "S3_link", "FileName", "fileType", "item_id", "redirect_url"]
                    }
                }
            })

            return ctx.send({ status: 200, data: instaCollection })
        } catch (error) {
            return ctx.send({ status: 400, error: error.message })
        }
    }

}))