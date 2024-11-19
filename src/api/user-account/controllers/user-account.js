'use strict';

const { UNINSTALLED_EMAIL } = require('../../../../emails/uninstalled');
/**
 * user-account controller
 */
const { getService } = require('../../../extensions/users-permissions/utils');
const { updateReferral } = require('../../../extensions/users-permissions/utils/referral');
const { deleteCollections, deleteGems, deleteTags, deleteSharedCollections, deleteSharedTags } = require('../services/user-service');
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::user-account.user-account', {

    userDetailsViaEmail: async (ctx) => {
        try {
            const email = ctx.request.query.email;
            const twitterId = ctx.request.query.twitterId;
            let jwt = ctx.header.authorization === undefined ? null : ctx.header.authorization.replace('Bearer ', '')

            let user;
            if (!email && !twitterId) {
                throw "Please enter email or twitter id";
            } else if (email) {
                user = await strapi.db.query('plugin::users-permissions.user').findOne({
                    where: { email: email },
                });
            } else if (twitterId) {
                user = await strapi.db.query('plugin::users-permissions.user').findOne({
                    where: { twitterUserId: twitterId },
                });
            }

            if (!jwt) {
                jwt = getService('jwt').issue({
                    id: user.id,
                });
            }
            ctx.send({ jwt, user });
        } catch (error) {
            ctx.send({ status: 400, message: error });
        }
    },

    setUsertwitterId: async (ctx) => {
        try {
            const userId = ctx.state.user.id;
            const twitterId = ctx.request.body.twitterId;

            let user;
            if (!userId) {
                throw "Please signin with account";
            }

            user = await strapi.db.query('plugin::users-permissions.user').update({
                where: { id: userId },
                data: {
                    twitterUserId: twitterId
                }
            });

            ctx.send({ user });
        } catch (error) {
            ctx.send({ status: 400, message: error });
        }
    },

    getUserViaUsername: async (ctx) => {
        try {
            const { user } = ctx.state;
            const { username } = ctx.request.query;

            const userData = await strapi.entityService.findMany('plugin::users-permissions.user', {
                filters: { username },
                populate: {
                    collections: {
                        fields: ["id", "name"]
                    },
                    gems: {
                        fields: ["id", "url", "title"]
                    },
                    gamification_score: {
                        fields: ["id", "level", "totalScore"]
                    }
                }
            })

            const collectionCount = userData[0].collections.length;
            const gemCount = userData[0].gems.length;
            delete userData[0].collections
            delete userData[0].gems

            const follower = await strapi.db.query("api::follower.follower").findOne({
                where: { userId: userData[0].id.toString() },
                populate: {
                    follower_users: {
                        select: ['id']
                    }
                }
            })

            const followingUsers = follower?.following_users ? follower?.following_users.map((followerData) => followerData.id) : [];;

            const followerUsers = follower?.follower_users ? follower?.follower_users.map((followerData) => followerData.id) : [];
            const userDetails = {
                id: userData[0]?.id,
                userName: userData[0]?.username,
                firstName: userData[0]?.firstname,
                lastName: userData[0]?.lastname,
                about: userData[0]?.about,
                country: userData[0]?.country,
                socialLinks: userData[0]?.socialLinks,
                profilePhoto: userData[0]?.profilePhoto,
                coverPhoto: userData[0]?.coverPhoto,
                level: userData[0]?.gamification_score?.level || "Rookie",
                totalScore: userData[0]?.gamification_score?.totalScore || 0,
                bio_collection: userData[0]?.bio_collection,
                bio_contact_collection: userData[0]?.bio_contact_collection,
                preferences: userData[0]?.preferences,
                seo: user?.seo
            }

            ctx.send({
                status: 200,
                collectionCount,
                gemCount,
                followingUsers,
                followerUsers,
                userDetails
            })


        } catch (error) {
            ctx.send({ status: 400, message: error.message })
        }
    },

    getUserSeoViaUsername: async (ctx) => {
        try {
            const { username } = ctx.request.query;

            const user = await strapi.db.query('plugin::users-permissions.user').findOne({
                where: { username },
                select: ["id", "username", "email", "seo", "profilePhoto", "createdAt", "updatedAt"]
            });

            ctx.send(user)
        } catch (error) {
            ctx.send({ status: 400, message: error })
        }
    },

    dataMigration: async (ctx) => {
        await strapi.db.query('plugin::users-permissions.user').updateMany({
            where: {},
            data: {
                is_test_account: false
            }
        })
        ctx.send({ status: 200, message: "Migration done" })
    },

    getUsers: async (ctx) => {
        try {
            const { user } = ctx.state;
            if (!user) return "Please add a JWT token"

            const userData = await strapi.entityService.findMany('plugin::users-permissions.user', {
                filters: { isPublic: true },
                fields: ["id", "username", "firstname", "lastname", "profilePhoto", "email"]
            })

            ctx.send({
                status: 200,
                data: userData
            })

        } catch (error) {
            ctx.send({ status: 400, message: error })
        }
    },

    deleteUserData: async (ctx) => {
        try {
            const { id, unfiltered_collection, bio_collection, bio_contact_collection } = ctx.state.user;

            const user = await strapi.entityService.findOne('plugin::users-permissions.user', id, {
                // filters: { collections: { id: { $notIn: [unfiltered_collection] } } },
                populate: {
                    collections: { filters: { id: { $notIn: [unfiltered_collection, bio_collection, bio_contact_collection] } }, fields: ["id"] },
                    gems: { fields: ["id"] },
                    tags: { fields: ["id"] }
                }
            })

            const collectionIds = user?.collections?.map((c) => c.id)
            const gemIds = user?.gems?.map((g) => g.id)
            const tagIds = user?.tags?.map((t) => t.id)

            const collections = await deleteCollections(id, collectionIds)
            const gems = await deleteGems(gemIds)
            const tags = await deleteTags(id, tagIds)

            const sharedCollections = await deleteSharedCollections(user?.email, user?.id)
            const sharedTags = await deleteSharedTags(user?.email, user?.id)
            // const followedCollections = await deleteFollowedCollections(user?.id)

            if (collections !== "success" || gems !== "success" || tags !== "success" || sharedCollections !== "success" || sharedTags !== "success") {
                return ctx.send({ status: 400, message: "something went wrong" })
            }
            ctx.send({ status: 200, message: "Data deleted succesfully" })

        } catch (error) {
            ctx.send({ status: 400, message: error.message })
        }
    },

    userUninstalled: async (ctx) => {
        const { email }   = ctx.request.body
        const userService = getService('users-permissions');
        const link        = "https://chromewebstore.google.com/detail/curateit-ai-bookmark-mana/hhofkocnlefejficdipgkefgfmnenpbk?hl=en&authuser=0"
        const message     = await userService.template(UNINSTALLED_EMAIL, {
            URL: link
        });
        const subject     = await userService.template("Did You Mean to Uninstall CurateIt? - Accidental Goodbye?", {});
        await strapi
        .plugin('email')
        .service('email')
        .send({
            to: email,
            from: `CurateIt <${process.env.AWS_EMAIL_FROM}>`,
            replyTo: process.env.AWS_EMAIL_REPLY_TO,
            subject,
            text: message,
            html: message,
        });
        return ctx.send({ status: 200, message: "Email sent successfully" })
    },

    usernameExist: async (ctx) => {
        try {
            const { username } = ctx.request.query;

            const user = await strapi.db.query("plugin::users-permissions.user").findOne({
                where: { username }
            })

            if (user) return ctx.send({ status: 400, error: "Username already exist" })

            return ctx.send({ status: 200, error: "Username is not exist" })
        } catch (error) {
            return ctx.send({ status: 400, error: error.message})
        }
    },

    blockSites: async (ctx) => {
        try {
            const { user } = ctx.state;
            const { sites } = ctx.request.body;

            const userData = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
                fields: ["id", "username", "preferences"]
            })

            const { preferences } = userData;
            preferences.blocked_sites = preferences?.blocked_sites ? [...preferences?.blocked_sites, sites] : [sites];

            await strapi.entityService.update('plugin::users-permissions.user', user.id, {
                data: {
                    preferences
                }
            })

            return ctx.send({ status: 200, data: preferences })
        } catch (error) {
            return ctx.send({ status: 400, error: error.message})
        }
    },

    deleteBlockSites: async (ctx) => {
        try {
            const { user } = ctx.state;
            const { siteId } = ctx.request.body;

            const userData = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
                fields: ["id", "username", "preferences"]
            })

            const { preferences } = userData;

            const idx = preferences.blocked_sites.findIndex((s) => parseInt(s?.id) === parseInt(siteId));
            if (idx === -1) return ctx.send({ status: 400, error: "Site not found" })

            preferences.blocked_sites.splice(idx, 1);
            await strapi.entityService.update('plugin::users-permissions.user', user.id, {
                data: {
                    preferences
                }
            })

            return ctx.send({ status: 200, data: preferences })
        } catch (error) {
            return ctx.send({ status: 400, error: error.message})
        }
    },

    getAllUsers: async (ctx) => {
        try {
            const { user } = ctx.state;
            if (!user) return "Please add a JWT token"

            const userData = await strapi.entityService.findMany('plugin::users-permissions.user', {
                fields: ["id", "username", "email"]
            })

            ctx.send({
                status: 200,
                data: userData
            })

        } catch (error) {
            ctx.send({ status: 400, message: error })
        }
    },

    setUserSyncStatus: async (ctx) => {
        try {
            const { user } = ctx.state;

            const userData = await strapi.entityService.update('plugin::users-permissions.user', user.id, {
                data: {
                    is_bookmark_sync: true
                }
            })

            return ctx.send({
                status: 200,
                data: userData
            })

        } catch (error) {
            return ctx.send({ status: 400, message: error })
        }
    },

    socialLoginReferral: async (ctx) => {
        try {
            const { user } = ctx.state;
            const { code, platform, id, trigger, slug } = ctx.request.body;

            if (!user || !code) return "Invalid data"

            const socialRefer = updateReferral(user, code, platform, id, trigger, slug)

            return ctx.send({ status: 200, message: "Success" })

        } catch (error) {
            return ctx.send({ status: 400, message: error })
        }
    }
});
