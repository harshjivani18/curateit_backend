'use strict';

const { convertRestQueryParams } = require('strapi-utils/lib');

/**
 * gem controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { updateGemiScoreRecs ,updatePlanService, getFullScreenshot } = require("../../../../utils");

module.exports = createCoreController('api::gem.gem', ({strapi}) => ({

    createPDF: async (ctx) => {
        const { user }      = ctx.state
        const { files }     = ctx.request
        const {
            title,
            description,
            metaData,
            url,
            tags,
            notes,
            is_favourite,
            expander,
            collections,
            showThumbnail,
            fileType
        } = ctx.request.body

        // if (!user) {
        //     ctx.send({
        //         message: "Unauthorized User!"
        //     })
        //     return
        // }

        try {
            let media = ctx.request.body.media
            const uploadedFile  = fileType === "url" ? url : await strapi.service('api::gem.pdf').uploadPDF(files.files)
            const mediaObj      = media ? typeof media === "string" ? JSON.parse(media) : media : null
            if (mediaObj) {
                mediaObj.pdfLink = uploadedFile
            }
            const obj           = {
                title,
                description,
                expander: expander === "" ? [] : expander,
                metaData: metaData ? typeof metaData === "string" ? JSON.parse(metaData) : metaData : null,
                media_type: "PDF",
                media: mediaObj,
                S3_link: [uploadedFile],
                url: uploadedFile ? uploadedFile : url || "",
                showThumbnail: showThumbnail !== undefined ? showThumbnail : true,
                author: user?.id,
                tags: tags ? typeof tags === "string" ? JSON.parse(tags) : tags : [],
                remarks: notes || "",
                is_favourite: is_favourite || false,
                fileType,
                collection_gems: collections,
                publishedAt: new Date().toISOString(),
            }
            const pdf = await strapi.entityService.create("api::gem.gem", {
                data: obj,
                populate: {
                    tags: {
                        fields: ["id", "tag", "slug"]
                    },
                    collection_gems: {
                        fields: ["id", "name", "slug"]
                    }
                }
            });
            // getFullScreenshot(pdf);
            ctx.send(pdf)
        }
        catch (err) {
            ctx.send({
                message: err
            })
        }  
    },

    deletePDF: async (ctx) => {
        const { user }       = ctx.state

        if (!user) {
            ctx.send({
                message: "Unauthorized User!"
            })
            return
        }

        const { gemId }     = ctx.params
        try {
            
            const pdfGem    = await strapi.entityService.delete("api::gem.gem", gemId);
        
            ctx.send(pdfGem)
        } catch (error) {
            ctx.send({
                message: error
            })
        }
    },

    getAllPDF: async (ctx) => {
        const { user } = ctx.state

        if (!user) {
            ctx.send({
                message: "Unauthorized User!"
            })
            return
        }

        try {
            const pdf = await strapi.entityService.findMany("api::gem.gem", {
                filters: {
                    author: user.id, 
                    media_type: "PDF"
                },
                populate: {
                    tags: {
                        fields: ["id", "tag", "slug"]
                    },
                    collection_gems: {
                        fields: [ "id", "name", "slug" ]
                    }
                }
            });

            ctx.send(pdf)
        } catch (error) {
            ctx.send({
                message: error
            })
        }

    },

    updatePDF: async (ctx) => {
        const { user }      = ctx.state
        if (!user) {
            ctx.send({
                message: "Unauthorized User!"
            })
            return
        }

        const { gemId }     = ctx.params
        const { body }      = ctx.request

        try {
            const obj       = {
                title: body.title,
                description: body.description,
                remarks: body.notes,
                is_favourite: body.is_favourite,
                collection_gems: body.collections,
                showThumbnail: body.showThumbnail !== undefined ? body.showThumbnail : true,
                publishedAt: new Date().toISOString(),
            }

            if (body.metaData) {
                obj["metaData"] = body.metaData
            }
            if (body.tags) {
                obj["tags"] = body.tags
            }
            if (body.expander) {
                obj["expander"] = body.expander
            }
            
            const pdf = await strapi.entityService.update("api::gem.gem", gemId, {
                data: obj,
                populate: {
                    tags: {
                        fields: ["id", "tag", "slug"]
                    },
                    collection_gems: {
                        fields: ["id", "name", "slug"]
                    }
                }
            });
            ctx.send(pdf)
        }
        catch (err) {
            ctx.send({
                message: err
            })
        }  
    },

    getPDFById: async (ctx) => {
        const { user }      = ctx.state

        if (!user) {
            ctx.send({
                message: "Unauthorized User!"
            })
            return
        }

        const { gemId }   = ctx.params
        try {
            const pdf = await strapi.entityService.findOne("api::gem.gem", gemId, {
                populate: {
                    tags: {
                        fields: ["id", "tag", "slug"]
                    },
                    collection_gems: {
                        fields: ["id", "name", "slug"]
                    }
                }
            });
            ctx.send(pdf)
        } catch (error) {
            ctx.send({
                message: error
            })
        }

    },
      
}));
