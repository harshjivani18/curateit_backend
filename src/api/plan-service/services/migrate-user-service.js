'use strict';

const { populate } = require('dotenv');

/**
 * gem service
 */

const { createCoreService }             = require('@strapi/strapi').factories;

module.exports = createCoreService('api::plan-service.plan-service', ({strapi}) => ({
    updatePlanServiceAccordingToUser: async (plan, user, subscription) => {
        let members = [user.id]
        if (plan.is_team_plan) {
            const teamMembers = await strapi.db.query('api::team.team').findMany({
                where: { author: user.id, isMember: true },
                populate: {
                    username: {
                        fields: ["id", "username"]
                    }
                }
            });
            const finalIds = []
            teamMembers.forEach(tm => {
                if (tm.username && tm.username.id) {
                    finalIds.push(tm.username.id)
                }
            })
            members = [ ...members, ...finalIds ]
        }
        const planServices = await strapi.db.query('api::plan-service.plan-service').findMany({
            where: { 
                author: { id: { $in: members } }
            },
            select: ["id"]
        });
        const configLimit = await strapi.db.query('api::config-limit.config-limit').findOne({
            where: { 
                related_plans: plan.id
            }
        })
        const plansServiceObj = {
            gem_limit: configLimit?.gem_limit ? parseInt(configLimit.gem_limit) : 100,
            coll_limit: configLimit?.coll_limit ? parseInt(configLimit.coll_limit) : 5,
            tag_limit: configLimit?.tag_limit ? parseInt(configLimit.tag_limit) : 5,
            speech_limit: configLimit?.speech_limit ? parseInt(configLimit.speech_limit) : 5,
            ocr_pdf_limit: configLimit?.ocr_pdf_limit ? parseInt(configLimit.ocr_pdf_limit) : 5,
            ocr_image_limit: configLimit?.ocr_image_limit ? parseInt(configLimit.ocr_image_limit) : 5,
            related_plan: plan.id,
            plan: "paid",
            file_upload: configLimit?.file_upload ? parseInt(configLimit.file_upload) : 5000,
            guest_users: configLimit?.guest_users ? parseInt(configLimit.guest_users) : 5,
            included_members: configLimit?.included_members ? parseInt(configLimit.included_members) : 1,
            public_collection_and_tags: configLimit?.public_collection_and_tags ? parseInt(configLimit.public_collection_and_tags) : 5,
            workspaces: configLimit?.workspaces ? parseInt(configLimit.workspaces) : 1,
            storage: configLimit?.storage ? parseInt(configLimit.storage) : 1000000,
            audio_recording: configLimit?.audio_recording ? parseInt(configLimit.audio_recording) : 180,
            file_upload_size_limit: configLimit?.file_upload_size_limit ? parseInt(configLimit.file_upload_size_limit) : 500000,
            bio_links: configLimit?.bio_links ? parseInt(configLimit.bio_links) : 1,
            subscription: subscription.id
        }
        // update plan service
        if (planServices?.length > 0) {
            for (const service of planServices) {
                await strapi.db.query('api::plan-service.plan-service').update({
                    where: { id: service.id },
                    data: plansServiceObj
                });
            }
        } else {
            // create plan service
            for (const member of members) {
                await strapi.entityService.create('api::plan-service.plan-service', {
                    data: {
                        author: member,
                        ...plansServiceObj
                    }
                })
            }
        }
    },
    cancelOrPaymentFailed: async (user, currentPlan, subscription) => {
        let members = [user.id]
        if (currentPlan.is_team_plan) {
            const teamMembers = await strapi.db.query('api::team.team').findMany({
                where: { author: user.id, isMember: true },
                populate: {
                    username: {
                        fields: ["id", "username"]
                    }
                }
            });
            const finalIds = []
            teamMembers.forEach(tm => {
                if (tm.username && tm.username.id) {
                    finalIds.push(tm.username.id)
                }
            })
            members = [ ...members, ...finalIds ]
        }
        const newPlan     = await strapi.db.query('api::plan.plan').findOne({
            where: {
                plan_id: "free"
            }
        })
        const configLimit = await strapi.db.query('api::config-limit.config-limit').findOne({
            where: { 
                is_free: true
            }
        })
        const planServices = await strapi.db.query('api::plan-service.plan-service').findMany({
            where: { author: { id: { $in: members } } },
            select: ["id"]
        })
        const plansServiceObj = {
            gem_limit: configLimit?.gem_limit ? parseInt(configLimit.gem_limit) : 100,
            coll_limit: configLimit?.coll_limit ? parseInt(configLimit.coll_limit) : 5,
            tag_limit: configLimit?.tag_limit ? parseInt(configLimit.tag_limit) : 5,
            speech_limit: configLimit?.speech_limit ? parseInt(configLimit.speech_limit) : 5,
            ocr_pdf_limit: configLimit?.ocr_pdf_limit ? parseInt(configLimit.ocr_pdf_limit) : 5,
            ocr_image_limit: configLimit?.ocr_image_limit ? parseInt(configLimit.ocr_image_limit) : 5,
            related_plan: newPlan.id,
            plan: "free",
            file_upload: configLimit?.file_upload ? parseInt(configLimit.file_upload) : 5000,
            guest_users: configLimit?.guest_users ? parseInt(configLimit.guest_users) : 5,
            included_members: configLimit?.included_members ? parseInt(configLimit.included_members) : 1,
            public_collection_and_tags: configLimit?.public_collection_and_tags ? parseInt(configLimit.public_collection_and_tags) : 5,
            workspaces: configLimit?.workspaces ? parseInt(configLimit.workspaces) : 1,
            storage: configLimit?.storage ? parseInt(configLimit.storage) : 1000000,
            audio_recording: configLimit?.audio_recording ? parseInt(configLimit.audio_recording) : 180,
            file_upload_size_limit: configLimit?.file_upload_size_limit ? parseInt(configLimit.file_upload_size_limit) : 500000,
            bio_links: configLimit?.bio_links ? parseInt(configLimit.bio_links) : 1,
            subscription: subscription
        }
        // update plan service
        if (planServices?.length > 0) {
            for (const service of planServices) {
                await strapi.db.query('api::plan-service.plan-service').update({
                    where: { id: service.id },
                    data: plansServiceObj
                });
            }
        } else {
            // create plan service
            for (const member of members) {
                await strapi.entityService.create('api::plan-service.plan-service', {
                    data: {
                        author: member,
                        ...plansServiceObj
                    }
                })
            }
        }
    },
    upgradeToNewPlan: async (user, currentPlan, newPlan, subscription) => {
        const configLimit       = await strapi.db.query('api::config-limit.config-limit').findOne({
            where: { 
                related_plans: newPlan.id
            }
        })
        const plansServiceObj   = {
            gem_limit: configLimit?.gem_limit ? parseInt(configLimit.gem_limit) : 100,
            coll_limit: configLimit?.coll_limit ? parseInt(configLimit.coll_limit) : 5,
            tag_limit: configLimit?.tag_limit ? parseInt(configLimit.tag_limit) : 5,
            speech_limit: configLimit?.speech_limit ? parseInt(configLimit.speech_limit) : 5,
            ocr_pdf_limit: configLimit?.ocr_pdf_limit ? parseInt(configLimit.ocr_pdf_limit) : 5,
            ocr_image_limit: configLimit?.ocr_image_limit ? parseInt(configLimit.ocr_image_limit) : 5,
            related_plan: newPlan.id,
            plan: "paid",
            file_upload: configLimit?.file_upload ? parseInt(configLimit.file_upload) : 5000,
            guest_users: configLimit?.guest_users ? parseInt(configLimit.guest_users) : 5,
            included_members: configLimit?.included_members ? parseInt(configLimit.included_members) : 1,
            public_collection_and_tags: configLimit?.public_collection_and_tags ? parseInt(configLimit.public_collection_and_tags) : 5,
            workspaces: configLimit?.workspaces ? parseInt(configLimit.workspaces) : 1,
            storage: configLimit?.storage ? parseInt(configLimit.storage) : 1000000,
            audio_recording: configLimit?.audio_recording ? parseInt(configLimit.audio_recording) : 180,
            file_upload_size_limit: configLimit?.file_upload_size_limit ? parseInt(configLimit.file_upload_size_limit) : 500000,
            bio_links: configLimit?.bio_links ? parseInt(configLimit.bio_links) : 1,
            subscription: subscription?.id
        }
        if (currentPlan?.is_team_plan && !newPlan.is_team_plan) { 
            await strapi.db.query('api::plan-service.plan-service').update({
                where: { author: user.id },
                data: plansServiceObj
            });
            const newTeamMembers = await strapi.db.query('api::team.team').findMany({
                where: { author: user.id, isMember: true },
                populate: {
                    username: {
                        fields: ["id", "username"]
                    }
                }
            });
            const newMemberIds      = []
            newTeamMembers.forEach(tm => {
                if (tm.username && tm.username.id) {
                    newMemberIds.push(tm.username.id)
                }
            })

            const memberConfig = await strapi.db.query('api::config-limit.config-limit').findOne({
                where: { 
                    is_free: true
                }
            })

            const memberPlan     = await strapi.db.query('api::plan.plan').findOne({
                where: {
                    plan_id: "free"
                }
            })

            const memberPlanService = {
                gem_limit: memberConfig?.gem_limit ? parseInt(memberConfig.gem_limit) : 100,
                coll_limit: memberConfig?.coll_limit ? parseInt(memberConfig.coll_limit) : 5,
                tag_limit: memberConfig?.tag_limit ? parseInt(memberConfig.tag_limit) : 5,
                speech_limit: memberConfig?.speech_limit ? parseInt(memberConfig.speech_limit) : 5,
                ocr_pdf_limit: memberConfig?.ocr_pdf_limit ? parseInt(memberConfig.ocr_pdf_limit) : 5,
                ocr_image_limit: memberConfig?.ocr_image_limit ? parseInt(memberConfig.ocr_image_limit) : 5,
                related_plan: memberPlan.id,
                plan: "free",
                file_upload: memberConfig?.file_upload ? parseInt(memberConfig.file_upload) : 5000,
                guest_users: memberConfig?.guest_users ? parseInt(memberConfig.guest_users) : 5,
                included_members: memberConfig?.included_members ? parseInt(memberConfig.included_members) : 1,
                public_collection_and_tags: memberConfig?.public_collection_and_tags ? parseInt(memberConfig.public_collection_and_tags) : 5,
                workspaces: memberConfig?.workspaces ? parseInt(memberConfig.workspaces) : 1,
                storage: memberConfig?.storage ? parseInt(memberConfig.storage) : 1000000,
                audio_recording: memberConfig?.audio_recording ? parseInt(memberConfig.audio_recording) : 180,
                file_upload_size_limit: memberConfig?.file_upload_size_limit ? parseInt(memberConfig.file_upload_size_limit) : 500000,
                bio_links: memberConfig?.bio_links ? parseInt(memberConfig.bio_links) : 1,
                subscription: null
            }

            const memberServices = await strapi.db.query('api::plan-service.plan-service').findMany({
                where: { author: { id: { $in: newTeamMembers } } }
            })

            if (memberServices.length > 0) {
                for (const service of memberServices) {
                    await strapi.db.query('api::plan-service.plan-service').update({
                        where: { id: service.id },
                        data: memberPlanService
                    });
                }
            }
            else {
                // create plan service
                for (const member of newTeamMembers) {
                    await strapi.entityService.create('api::plan-service.plan-service', {
                        data: {
                            author: member,
                            ...memberPlanService
                        }
                    })
                }
            }

            return
        }

        let members             = [user.id]
        if (newPlan.is_team_plan) {
            const teamMembers = await strapi.db.query('api::team.team').findMany({
                where: { author: user.id, isMember: true },
                populate: {
                    username: {
                        fields: ["id", "username"]
                    }
                }
            });
            const finalIds = []
            teamMembers.forEach(tm => {
                if (tm.username && tm.username.id) {
                    finalIds.push(tm.username.id)
                }
            })
            members = [ ...members, ...finalIds ]
        }
        
        
        const planServices = await strapi.db.query('api::plan-service.plan-service').findMany({
            where: { author: { id: { $in: members } } }
        })
        
        if (planServices.length > 0) {
            for (const service of planServices) {
                await strapi.db.query('api::plan-service.plan-service').update({
                    where: { id: service.id },
                    data: plansServiceObj
                });
            }
        }
        else {
            // create plan service
            for (const member of members) {
                await strapi.entityService.create('api::plan-service.plan-service', {
                    data: {
                        author: member,
                        ...plansServiceObj
                    }
                })
            }
        }
    },

    updateAllMembersGuests: async (subscriptionId, membersCount, guestsCount) => {
        const planServices = await strapi.db.query('api::plan-service.plan-service').findMany({
            where: { subscription: subscriptionId }
        })

        if (planServices.length > 0) {
            for (const service of planServices) {
                await strapi.db.query('api::plan-service.plan-service').update({
                    where: { id: service.id },
                    data: {
                        included_members_used: membersCount, 
                        guest_users_used: guestsCount 
                    }
                });
            }
        }
    }
}));
