'use strict';

/**
 * referral service
 */

const { createCoreService } = require('@strapi/strapi').factories;
const { getService } = require('../../../extensions/users-permissions/utils');
const { REFERRAL } = require('../../../../emails/referral');

module.exports = createCoreService('api::referral.referral', ({ strapi }) => ({ 

    async sendInviteReferralEmail(user, receiver) {
        const userPermissionService = getService('users-permissions');
        const message               = await userPermissionService.template(REFERRAL, {
            USER: { name: user.firstname && user.lastname ? `${user.firstname} ${user.lastname}` : user.username },
            URL: `${process.env.REDIRECT_URI}/sign-up?c=${user.username}&p=email`
        });
        const subject               = await userPermissionService.template("Guess What? You Just Got Team-ed Up!", {
            USER: user,
        });
        await strapi
        .plugin('email')
        .service('email')
        .send({
            to: receiver,
            from: `CurateIt <${process.env.AWS_EMAIL_FROM}>`,
            replyTo: process.env.AWS_EMAIL_REPLY_TO,
            subject,
            text: message,
            html: message,
        });
    },

}));
