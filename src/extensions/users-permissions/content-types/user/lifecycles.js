const { deleteUserData, setUserSeoInformation, triggerZohoWorkflow } = require("../../../../../utils");
const { deleteSharedCollections, deleteSharedTags } = require("../../../../api/user-account/services/user-service");
const { sidebar, displaySettings, webapp_sidebar_arr } = require("../../utils");
const { updateReferral, createReferralViaLink } = require("../../utils/referral");
const { createTeamData } = require("../../utils/team");
const { followCurateitCollection, updateTeamData } = require("./after-user-operation");
const { createCollection, createGems } = require("./create-default-collection-gems")

module.exports = {
    beforeCreate(event) {
        const { data } = event.params;
        const name     = data.username
        // const slug     = slugify(name?.slice(0, 65) || "", { lower: true, remove: /[&,+()$~%.'":*?<>{}/\/]/g });
        event.params.data.slug = name?.slice(0, 65)
        event.params.data.seo  = {
            seo: {
                slug: name?.slice(0, 65),
                title: name?.slice(0, 65),
                keywords: `${name?.slice(0, 65)},`,
                canonical: `${process.env.REDIRECT_URI}/u/${name?.slice(0, 65)}`,
                description: data.about?.slice(0, 155) || name?.slice(0, 65),
            },
            opengraph: {
              url: `${process.env.REDIRECT_URI}/u/${name?.slice(0, 65)}`,
              type: "website",
              image: data.profilePhoto || "https://d3jrelxj5ogq5g.cloudfront.net/webapp/curateit-logo.png",
              title: name?.slice(0, 65),
              description: data.about?.slice(0, 155) || name?.slice(0, 65)
            }
        }
    },

    async afterCreate(event) {
        const { result } = event
        const query = strapi?.requestContext?.get()?.request?.url;
        result.isNewlyCreated = true
        if (result && result.id) {
            triggerZohoWorkflow(result.email)
            result.sidebarArr = sidebar
            result.preferences = displaySettings
            result.webapp_sidebar_arr = webapp_sidebar_arr
            followCurateitCollection(result)
            updateTeamData(result.email, result.id)

            if (query?.includes("code=")) {
                const code = query?.split("code=")[1]
                const ct_code = code?.split("&platform=")[0]
                const ct_platform = code?.split("&platform=")[1]
                updateReferral(result, ct_code, ct_platform)
            }
            if (query?.includes("team=")) {
                const code = query?.split("code=")[1]
                const ct_code = code?.split("&team=")[0]
                const ct_team = code?.split("&team=")[1]
                createTeamData(result, ct_code, ct_team )
            }
            if (query?.includes("uname=")) {
                const code = query?.split("?")[1]
                const parameter = code?.split("&")
                const ct_uname = parameter[0]?.split("=")[1]
                const ct_id = parameter[1]?.split("=")[1]
                const ct_module = parameter[2]?.split("=")[1]
                const ct_trigger = parameter[3]?.split("=")[1]
                const ct_slug = parameter[4]?.split("=")[1]
                updateReferral(result, ct_uname, ct_module, ct_id, ct_trigger, ct_slug)

            }
            // if (query?.includes("code=") && query?.includes("platform=link")) {
            //     const code = query?.split("code=")[1]
            //     updateInvite(result.email, result.id, code)
            // }
            createReferralViaLink(result.id, result.username)
            return result
        }
    },

    async beforeDelete(event) {
        const { params } = event;
        const userId = params.where.id;

        const userData = await strapi.entityService.findOne('plugin::users-permissions.user', userId, {
            fields: ["id", "username", "email"],
            populate: {
                collections: {
                    fields: ["id"]
                },
                gems: {
                    fields: ["id"]
                },
                tags: {
                    fields: ["id"]
                },
                plan_service: {
                    fields: ["id"]
                },
                gamification_score: {
                    fields: ["id"]
                },
                bookmark_config: {
                    fields: ["id"]
                },
                sidebar_app : {
                    fields: ["id"]
                }
            }
        })
        
        const data = {
            collectionData: userData.collections,
            gemdata: userData.gems,
            tagData: userData.tags,
            plan_service: userData.plan_service,
            gamification_score: userData.gamification_score,
            bookmark_config: userData.bookmark_config,
            sidebar_app: userData.sidebar_app
        }
        deleteUserData(data);
        deleteSharedTags(userData.email, userId)
        deleteSharedCollections(userData.email, userId)
    }
}