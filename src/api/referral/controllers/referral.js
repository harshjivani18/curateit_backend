'use strict';

/**
 * referral controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::referral.referral', ({ strapi }) => ({

    async inviteUsers(ctx) {
        try {
            const { id, username } = ctx.state.user;
            const { emails, platform } = ctx.request.body;
            // const emails = email.split(",")
            // const cleanedEmails = emails.map(mail => mail.trim());

            for (const e of emails) {
                const user = await strapi.db.query("plugin::users-permissions.user").findOne({
                    where: { email: e }
                })

                if (!user) {
                    let refUser = []
                    const referral = await strapi.db.query("api::referral.referral").findOne({
                        where: {
                            ref_code: username
                        }
                    })
                    if (platform === "email") {
                        const existIdx = referral?.ref_users_via_email?.findIndex((r) => r?.email === e)
 
                            if (existIdx === -1) {
                                const obj = {
                                    id: null,
                                    email: e,
                                    status: "pending",
                                    username: null,
                                    name: null,
                                    platform: "email"
                                }
                                strapi.service('api::referral.referral').sendInviteReferralEmail(ctx?.state?.user, e);
                                refUser.push(obj)
                            }
                    }
                    const test= await strapi.entityService.update("api::referral.referral", referral?.id, {
                        data: {
                            ref_users_via_email: (referral?.ref_users_via_email && referral?.ref_users_via_email.length > 0) ? [...referral.ref_users_via_email, ...refUser] : refUser,
                        }
                    })

                    // return ctx.send({ status: 200, data: referral })
                }
            }
            return ctx.send({ status: 200, message: "User Invited succesfully" })
        } catch (error) {
            return ctx.send({ status: 400, error: error.message })
        }
    },

    async getReferral(ctx) {
        try {
            const { username } = ctx.state.user
            const referral = await strapi.db.query("api::referral.referral").findOne({
                where: { ref_code: username }
            })
            // const referralUSers = [referral?.ref_users_via_link && ...referral?.ref_users_via_link, ...referral?.ref_users_via_email, ...referral?.ref_users_via_ig, ...referral?.ref_users_via_li, ...referral?.ref_users_via_fb, ...referral?.ref_users_via_tw, ...referral?.ref_users_via_wp]
            const keys = Object.keys(referral);
            const arrays = keys
                .map(key => referral[key])
                .filter(value => value !== null && Array.isArray(value))
                .flat();

            return ctx.send({ status: 200, data: arrays })
        } catch (error) {
            return ctx.send({ status: 400, error: error.message })
        }
    }
}));
