'use strict';

const { setTagSeoInformation } = require('../../../../utils');

/**
 * gem controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::tag.tag', ({strapi}) => ({
    fetchSeoDetails: async (ctx) => {
        const { tagId } = ctx.params

        try {
            const seoDetail = await strapi.entityService.findOne('api::tag.tag', tagId, {
                fields: ["id", "tag", "slug", "avatar", "seo", "createdAt", "updatedAt", "is_sub_tag", "sharable_links"],
                populate: {
                    parent_tag: {
                        fields: ["id"],
                    },
                    users: {
                        fields: ["id", "username", "firstname", "lastname", "profilePhoto"]
                    }
                }
            });

            // if (seoDetail?.sharable_links && seoDetail?.sharable_links !== "" && !seoDetail?.seo) {
            //     const seoRes = await setTagSeoInformation(seoDetail, seoDetail?.users?.[0]?.username)
            //     if (seoRes !== 500) {
            //         seoDetail.seo = seoRes
            //     }
            // }
            // else if (!seoDetail?.sharable_links && !seoDetail?.seo && seoDetail?.parent_tag && seoDetail?.is_sub_tag) {
            //     const isRootPublic = await strapi.service('api::tag.checks').checkIsRootPublic(seoDetail?.parent_tag?.id);
            //     if (isRootPublic) {
            //         const seoRes = await setTagSeoInformation(seoDetail, seoDetail?.users?.[0]?.username)
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
        const { user }          = ctx.state     
        const { tagId }         = ctx.params
        const { seo, slug,
                background,
                wallpaper }     = ctx.request.body

        const obj = { seo }
        if (slug) {
            obj.slug            = slug
            obj.sharable_links  = `${process.env.REDIRECT_URI}/u/${user.username}/tags/${tagId}/${slug}`
        }
        if (background) {
            obj.background      = background
        }
        if (wallpaper) {
            obj.wallpaper       = wallpaper
        }
        try {
            const seoDetail = await strapi.entityService.update('api::tag.tag', tagId, {
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
