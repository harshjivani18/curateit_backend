'use strict';

const { where } = require('sequelize');

/**
 * user-account controller
 */
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::user-account.user-account', {

    async migrateAiSettings (ctx) {
        const users = await strapi.entityService.findMany('plugin::users-permissions.user');

        await strapi.db.query('plugin::users-permissions.user').updateMany({
            where: {
                id: { $in: users.map(user => user.id) }
            },
            data: {
                ai_settings: {
                    defaultAI: "Curateit AI",
                    defaultModel: "gpt-4o-mini",
                    defaultLanguage: "English (US)",
                    defaultBrandVoiceId: 1,
                    defaultBrandVoiceName: "Curateit",
                    defaultBrandPersona: 3,
                    defaultBrandPersonaName: "Social Media Manager",
                    openAIKey: "",
                    claudeAPIKey: "",
                    geminiAPIKey: "",
                }
            }
        })

        return ctx.send("User migration completed successfully!")
    },

    migrateAiTriggers: async (ctx) => {
        const users = await strapi.entityService.findMany('plugin::users-permissions.user')

        for (let user of users) {

            await strapi.db.query('plugin::users-permissions.user').update({
                where: {
                    id: user.id
                },
                data: {
                    ai_settings: {
                        ...user.ai_settings,
                        defaultAIVoice: "alloy",
                        enableReading: true,
                        enableWriting: true,
                        enablePrompts: true,
                        enableModels: true,
                        enableOptText: true,
                        enableLanguage: true,
                        enablePersona: true,
                        enableAttachFile: true,
                        enableBrandVoice: true,
                        enableDictate: true,
                        enableIncludeOptions: true,
                        orderOfPrompts: [],
                        triggers: [
                            "allPlatforms",
                            "youtube",
                            "articleSummary",
                            "gmail",
                            "linkedin",
                            "twitter",
                            "facebook",
                            "facebookMessenger",
                            "whatsapp",
                            "instagram",
                            "reddit",
                            "googleDocs",
                            "telegram",
                            "slack",
                            "outlook",
                            "zohoMail",
                        ],
                    }
                }
            })
        }

        return ctx.send("User migration completed successfully!")
    }
});
