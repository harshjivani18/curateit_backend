const { default: axios } = require('axios');
const { createCollection, createGems } = require('../../../extensions/users-permissions/content-types/user/create-default-collection-gems');
const { sidebar, displaySettings, getService, webapp_sidebar_arr } = require('../../../extensions/users-permissions/utils');
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::collection.collection', ({ strapi }) => ({

    async createDefaultCollectionGems(ctx) {
        try {
            const { user } = ctx.state;

            const curateitCollection = await createCollection(user.id)
            await createGems(user.id, curateitCollection?.id, user.username)

            ctx.send({ status: 200, message: "Default collection created" })
        } catch (error) {
            ctx.send({ status: 400, message: error });
        }
    },

    async updateUserData(ctx) {
        try {
            const { user } = ctx.state;
            const jwt = getService('jwt').issue({ id: user.id });
            let isPlanServiceGenerated = false

            /* Checking config limit records is exists or not ? */
            // const configLimit = await strapi.db.query('api::config-limit.config-limit').findMany({
            //     orderBy: { id: 'desc' }
            // })
            const plan        = await strapi.db.query('api::plan.plan').findOne({ 
                where: { 
                    is_default_created_plan: true
                } 
            })
            const configLimit = await strapi.db.query('api::config-limit.config-limit').findOne({
                where: { 
                    related_plans: plan?.id
                },
                populate: {
                    related_plans: {
                        select: ["id", "display_name", "tenure"]
                    }
                }
            })

            /* Creating plan service record after each signup call */
            const userPlanService = await strapi.db.query('api::plan-service.plan-service').findOne({
                where: { author: user.id, plan: "free" },
            })

            const teamMember = await strapi.db.query("api::team.team").findOne({
                where: { username: user.id },
                select: ["id", "isMember"],
                populate: {
                    author: {
                        select: ["id"]
                    }
                }
            })

            if (teamMember && teamMember?.isMember && teamMember?.author?.id) {
                const authorPlanService = await strapi.db.query("api::plan-service.plan-service").findOne({
                    where: {
                        author: teamMember?.author?.id
                    },
                    select: ["id", "guest_users_used", "included_members_used"],
                    populate: {
                        subscription: {
                            select: ["id"],
                            populate: {
                                plan: {
                                    select: ["id", "is_team_plan", "display_name"]
                                }
                            }
                        }
                    }
                })
                if (authorPlanService?.subscription && authorPlanService?.subscription?.plan?.is_team_plan && authorPlanService?.subscription?.plan?.id) {
                    const memberConfig = await strapi.db.query("api::config-limit.config-limit").findOne({
                        where: { related_plans: authorPlanService?.subscription?.plan?.id },
                        populate: {
                            related_plans: {
                                select: ["id", "display_name", "tenure"]
                            }
                        }
                    })
                    if (memberConfig) {
                        let related_plan = null
                        if (memberConfig.related_plans?.length > 0) {
                            const relatedIndex = memberConfig.related_plans.findIndex((plan) => plan.id === authorPlanService?.subscription?.plan?.id)
                            related_plan = relatedIndex !== -1 ? memberConfig.related_plans[relatedIndex] : null
                        }
                        isPlanServiceGenerated = true
                        strapi.db.query('api::plan-service.plan-service').create({
                            data: {
                                included_members_used: authorPlanService?.included_members_used ? authorPlanService.included_members_used : 1,
                                guest_users_used: authorPlanService?.guest_users_used ? authorPlanService.guest_users_used : 1,
                                gem_limit: memberConfig?.gem_limit ? parseInt(memberConfig.gem_limit) : 100000,
                                coll_limit: memberConfig?.coll_limit ? parseInt(memberConfig.coll_limit) : 100000,
                                tag_limit: memberConfig?.tag_limit ? parseInt(memberConfig.tag_limit) : 100000,

                                speech_limit: memberConfig?.speech_limit ? parseInt(memberConfig.speech_limit) : 100000,
                                ocr_pdf_limit: memberConfig?.ocr_pdf_limit ? parseInt(memberConfig.ocr_pdf_limit) : 100000,
                                ocr_image_limit: memberConfig?.ocr_image_limit ? parseInt(memberConfig.ocr_image_limit) : 100000,

                                // subscription_plans: related_plan?.display_name || "Influencer",
                                file_upload: memberConfig?.file_upload ? parseInt(memberConfig.file_upload) : 5000000,
                                guest_users: memberConfig?.guest_users ? parseInt(memberConfig.guest_users) : 10,
                                included_members: memberConfig?.included_members ? parseInt(memberConfig.included_members) : 1,
                                public_collection_and_tags: memberConfig?.public_collection_and_tags ? parseInt(memberConfig.public_collection_and_tags) : 100000,
                                workspaces: memberConfig?.workspaces ? parseInt(memberConfig.workspaces) : 1,
                                storage: memberConfig?.storage ? parseInt(memberConfig.storage) : 10000000,
                                audio_recording: memberConfig?.audio_recording ? parseInt(memberConfig.audio_recording) : 3600,
                                file_upload_size_limit: memberConfig?.file_upload_size_limit ? parseInt(memberConfig.file_upload_size_limit) : 500000,
                                bio_links: memberConfig?.bio_links ? parseInt(memberConfig.bio_links) : 3,
                                author: user.id,
                                is_advanced_search: memberConfig?.is_advanced_search ? memberConfig.is_advanced_search : false,
                                related_plan: related_plan?.id,
                                subscription: authorPlanService?.subscription?.id,
                                publishedAt: new Date().toISOString()
                            }
                        })
                    }
                }
            }
            
            if (!userPlanService && !isPlanServiceGenerated) {
                // if (configLimit && configLimit.length > 0) {
                    // strapi.db.query('api::plan-service.plan-service').create({
                    //     data: {
                    //         gem_limit: configLimit[0]?.gem_limit ? parseInt(configLimit[0].gem_limit) : 250,
                    //         coll_limit: configLimit[0]?.coll_limit ? parseInt(configLimit[0].coll_limit) : 10,
                    //         tag_limit: configLimit[0]?.tag_limit ? parseInt(configLimit[0].tag_limit) : 50,
                    //         speech_limit: configLimit[0]?.speech_limit ? parseInt(configLimit[0].speech_limit) : 15600,
                    //         ocr_pdf_limit: configLimit[0]?.ocr_pdf_limit ? parseInt(configLimit[0].ocr_pdf_limit) : 20,
                    //         ocr_image_limit: configLimit[0]?.ocr_image_limit ? parseInt(configLimit[0].ocr_image_limit) : 20,
                    //         author: user.id,
                    //         publishedAt: new Date().toISOString()
                    //     }
                    // })
                if (configLimit) {
                    let related_plan = null
                    if (configLimit.related_plans?.length > 0) {
                        const relatedIndex = configLimit.related_plans.findIndex((p) => p.id === plan.id)
                        related_plan = relatedIndex !== -1 ? configLimit.related_plans[relatedIndex] : null
                    }
                    strapi.db.query('api::plan-service.plan-service').create({
                        data: {
                            included_members_used: 1,
                            gem_limit: configLimit?.gem_limit ? parseInt(configLimit.gem_limit) : 100000,
                            coll_limit: configLimit?.coll_limit ? parseInt(configLimit.coll_limit) : 100000,
                            tag_limit: configLimit?.tag_limit ? parseInt(configLimit.tag_limit) : 100000,

                            speech_limit: configLimit?.speech_limit ? parseInt(configLimit.speech_limit) : 100000,
                            ocr_pdf_limit: configLimit?.ocr_pdf_limit ? parseInt(configLimit.ocr_pdf_limit) : 100000,
                            ocr_image_limit: configLimit?.ocr_image_limit ? parseInt(configLimit.ocr_image_limit) : 100000,

                            // subscription_plans: related_plan?.display_name || "Influencer",
                            file_upload: configLimit?.file_upload ? parseInt(configLimit.file_upload) : 5000000,
                            guest_users: configLimit?.guest_users ? parseInt(configLimit.guest_users) : 10,
                            included_members: configLimit?.included_members ? parseInt(configLimit.included_members) : 1,
                            public_collection_and_tags: configLimit?.public_collection_and_tags ? parseInt(configLimit.public_collection_and_tags) : 100000,
                            workspaces: configLimit?.workspaces ? parseInt(configLimit.workspaces) : 1,
                            storage: configLimit?.storage ? parseInt(configLimit.storage) : 10000000,
                            audio_recording: configLimit?.audio_recording ? parseInt(configLimit.audio_recording) : 3600,
                            file_upload_size_limit: configLimit?.file_upload_size_limit ? parseInt(configLimit.file_upload_size_limit) : 500000,
                            bio_links: configLimit?.bio_links ? parseInt(configLimit.bio_links) : 3,
                            author: user.id,
                            is_advanced_search: configLimit?.is_advanced_search ? configLimit.is_advanced_search : false,
                            related_plan: related_plan?.id,
                            publishedAt: new Date().toISOString()
                        }
                    })
                } else {
                    strapi.db.query('api::plan-service.plan-service').create({
                        data: {
                            author: user.id,
                            publishedAt: new Date().toISOString()
                        }
                    })
                }
            }

            /* Creating gemification score record after each signup call */
            const userGamification = await strapi.db.query('api::gamification-score.gamification-score').findOne({
                where: { author: user.id }
            })
            if (!userGamification) {

                if (configLimit && configLimit.length > 0) {
                    strapi.db.query('api::gamification-score.gamification-score').create({
                        data: {
                            gems_point: configLimit[0]?.gems_point ? parseInt(configLimit[0].gems_point) : 0,
                            colls_point: configLimit[0]?.colls_point ? parseInt(configLimit[0].colls_point) : 1,
                            comments_point: configLimit[0]?.comments_point ? parseInt(configLimit[0].comments_point) : 0,
                            reactions_point: configLimit[0]?.reactions_point ? parseInt(configLimit[0].reactions_point) : 0,
                            author: user.id,
                            publishedAt: new Date().toISOString()
                        }
                    })
                } else {
                    strapi.db.query('api::gamification-score.gamification-score').create({
                        data: {
                            author: user.id,
                            publishedAt: new Date().toISOString()
                        }
                    })
                }
            }

            /* Creating Bookmark config settting after each signup call */
            const userBookmarkConfig = await strapi.db.query('api::bookmark-config.bookmark-config').findOne({
                where: { author: user.id }
            })
            if (!userBookmarkConfig) {

                strapi.db.query('api::bookmark-config.bookmark-config').create({
                    data: {
                        cardSize: "medium",
                        showTableVerticalLine: true,
                        tableWrapColumns: true,
                        groupLayout: "vertical",
                        subGroupLayout: "vertical",
                        columnColor: true,
                        propertyShown: {
                            moodboard: {
                                propertyShown: [],
                            },
                            table: {
                                propertyShown: [
                                    {
                                        "name": "Thumbnail",
                                        "type": "image"
                                    },
                                    {
                                        "name": "Title",
                                        "type": "text"
                                    },
                                    {
                                        "name": "Description",
                                        "type": "text"
                                    },
                                    {
                                        "name": "Tags",
                                        "type": "tags"
                                    },
                                    {
                                        "name": "Collection",
                                        "type": "folder"
                                    },
                                ]
                            },
                            list: {
                                propertyShown: [
                                    {
                                        "name": "Thumbnail",
                                        "type": "image"
                                    },
                                    {
                                        "name": "Title",
                                        "type": "text"
                                    },
                                    {
                                        "name": "Description",
                                        "type": "text"
                                    },
                                    {
                                        "name": "Tags",
                                        "type": "tags"
                                    }
                                ]
                            },
                            card: {
                                propertyShown: [
                                    {
                                        "name": "Thumbnail",
                                        "type": "image"
                                    },
                                    {
                                        "name": "Title",
                                        "type": "text"
                                    },
                                    {
                                        "name": "Description",
                                        "type": "text"
                                    },
                                    {
                                        "name": "Tags",
                                        "type": "tags"
                                    }
                                ]
                            },
                            inbox: {
                                propertyShown: [
                                    {
                                        "name": "Thumbnail",
                                        "type": "image"
                                    },
                                    {
                                        "name": "Title",
                                        "type": "text"
                                    },
                                    {
                                        "name": "Description",
                                        "type": "text"
                                    },
                                    {
                                        "name": "Tags",
                                        "type": "tags"
                                    }
                                ]
                            },
                            stream: {
                                propertyShown: [],
                            },
                        },
                        propertyHidden: {
                            moodboard: {
                                propertyHidden: [
                                    {
                                        "name": "Thumbnail",
                                        "type": "image"
                                    },
                                    {
                                        "name": "Title",
                                        "type": "text"
                                    },
                                    {
                                        "name": "Description",
                                        "type": "text"
                                    },
                                    {
                                        "name": "Tags",
                                        "type": "tags"
                                    },
                                    {
                                        "name": "Url",
                                        "type": "url"
                                    },
                                    {
                                        "name": "Collection",
                                        "type": "folder"
                                    },
                                    {
                                        "name": "Media Type",
                                        "type": "mediaType"
                                    },
                                    {
                                        "name": "Remarks",
                                        "type": "remarks"
                                    },
                                    {
                                        "name": "Author",
                                        "type": "author"
                                    }
                                ],
                            },
                            table: {
                                propertyHidden: [
                                    {
                                        "name": "Url",
                                        "type": "url"
                                    },
                                    {
                                        "name": "Media Type",
                                        "type": "mediaType"
                                    },
                                    {
                                        "name": "Remarks",
                                        "type": "remarks"
                                    },
                                    {
                                        "name": "Author",
                                        "type": "author"
                                    }
                                ]
                            },
                            list: {
                                propertyHidden: [
                                    {
                                        "name": "Url",
                                        "type": "url"
                                    },
                                    {
                                        "name": "Collection",
                                        "type": "folder"
                                    },
                                    {
                                        "name": "Media Type",
                                        "type": "mediaType"
                                    },
                                    {
                                        "name": "Remarks",
                                        "type": "remarks"
                                    },
                                    {
                                        "name": "Author",
                                        "type": "author"
                                    }
                                ]
                            },
                            card: {
                                propertyHidden: [
                                    {
                                        "name": "Url",
                                        "type": "url"
                                    },
                                    {
                                        "name": "Collection",
                                        "type": "folder"
                                    },
                                    {
                                        "name": "Media Type",
                                        "type": "mediaType"
                                    },
                                    {
                                        "name": "Remarks",
                                        "type": "remarks"
                                    },
                                    {
                                        "name": "Author",
                                        "type": "author"
                                    }
                                ]
                            },
                            inbox: {
                                propertyHidden: [
                                    {
                                        "name": "Url",
                                        "type": "url"
                                    },
                                    {
                                        "name": "Collection",
                                        "type": "folder"
                                    },
                                    {
                                        "name": "Media Type",
                                        "type": "mediaType"
                                    },
                                    {
                                        "name": "Remarks",
                                        "type": "remarks"
                                    },
                                    {
                                        "name": "Author",
                                        "type": "author"
                                    }
                                ]
                            },
                            stream: {
                                propertyHidden: [
                                    {
                                        "name": "Thumbnail",
                                        "type": "image"
                                    },
                                    {
                                        "name": "Title",
                                        "type": "text"
                                    },
                                    {
                                        "name": "Description",
                                        "type": "text"
                                    },
                                    {
                                        "name": "Tags",
                                        "type": "tags"
                                    },
                                    {
                                        "name": "Url",
                                        "type": "url"
                                    },
                                    {
                                        "name": "Collection",
                                        "type": "folder"
                                    },
                                    {
                                        "name": "Media Type",
                                        "type": "mediaType"
                                    },
                                    {
                                        "name": "Remarks",
                                        "type": "remarks"
                                    },
                                    {
                                        "name": "Author",
                                        "type": "author"
                                    }
                                ],
                            },
                        },
                        propertyOrder: {
                            moodboard: {
                                propertyOrder: [],
                            },
                            table: {
                                propertyOrder: [
                                    {
                                        "name": "Thumbnail",
                                        "type": "image"
                                    },
                                    {
                                        "name": "Title",
                                        "type": "text"
                                    },
                                    {
                                        "name": "Description",
                                        "type": "text"
                                    },
                                    {
                                        "name": "Tags",
                                        "type": "tags"
                                    },
                                    {
                                        "name": "Collection",
                                        "type": "folder"
                                    },
                                ]
                            },
                            list: {
                                propertyOrder: [
                                    {
                                        "name": "Thumbnail",
                                        "type": "image"
                                    },
                                    {
                                        "name": "Title",
                                        "type": "text"
                                    },
                                    {
                                        "name": "Description",
                                        "type": "text"
                                    },
                                    {
                                        "name": "Tags",
                                        "type": "tags"
                                    }
                                ]
                            },
                            card: {
                                propertyOrder: [
                                    {
                                        "name": "Thumbnail",
                                        "type": "image"
                                    },
                                    {
                                        "name": "Title",
                                        "type": "text"
                                    },
                                    {
                                        "name": "Description",
                                        "type": "text"
                                    },
                                    {
                                        "name": "Tags",
                                        "type": "tags"
                                    }
                                ]
                            },
                            inbox: {
                                propertyOrder: [
                                    {
                                        "name": "Thumbnail",
                                        "type": "image"
                                    },
                                    {
                                        "name": "Title",
                                        "type": "text"
                                    },
                                    {
                                        "name": "Description",
                                        "type": "text"
                                    },
                                    {
                                        "name": "Tags",
                                        "type": "tags"
                                    }
                                ]
                            },
                            stream: {
                                propertyOrder: [],
                            },
                        },
                        sort: [],
                        filter: [],
                        author: user.id,
                        publishedAt: new Date().toISOString()
                    }
                })
            }

            // By default per user has one unfiltered collection
            const collection = await strapi.db.query("api::collection.collection").findOne({
                where: { author: user.id, name: "Unfiltered" }
            })
            let res;
            if (!collection) {
                res = await strapi.service("api::collection.collection").create({
                    data: {
                        name: "Unfiltered",
                        author: user.id,
                        publishedAt: new Date().toISOString(),
                        collection: null,
                        is_sub_collection: false
                    }
                })
                strapi.query('plugin::users-permissions.user').update({
                    where: { id: user.id },
                    data: {
                        unfiltered_collection: parseInt(res.id),
                        sidebarArr: sidebar,
                        preferences: displaySettings,
                        ai_settings: {
                            defaultAI: "Curateit AI",
                            defaultModel: "gpt-4o-mini",
                            defaultAIVoice: "alloy",
                            defaultLanguage: "English (US)",
                            defaultBrandVoiceId: 1,
                            defaultBrandVoiceName: "Curateit",
                            defaultBrandPersona: 3,
                            defaultBrandPersonaName: "Social Media Manager",
                            openAIKey: "",
                            claudeAPIKey: "",
                            geminiAPIKey: "",
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

             // By default per user has one Bio Contact collection
             const bioContact = await strapi.db.query("api::collection.collection").findOne({
                where: { author: user.id, name: "Bio Contact" }
            })
            let resBioContact;
            if (!bioContact) {
                resBioContact = await strapi.service("api::collection.collection").create({
                    data: {
                        name: "Bio Contact",
                        author: user.id,
                        publishedAt: new Date().toISOString(),
                        collection: null,
                        is_sub_collection: false,
                        isBioContactCollection: true
                    }
                })
                strapi.query('plugin::users-permissions.user').update({
                    where: { id: user.id },
                    data: {
                        bio_contact_collection: parseInt(resBioContact.id)
                    }
                })
            }

            // By default per user has one unfiltered collection
            const bioCollection = await strapi.db.query("api::collection.collection").findOne({
                where: { author: user.id, name: "Bio" }
            })
            let resBio;
            if (!bioCollection) {
                resBio = await strapi.service("api::collection.collection").create({
                    data: {
                        name: "Bio",
                        author: user.id,
                        publishedAt: new Date().toISOString(),
                        collection: null,
                        is_sub_collection: false
                    }
                })
                strapi.query('plugin::users-permissions.user').update({
                    where: { id: user.id },
                    data: {
                        bio_collection: parseInt(resBio.id),
                        sidebarArr: sidebar,
                        webapp_sidebar_arr: webapp_sidebar_arr,
                        preferences: displaySettings
                    }
                })
            }

            // To check whether there is any pending invitation for the user
            const sharedCollections = await strapi.db.query("api::collection.collection").findMany({
                where: {
                    invitedUsersViaMail: {
                        $notNull: true,
                        $containsi: user.email
                    }
                }
            })

            if (sharedCollections.length > 0) {
                for (const sIdx in sharedCollections) {
                    const collection = sharedCollections[sIdx];
                    let invitedUsersViaMail = collection.invitedUsersViaMail;
                    const mailIdx = invitedUsersViaMail.findIndex((mail) => mail.emailId === user.email);
                    if (mailIdx !== -1) {
                        invitedUsersViaMail[mailIdx] = {
                            ...invitedUsersViaMail[mailIdx],
                            isAccept: true,
                            id: user.id,
                            userName: user.username
                        }
                        invitedUsersViaMail = [...invitedUsersViaMail]

                        await strapi.db.query("api::collection.collection").update({
                            where: { id: collection.id },
                            data: { invitedUsersViaMail: invitedUsersViaMail }
                        })
                    }
                }
            }

            // const object = {
            //     user: {
            //         id: user.id,
            //         username: user.username
            //     }
            // }
            // const thread = await axios.post(
            //     `${process.env.MONGODB_URL}/api/threads/default-thread`,
            //         object,
            //     {
            //         headers: {
            //             Authorization: `Bearer ${jwt}`
            //         },
            //     }
            // )
            // strapi.query('plugin::users-permissions.user').update({
            //     where: { id: user.id },
            //     data: {
            //         thread: thread.data.data._id
            //     }
            // }), thread: thread.data.data._id

            ctx.send({ status: 200, message: "User data updated successfully", unfiltered_collection: collection ? parseInt(collection.id) : parseInt(res.id), bio_collection: bioCollection ? parseInt(bioCollection.id) : parseInt(resBio.id), bio_contact_collection: bioContact ? parseInt(bioContact.id) : parseInt(resBioContact.id) })

        } catch (error) {
            ctx.send({ status: 400, message: error });
        }
    }
}))