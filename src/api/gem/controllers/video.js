'use strict';

const { convertRestQueryParams } = require('strapi-utils/lib');

/**
 * gem controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { updateGemiScoreRecs ,updatePlanService, getFullScreenshot } = require("../../../../utils");

module.exports = createCoreController('api::gem.gem', ({strapi}) => ({

    createVideo: async (ctx) => {
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
            collections,
            expander,
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
            const uploadedFile  =  fileType === "url" ? url : await strapi.service('api::gem.video').uploadVideo(files.files)
            const mediaObj      = media ? typeof media === "string" ? JSON.parse(media) : media : null
            if (mediaObj) {
                mediaObj.videoLink = uploadedFile
            }
            const obj           = {
                title,
                description,
                expander: expander === "" ? [] : expander,
                metaData: metaData ? typeof metaData === "string" ?  JSON.parse(metaData) : metaData : null,
                media_type: "Video",
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
            const video = await strapi.entityService.create("api::gem.gem", {
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
            // getFullScreenshot(video);
            ctx.send(video)
        }
        catch (err) {
            ctx.send({
                message: err
            })
        }  
    },

    deleteVideo: async (ctx) => {
        const { user }       = ctx.state

        if (!user) {
            ctx.send({
                message: "Unauthorized User!"
            })
            return
        }

        const { gemId }     = ctx.params
        try {
            
            const videoGem = await strapi.entityService.delete("api::gem.gem", gemId);
        
            ctx.send(videoGem)
        } catch (error) {
            ctx.send({
                message: error
            })
        }
    },

    getAllVideos: async (ctx) => {
        const { user } = ctx.state

        if (!user) {
            ctx.send({
                message: "Unauthorized User!"
            })
            return
        }

        try {
            const videos = await strapi.entityService.findMany("api::gem.gem", {
                filters: {
                    author: user.id, 
                    media_type: "Video"
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

            ctx.send(videos)
        } catch (error) {
            ctx.send({
                message: error
            })
        }

    },

    updateVideo: async (ctx) => {
        const { user }      = ctx.state
        if (!user) {
            ctx.send({
                message: "Unauthorized User!"
            })
            return
        }

        const { gemId }   = ctx.params
        const { body,
                files }     = ctx.request

        try {
            const obj       = {
                title: body.title,
                description: body.description,
                remarks: body.notes,
                showThumbnail: body.showThumbnail !== undefined ? body.showThumbnail : true,
                is_favourite: body.is_favourite,
                collection_gems: body.collections,
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
            
            if (files) {
                const uploadedFile  = await strapi.service('api::gem.video').uploadVideo(files.files)
                obj.media           = { videoLink: uploadedFile }
                obj.S3_link         = [uploadedFile]
                obj.tags            = JSON.parse(body.tags).map((tag) => tag.id);
            }
            const video = await strapi.entityService.update("api::gem.gem", gemId, {
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
            ctx.send(video)
        }
        catch (err) {
            ctx.send({
                message: err
            })
        }  
    },

    getVideoById: async (ctx) => {
        const { user }      = ctx.state

        if (!user) {
            ctx.send({
                message: "Unauthorized User!"
            })
            return
        }

        const { gemId }   = ctx.params
        try {
            const videos = await strapi.entityService.findOne("api::gem.gem", gemId, {
                populate: {
                    tags: {
                        fields: ["id", "tag", "slug"]
                    },
                    collection_gems: {
                        fields: ["id", "name", "slug"]
                    }
                }
            });
            ctx.send(videos)
        } catch (error) {
            ctx.send({
                message: error
            })
        }

    },
      
}));
