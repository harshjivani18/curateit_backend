'use strict';

const { INVITE_WORKSPACE } = require('../../../../emails/invite-workspace');
const { getService } = require('../../../extensions/users-permissions/utils');

/**
 * team service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::team.team', ({ strapi }) => ({ 
    async sendInviteWorkspaceEmail(user, receiver) {
        const userPermissionService = getService('users-permissions');
        const message               = await userPermissionService.template(INVITE_WORKSPACE, {
            USER: { name: user.firstname && user.lastname ? `${user.firstname} ${user.lastname}` : user.username },
            URL: `${process.env.REDIRECT_URI}/sign-in`
        });
        const subject               = await userPermissionService.template("Guess What? You Just Got Team-ed Up!", {
            USER: user,
        });
        strapi
        .plugin('email')
        .service('email')
        .send({
            to: receiver.email,
            from: `CurateIt <${process.env.AWS_EMAIL_FROM}>`,
            replyTo: process.env.AWS_EMAIL_REPLY_TO,
            subject,
            text: message,
            html: message,
        });
    },
    async updateTeamCollectionOrTags(data, isExist) {
        const existObj = {}
        if (data.collections && isExist.collections.indexOf(data.collections) === -1) {
            existObj['collections'] = isExist.collections ? [ ...isExist.collections, data.collections ] : [ data.collections ]
        }
        if (data.tags && isExist.tags.indexOf(data.tags) === -1) {
            existObj['tags']        = isExist.tags ? [ ...isExist.tags, data.tags ] : [ data.tags ]
        }
        if (Object.keys(existObj).length !== 0) {
            strapi.db.query("api::team.team").update({
                where: { id: isExist.id },
                data: existObj
            })
        }
    },
    async updateCurrentSharedCollectionsOrTags (data, objId, type) {
        const teamObj = await strapi.db.query("api::team.team").findOne({
            where: {
                email: data.email,
                author: data.author
            },
            populate: {
                collections: {
                    select: ["id"]
                },
                tags: {
                    select: ["id"]
                }
            }
        })
        const existObj = {}
        if (type === "collections" && teamObj.collections.indexOf(objId) === -1) {
            existObj['collections'] = teamObj.collections ? [ ...teamObj.collections, objId ] : [ objId ]
        }
        if (type === "tags" && teamObj.tags.indexOf(objId) === -1) {
            existObj['tags'] = teamObj.tags ? [ ...teamObj.tags, objId ] : [ objId ]
        }
        if (Object.keys(existObj).length !== 0) {
            strapi.db.query("api::team.team").update({
                where: { id: teamObj.id },
                data: existObj
            })
        }
    }
}));
