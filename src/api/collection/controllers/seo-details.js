'use strict';

const { setCollectionSeoInformation } = require('../../../../utils');

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::collection.collection', ({ strapi }) => ({

    async fetchSeoDetails(ctx) {
        try {
            const { collectionId } = ctx.params

            const collection   = await strapi.entityService.findOne("api::collection.collection", collectionId, {
                fields: ["id", "name", "slug", "seo", "createdAt", "updatedAt", "sharable_links", "is_sub_collection", "follower_users"],
                populate:{
                    collection: {
                        fields: ["id"]
                    },
                    author: {
                        fields: ["id", "username", "firstname", "lastname", "profilePhoto"]
                    }
                }
            })

            // if (collection?.sharable_links && collection?.sharable_links !== "" && !collection?.seo) {
            //     const seoRes = await setCollectionSeoInformation(collection, collection?.author?.username)
            //     if (seoRes !== 500) {
            //         collection.seo = seoRes
            //     }
            // }
            // else if (!collection?.sharable_links && !collection?.seo && collection?.collection && collection?.is_sub_collection) {
            //     const isRootPublic = await strapi.service('api::collection.checks').checkIsRootPublic(collection?.collection?.id);
            //     if (isRootPublic) {
            //         const seoRes = await setCollectionSeoInformation(collection, collection?.author?.username)
            //         if (seoRes !== 500) {
            //             collection.seo = seoRes
            //         }
            //     }
            // }

            ctx.send(collection)

        } catch (error) {
            ctx.send({ status: 400, message: error })
        }
    },

    async updateSeoDetails(ctx) {
        try {
            const { user }                      = ctx.state
            const { collectionId }              = ctx.params
            const { seo, slug, background,
                    wallpaper }                 = ctx.request.body

            const obj = { seo }
            if (slug) {
                obj.slug = slug
                obj.sharable_links  = `${process.env.REDIRECT_URI}/u/${user.username}/c/${collectionId}/${slug}`
            }
            if (background) {
                obj.background      = background
            }
            if (wallpaper) {
                obj.wallpaper       = wallpaper
            }
            const collection = await strapi.entityService.update("api::collection.collection", collectionId, {
                data: obj
            })

            ctx.send({ status: 200, data: collection })

        } catch (error) {
            ctx.send({ status: 400, message: error })
        }
    }
}))