'use strict';

const { removeAllCollections } = require('../services/group-service');

/**
 * group controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::group.group', ({ strapi }) => ({

    async findIsMemberExist(ctx) {
        const { email } = ctx.request.query;

        const member = await strapi.db.query("plugin::users-permissions.user").findOne({
            where: { email },
            select: ["id", "username", "firstname", "lastname", "email", "profilePhoto"]
        })

        if (!member || (!member?.firstname || !member?.lastname)) {
            return ctx.send(null)
        }

        return ctx.send({
            id: member.id,
            name: `${member.firstname} ${member.lastname}`,
            email: member.email,
            username: member.username,
            avatar: member.profilePhoto,
            role: "user"
        });
    },

    //     async removeFromGroup(ctx) {
    //         try {
    //             const { id, username, email } = ctx.state.user;

    //             const groups = await strapi.entityService.findMany("api::group.group", {
    //                 filters: {
    //                     members: { $notNull: true, $containsi: email }
    //                 }
    //             })
    // let test
    //             for (const group of groups) {
    //                 const members = group.members;
    //                 const mIdx = members.findIndex((m) => m?.email === email)
    //                 console.log("midx===>", mIdx, group.name);
    //                 // if (mIdx !== -1) {
    //                 //     members.splice(mIdx, 1)
    //                 // }
    //                 test = await removeAllCollections(email, group.name)
    //             }

    //             return ctx.send({ status: 200, data: test })

    //         } catch (error) {
    //             return ctx.send({ status: 400, error: error.message })
    //         }
    //     }

    async removeFromGroup(ctx) {
        try {
            const { email } = ctx.state.user;
            const { groupId } = ctx.params;

            const group = await strapi.entityService.findOne("api::group.group", groupId)

            const members = group.members;
            const mIdx = members.findIndex((m) => m?.email === email)
            if (mIdx !== -1) {
                members.splice(mIdx, 1)
                await removeAllCollections(email, group.name, groupId)
                await strapi.entityService.update("api::group.group", groupId, {
                    data: {
                        members: members
                    }
                })
                return ctx.send({ status: 200, message: "Left this group" })
            }
            return ctx.send({ status: 200, message: "You are not part of this group" })

        } catch (error) {
            return ctx.send({ status: 400, error: error.message })
        }
    },

    async removeCollection(ctx) {
        try {
            const { id, email } = ctx.state.user;
            const { collectionId, groupId } = ctx.params;

            const collection = await strapi.entityService.findOne("api::collection.collection", collectionId, {
                fields: ["id", "name", "invitedUsersViaMail"]
            })

            if (!collection) {
                return ctx.send({ status: 400, message: "Collection not found" })
            }

            const invitedUsers = collection?.invitedUsersViaMail;
            const idx = invitedUsers.findIndex((m) => (parseInt(m.id) === parseInt(groupId) && m.isGroupShare === true))

            if (idx !== -1) {
                const members = invitedUsers[idx]?.members;
                const mIdx = members.findIndex((m) => m?.email === email)

                if (mIdx !== -1) {
                    members.splice(mIdx, 1)
                    invitedUsers[idx].members = members
                    await strapi.entityService.update("api::collection.collection", collectionId, {
                        data: {
                            invitedUsersViaMail: invitedUsers
                        }
                    })
                    return ctx.send({ status: 200, message: "Left this collection" })
                }
            }
        } catch (error) {
            return ctx.send({ status: 400, error: error.message })
        }
    }
}));
