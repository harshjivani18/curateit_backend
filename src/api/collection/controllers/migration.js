'use strict';

// const { populate } = require('dotenv');
const { default: slugify } = require('slugify');

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::collection.collection', ({ strapi }) => ({
    collectionShareLinkMigration: async (ctx) => {
        const collections = await strapi.entityService.findMany('api::collection.collection', {
            filters: {
                sharable_links: { $ne: "", $notNull: true }
            },
            populate: {
                author: {
                    fields: ["id", "username"]
                }
            }
        });
        for (const collection of collections) {
            if (collection.sharable_links && collection.sharable_links !== "") {
                const slug = collection?.slug || slugify(collection?.name || "", { lower: true, remove: /[&,+()$~%.'":*?<>{}/\/]/g })
                await strapi.entityService.update('api::collection.collection', collection.id, { 
                    data: {
                        sharable_links: `${process.env.REDIRECT_URI}/u/${collection?.author?.username}/c/${collection.id}/${slug}`
                    } 
                })
            }
        } 
        return ctx.send("Collections Migrated!")        
    },
    collectionMigration: async (ctx) => {
        const collections = await strapi.entityService.findMany('api::collection.collection', {
            populate: {
                author: {
                    fields: ["id", "username"]
                }
            }
        });
        // try {
        for (const collection of collections) {
            const slug = slugify(collection?.name || "", { lower: true, remove: /[&,+()$~%.'":*?<>{}/\/]/g })
            const author = collection?.author
            const updateObj = {
                slug
            }
            if (collection.sharable_links && collection.sharable_links !== "") {
                updateObj.sharable_links = `${process.env.REDIRECT_URI}/u/${author?.username}/c/${collection.id}/${slug}?public=true`
            }
            await strapi.entityService.update('api::collection.collection', collection.id, { data: updateObj })
        }
        return ctx.send("Collections Migrated!")
        // } catch (error) {
        //     return ctx.send({
        //         message: error
        //     })
        // }

    },

    followCurateitCollection: async (ctx) => {
        try {
            // const defaultCollection     = await strapi.entityService.findMany("api::config-limit.config-limit");
            const defaultCollection = await strapi.db.query("api::config-limit.config-limit").findOne({
                where: { curateitDefaultId: { $notNull: true } }
            })
            if (!defaultCollection?.curateitDefaultId) {
                return { status: 400, message: "Please Add Default Collection Id" }
            }

            await strapi.db.query("api::collection.collection").deleteMany({
                where: { id: { $ne: defaultCollection?.curateitDefaultId }, name: "Curateit" }
            })

            const users = await strapi.entityService.findMany("plugin::users-permissions.user", {
                filters: { username: { $ne: defaultCollection[0]?.username } },
                fields: ["id", "username", "email"]
            })

            let arr = []
            users.forEach((u) => {
                const obj = {
                    id: u?.id,
                    username: u?.username,
                    email: u?.email
                }
                arr.push(obj)
            })

            const followerData = await strapi.entityService.findOne("api::collection.collection", defaultCollection?.curateitDefaultId, {
                fields: ["id", "name", "follower_users"]
            })

            let followerUserArr = followerData?.follower_users ? [...followerData?.follower_users, ...arr] : arr

            await strapi.entityService.update("api::collection.collection", defaultCollection?.curateitDefaultId, {
                data: {
                    follower_users: followerUserArr
                }
            })

            return { status: 200, message: "Default Collection Followed successfully" }
        } catch (error) {
            ctx.send({ status: 400, error: error.message })
        }
    },

    orderOfGems: async (ctx) => {
        try {
            const collections = await strapi.entityService.findMany("api::collection.collection", {
                populate: {
                    gems: {
                        fields: ["id"]
                    }
                }
            })

            collections.forEach((c) => {
                const orderArr = [];
                c?.gems?.forEach((g) => {
                    orderArr.push(g.id)
                })
                strapi.entityService.update("api::collection.collection", c.id, {
                    data: {
                        order_of_gems: orderArr
                    }
                })
            })

            return ctx.send("Order of Gems Updated!")
        } catch (error) {
            return ctx.send({ status: 400, error: error.message })
        }
    },

    deleteCurateitDelete: async (ctx) => {
        try {
            const defaultCollection = await strapi.db.query("api::config-limit.config-limit").findOne({
                where: { curateitDefaultId: { $notNull: true } }
            })
            if (!defaultCollection?.curateitDefaultId) {
                return { status: 400, message: "Please Add Default Collection Id" }
            }
            const curateit = await strapi.db.query("api::collection.collection").deleteMany({
                where: { id: { $ne: defaultCollection?.curateitDefaultId }, name: "Curateit" }
            })
console.log("curateit", curateit);
            return "success"
        } catch (error) {
            return ctx.send({ status: 400, error: error.message })
        }
    },

    deleteCurateitDelete: async (ctx) => {
        try {
            const defaultCollection = await strapi.db.query("api::config-limit.config-limit").findOne({
                where: { curateitDefaultId: { $notNull: true } }
            })
            if (!defaultCollection?.curateitDefaultId) {
                return { status: 400, message: "Please Add Default Collection Id" }
            }
            const curateit = await strapi.db.query("api::collection.collection").deleteMany({
                where: { id: { $ne: defaultCollection?.curateitDefaultId }, name: "Curateit" }
            })
console.log("curateit", curateit);
            return "success"
        } catch (error) {
            return ctx.send({ status: 400, error: error.message })
        }
    }
}))