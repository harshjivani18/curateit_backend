'use strict';

// const { v4: uuidv4 } = require("uuid");
const { nanoid } = require('nanoid');
const { default: slugify } = require('slugify');

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::gem.gem', ({strapi}) => ({
 
    createBlog: async (ctx) => {
        const { user }             = ctx.state
        const { collectionId }     = ctx.params
        const {
            title,
            description,
            metaData,
            tags,
            remarks,
            is_favourite,
            expander,
            showThumbnail,
            blogContent,
            blogBanner,
            blogIcon,
            media
        } = ctx.request.body

        try {
            let mediaObj             = media ? typeof media === "string" ? JSON.parse(media) : media : null
            const blogId             = nanoid(7)
            const blogUrl            = `blog/${slugify(title)}?bid=${blogId}`;
            if (mediaObj) {
                mediaObj.blogContent        = blogContent,
                mediaObj.blogUrl            = blogUrl
                mediaObj.blogId             = blogId
                mediaObj.blogBanner         = blogBanner,
                mediaObj.blogIcon           = blogIcon
                mediaObj.status             = "Draft"
                mediaObj.publishedAt        = null
                mediaObj.publishedContent   = null
                mediaObj.showAuthor         = true
            }
            else {
                mediaObj = {
                    blogContent,
                    blogUrl,
                    blogId,
                    blogBanner,
                    blogIcon,
                    status: "Draft",
                    publishedAt: null,
                    publishedContent: null,
                    showAuthor: true
                }
            }
            
            const obj           = {
                title,
                description,
                expander: expander === "" ? [] : expander,
                metaData: metaData ? typeof metaData === "string" ? JSON.parse(metaData) : metaData : null,
                media_type: "Blog",
                media: mediaObj,
                showThumbnail: showThumbnail !== undefined ? showThumbnail : true,
                author: user?.id,
                tags: tags ? typeof tags === "string" ? JSON.parse(tags) : tags : [],
                remarks: remarks || "",
                is_favourite: is_favourite || false,
                collection_gems: collectionId,
                publishedAt: new Date().toISOString(),
            }
            const blog = await strapi.entityService.create("api::gem.gem", {
                data: obj,
                populate: {
                    tags: {
                        fields: ["id", "tag", "slug"]
                    },
                    collection_gems: {
                        fields: [ "id", "name", "slug" ]
                    }
                }
            });
            // update blog url in last created blog with blog id
            await strapi.entityService.update("api::gem.gem", blog.id, {
                data: {
                    url: `${process.env.REDIRECT_URI}/u/${user.username}/g/${blog.id}/${blog.slug}`,
                    media: { ...blog.media, blogUrl: `blog/${blog.slug}?bid=${blogId}` }
                }
            });
            // getFullScreenshot(audio);
            ctx.send(blog)
        }
        catch (err) {
            ctx.send({
                message: err
            })
        }  
    },

    getAllBlog: async (ctx) => {
        const { user }              = ctx.state
        const { collectionId }      = ctx.params

        try {
            const collectionGems = await strapi.entityService.findMany("api::gem.gem", { 
                filters: { collection_gems: Number(collectionId), media_type: "Blog", author: user.id } 
            });
            ctx.send(collectionGems)
        } catch (error) {
            ctx.send({
                message: error
            })
        }
    },

    getSingleBlog: async (ctx) => {
        const { blogId }    = ctx.request.query

        // try {
            const blog = await strapi.db.query('api::gem.gem').findOne({
                where: {
                    media: { $notNull: true, $containsi: blogId },
                    media_type: "Blog" 
                },
                populate: {
                    author: {
                        fields: ["id", "username", "email", "profilePhoto", "firstname", "lastname", "isInternalUser"]
                    }
                }
            });

            ctx.send(blog)
        // } catch (error) {
        //     ctx.send({
        //         message: error
        //     })
        // }

    },

    updateBlog: async (ctx) => {
        const { media,
                metaData }         = ctx.request.body

        const { gemId }            = ctx.params

        // try {
            let obj = {}
            if (media) {
                obj["media"]    = media
            }
            if (metaData) {
                obj["metaData"] = metaData
            }
            if (obj.media || obj.metaData) {
                const blog = await strapi.entityService.update("api::gem.gem", gemId, {
                    data: obj,
                    populate: {
                        tags: {
                            fields: ["id", "tag", "slug"]
                        },
                        collection_gems: {
                            fields: [ "id", "name", "slug" ]
                        }
                    }
                });
                return ctx.send(blog)
            }
            return ctx.send("No data provided to update")
        // }
        // catch (err) {
        //     return ctx.send({
        //         message: err
        //     })
        // }  
    },

    makeBlogPublished: async (ctx) => {
        const { blogId } = ctx.params
        try {
            const existingBlog = await strapi.entityService.findOne("api::gem.gem", blogId);
            if (!existingBlog) {
                return ctx.send({
                    status: 404,
                    message: "Blog not found"
                })
            }
            const mediaObj = {
                ...existingBlog.media,
                publishedContent: existingBlog.media.blogContent,
                status: "Published",
                publishedAt: existingBlog?.media?.publishedAt || new Date().toISOString()
            }
            const blog = await strapi.entityService.update("api::gem.gem", blogId, {
                data: {
                    media: mediaObj
                }
            });
            return ctx.send(blog)
        } catch (error) {
            return ctx.send({
                message: error
            })
        }
    }
      
}));
