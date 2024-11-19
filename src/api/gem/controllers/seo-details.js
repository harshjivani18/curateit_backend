'use strict';

const { setGemSeoInformation } = require('../../../../utils');

/**
 * gem controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::gem.gem', ({strapi}) => ({
    fetchSeoDetails: async (ctx) => {
        const { gemId } = ctx.params

        try {
            const seoDetail = await strapi.entityService.findOne("api::gem.gem", gemId, {
                fields: ["id", "title", "slug", "description", "seo", "media_type", "createdAt", "updatedAt"],
                populate:{
                    collection_gems: {
                        fields: ["id"]
                    },
                    tags: {
                        fields: ["id"]
                    },
                    author: {
                        fields: ["id", "username", "firstname", "lastname", "profilePhoto"]
                    }
                }
            });

            // if (!seoDetail?.seo && seoDetail?.collection_gems?.seo) {
            //     const seoRes = await setGemSeoInformation(seoDetail, seoDetail?.author?.username)
            //     if (seoRes !== 500) {
            //         seoDetail.seo = seoRes
            //     }
            // }

            // const idx = seoDetail?.tags?.findIndex((t) => { return t?.seo !== null })
            // if (!seoDetail?.seo && idx !== -1) {
            //     const seoRes = await setGemSeoInformation(seoDetail, seoDetail?.author?.username)
            //     if (seoRes !== 500) {
            //         seoDetail.seo = seoRes
            //     }
            // }

            // if (seoDetail?.collection_gems?.shareable_links && seoDetail?.collection_gems?.shareable_links !== "" && !seoDetail?.seo) {
            //     const seoRes = await setGemSeoInformation(seoDetail, seoDetail?.author?.username)
            //     if (seoRes !== 500) {
            //         seoDetail.seo = seoRes
            //     }
            // }
            // else if (!seoDetail?.collection_gems?.shareable_links && !seoDetail?.seo && seoDetail?.collection_gems?.is_sub_collection) {
            //     const parentCollection = await strapi.entityService.findOne("api::collection.collection", seoDetail?.collection_gems?.id, {
            //         populate: {
            //             collection: {
            //                 fields: ["id"]
            //             }
            //         }
            //     })
            //     const isRootPublic = await strapi.service('api::collection.checks').checkIsRootPublic(parentCollection?.collection?.id);
            //     if (isRootPublic) {
            //         const seoRes = await setGemSeoInformation(collection, collection?.author?.username)
            //         if (seoRes !== 500) {
            //             seoDetail.seo = seoRes
            //         }
            //     }
            // }

            return ctx.send(seoDetail)
        } catch (error) {
            return ctx.send({
                message: error
            })
        }

    },

    updateSeoDetails: async (ctx) => {
        const { gemId }         = ctx.params
        const { seo, slug,
                altInfo }       = ctx.request.body

        const obj = { seo }
        if (slug) {
            obj.slug = slug
        }
        if (altInfo) {
            obj.altInfo = altInfo
        }
        try {
            const seoDetail = await strapi.entityService.update("api::gem.gem", gemId, {
                data: obj
            });
            ctx.send(seoDetail)
        } catch (error) {
            ctx.send({
                message: error
            })
        }
    }
      
}));
