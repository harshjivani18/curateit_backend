const { createElasticData, updateElasticData, deleteElasticData, domainmanagerData, createPromptBuilder, updatePromptBuilder, microlinkAndIframelyDetails, updateEmptyUrl, createCopyForAILibrary } = require("../../services/after-operations");
const { updatePlanService, setGemSeoInformation } = require("../../../../../utils");
const { default: slugify } = require("slugify");
const { checkPrompt } = require("../../services/before-operations");
const utils = require('@strapi/utils');
const { updateGemOrder, updateGemoOrderViaTag, gemOrderAtDeleteGem, gemOrderAtUpdateGem, readTimeUpdateInGem, deleteParentGem } = require("../../services/gem-service");
const updateSaveImg = require("../../services/update-save-img");

const {  ApplicationError } = utils.errors;


module.exports = {
    async afterCreate(data) {
        const { params, result } = data;
        const userId = strapi?.requestContext?.get()?.state?.user?.id;
        const username = strapi?.requestContext?.get()?.state?.user?.username;
        const bioCollection = strapi?.requestContext?.get()?.state?.user?.bio_collection;

        if (!params?.data?.isImported) {
            createElasticData(userId || params.data.author, result, username);
        }
        // if(params?.data?.media_type === "Ai Prompt") createPromptBuilder(userId || params.data.author, result)
        updatePlanService(userId, "gem");
        // setGemSeoInformation(result, username)
        if(["SocialFeed", "Profile"].indexOf(result.media_type) !== -1) microlinkAndIframelyDetails(result, userId)
        // strapi.entityService.findOne("api::gem.gem", result.id, {
        //     populate: {
        //         collection_gems: {fields: ["id", "name", "slug", "order_of_gems"]},
        //         tags: {fields: ["id", "tag", "slug", "order_of_gems"]}
        //     }
        // }).then((gem) => {
        //     if ((!gem?.url || gem?.url==="")  && gem?.collection_gems?.id === parseInt(bioCollection)) updateEmptyUrl(username, gem.id, gem.title, gem.slug)
        //     updateGemOrder(gem)
        //     updateGemoOrderViaTag(gem)
        // })
        await strapi.entityService.findOne("api::gem.gem", result.id, {
            populate: {
                collection_gems: {fields: ["id", "name", "slug", "order_of_gems"]},
                tags: {fields: ["id", "tag", "slug", "order_of_gems"]},
                author: {fields: ["id", "username"]}
            }
        }).then((gem) => {
            if ((!gem?.url || gem?.url==="")  && gem?.collection_gems?.id === parseInt(bioCollection)) updateEmptyUrl(username, gem.id, gem.title, gem.slug)
            updateGemOrder(gem)
            updateGemoOrderViaTag(gem)
            if (params?.data?.media_type === "Article") readTimeUpdateInGem(gem)
        })
        // if ((!gem?.url || gem?.url==="")  && gem?.collection_gems?.id === parseInt(bioCollection)) updateEmptyUrl(username, gem.id, gem.title, gem.slug)
        // updateGemOrder(gem)
        // updateGemoOrderViaTag(gem)

        const url  = `${process.env.REDIRECT_URI}/u/${username}/g/${result.id}/${result.slug}`
        const obj  = {
            ...result.seo,
            seo: {
                ...result.seo.seo,
                canonical: url
            },
            opengraph: {
                ...result.seo.opengraph,
                url
            }
        }
        const mainGemURL = result.S3_link || result.metaData?.defaultThumbnail || result.media?.covers?.[0]
        const {
            AWS_BASE_URL,
            AWS_S3_BUCKET_BASE_URL
        } = process.env;
        let newStoreURL = null;
        const updateObj = {
            seo: obj,
            isSeoUpdate: true
        }
        if (mainGemURL && mainGemURL !== "" && typeof mainGemURL === "string" && !mainGemURL?.startsWith(process.env.AWS_BASE_URL)) {
            if (typeof mainGemURL === "string" && mainGemURL.startsWith(AWS_S3_BUCKET_BASE_URL)) {
                newStoreURL = mainGemURL.replace(AWS_S3_BUCKET_BASE_URL, AWS_BASE_URL)
            }
            else {
                newStoreURL = strapi.service('api::gem.update-save-img').updateSaveImg(mainGemURL, result.id, userId)
            }
        }
        if (newStoreURL) {
            if (result.S3_link && result.S3_link?.length > 0) {
                updateObj.S3_link = [ newStoreURL, ...result.S3_link ]
            }
            if (result.metaData?.defaultThumbnail) {
                updateObj.metaData = {
                    ...result.metaData,
                    defaultThumbnail: newStoreURL,
                    docImages: [ newStoreURL, ...result.metaData?.docImages ],
                    covers: result.metaData?.covers?.length > 0 ? [ newStoreURL, ...result.metaData?.covers ] : [],
                    fallbackURL: mainGemURL
                }
            }
            if (result.media?.covers?.length > 0) {
                updateObj.media = {
                    ...result.media,
                    covers: [ newStoreURL, ...result.media?.covers ],
                    fallbackURL: mainGemURL
                }
            }
        }

        // let newProfileSocialFeed = null;
        // const profileImgUrl      = result?.socialfeed_obj?.profile_image_url || result?.socialfeed_obj?.image || result?.socialfeed_obj?.user?.profile_image_url

        // if (profileImgUrl && profileImgUrl !== "" && !profileImgUrl.startsWith(AWS_BASE_URL)) {
        //     newProfileSocialFeed = strapi.service('api::gem.update-save-img').updateSaveImg(profileImgUrl, result.id, userId)
        // }
        // if (newProfileSocialFeed) {
        //     if (result.socialfeed_obj?.image) {
        //         updateObj.socialfeed_obj = {
        //             ...result.socialfeed_obj,
        //             image: newProfileSocialFeed,
        //             fallbackProfileImage: profileImgUrl
        //         }
        //     }
        //     if (result.socialfeed_obj?.profile_image_url) {
        //         updateObj.socialfeed_obj = {
        //             ...result.socialfeed_obj,
        //             profile_image_url: newProfileSocialFeed,
        //             fallbackProfileImage: profileImgUrl
        //         }
        //     }
        //     if (result.socialfeed_obj?.user?.profile_image_url) {
        //         updateObj.socialfeed_obj = {
        //             ...result.socialfeed_obj,
        //             user: {
        //                 ...result.socialfeed_obj.user,
        //                 profile_image_url: newProfileSocialFeed,
        //                 fallbackProfileImage: profileImgUrl
        //             }
        //         }
        //     }
        // }
        
        strapi.entityService.update("api::gem.gem", result.id, {
            data: updateObj
        })

        if(!params?.data?.copyGem && params?.data?.media_type === "Ai Prompt" && params?.data?.isPublicPrompt === true) {
            createCopyForAILibrary(params)
        }
        // domainmanagerData(result, params.data.isSave)
    },

    afterDelete(event) {
        const { params } = event;
        const userId = strapi.requestContext.get().state.user.id;
        deleteElasticData(params.where?.id, userId);
        updatePlanService(userId, "gem");
    },

    async afterUpdate(event) {
        const { result, params } = event;
        const userId = strapi.requestContext?.get()?.state?.user?.id;
        if (!params.data.isSeoUpdate) {
            updateElasticData(result, userId);
        }
        if(params.data.media_type === "Ai Prompt") updatePromptBuilder(userId || params.data.author, result)

    },

    async afterFindOne(event) {
        const query = strapi?.requestContext?.get()?.request?.url;
        const gemId = event.params.where.id;

        if (query?.includes("random")) {
            const pages = query.split("page=")[1].split("&")[0];
            const perPages = query.split("perPage=")[1].split("&")[0];
            const pageNum = parseInt(pages);
            const perPagesNum = parseInt(perPages);
            const start = pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum;
            const limit = start + perPagesNum;

            const collectionData = await strapi.entityService.findMany("api::gem.gem", {
                filters: { id: gemId },
                fields: ["id", "title"],
                populate: {
                    collection_gems: { fields: ["id", "slug"] },
                }
            })

            const collectionId = collectionData[0]?.collection_gems?.id;
            if (collectionId) {
                const collection = await strapi.entityService.findOne("api::collection.collection", collectionId, {
                    fields: ["id", "name", "slug"],
                    populate: {
                        gems: {
                            sort: {id: "asc"}, 
                            fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "socialfeed_obj", "custom_fields_obj", "createdAt", "updatedAt", "broken_link", "expander", "platform", "comments_count", "shares_count", "likes_count", "save_count", "isApproved", "isPending"],
                            populate: {
                                author: {
                                    fields: ["id", "username"]
                                }
                            }
                        },
                        author: {
                            fields: ["id", "username"]
                        }
                    }
                })
    
                const random = collection.gems.filter((g) => {
                    if ((parseInt(g?.author?.id) === parseInt(collection?.author?.id)) || (g?.isApproved === true && g?.isPending === false)) {
                        return g.id !== parseInt(gemId)
                    }
                })
                
                const totalCount = random?.length;
    
                const randomGems = random.slice(start, limit);
                event.result.totalCount = totalCount;
                event.result.randomGems = randomGems;
            }
            else {
                event.result.randomGems = []
            }
        }

    },

    async beforeCreate(event) {
        const { data } = event.params;

        const userId = strapi?.requestContext?.get()?.state?.user?.id;
        if (strapi?.requestContext?.get()?.state?.collection_access_type === "editor") {
            event.params.data.isApproved = true
            event.params.data.isPending = false
        }
        // const aiLibraryId = await strapi.entityService.findMany("api::config-limit.config-limit")
        const aiLibraryId = await strapi.db.query("api::config-limit.config-limit").findOne({
            where: { aiPromptLibraryId: { $notNull: true } }
        })

        if (parseInt(aiLibraryId?.aiPromptLibraryId) === parseInt(data?.collection_gems)) {
            const prompt = await checkPrompt(data, userId)
            if (prompt.status === 400) throw new ApplicationError('Your account email is not confirmed')
        }

        // const slug     = slugify(data.title || "", { lower: true, remove: /[&,+()$~%.'":*?<>{}/\/]/g });
        const slug     = slugify(data.title?.slice(0, 65) || "", { lower: true, remove: /[&,+()$~%.'":*?<>{}/\/]/g });
        event.params.data.slug = slug;
        event.params.data.seo  = {
            seo: {
                slug,
                title: `${data.title?.slice(0, 65)} | Curateit`,
                keywords: `${data.title?.slice(0, 65)},`,
                canonical: "",
                description: data.description?.slice(0, 155) || data.title?.slice(0, 65),
            },
            opengraph: {
              url: "",
              type: "website",
              image: data.metaData?.defaultThumbnail || "https://d3jrelxj5ogq5g.cloudfront.net/webapp/curateit-logo.png",
              title: `${data.title?.slice(0, 65)} | Curateit`,
              description: data.description?.slice(0, 155) || data.title?.slice(0, 65)
            }
        }
        if (event && event.params && event.params.data && event.params.data.metaData) {
            let newMetaData = { ...event.params.data.metaData }
            if (newMetaData?.docImages && newMetaData?.docImages?.length > 0) {
                const existingDocImages     = [ ...newMetaData.docImages ]?.filter((s) => s && !s.startsWith("data:"))?.slice(0, 5) || [];
                newMetaData  = {
                    ...newMetaData,
                    docImages: existingDocImages
                }
            }
            if (newMetaData?.covers && newMetaData?.covers?.length > 0) {
                const existingCovers       = [ ...newMetaData.covers ]?.filter((s) => s && !s.startsWith("data:"))?.slice(0, 5) || [];
                newMetaData  = {
                    ...newMetaData,
                    covers: existingCovers
                }
            }
            event.params.data.metaData = newMetaData
        }
        if (event && event.params && event.params.data && event.params.data.media) {
            let newMedia = { ...event.params.data.media }
            if (newMedia?.docImages && newMedia?.docImages?.length > 0) {
                const existingMediaDocs     = [ ...newMedia.docImages ]?.filter((s) => s && !s.startsWith("data:"))?.slice(0, 5) || [];
                newMedia  = {
                    ...newMedia,
                    docImages: existingMediaDocs
                }
            }
            if (newMedia?.covers && newMedia?.covers?.length > 0) {
                const existingMediaCovers       = [ ...newMedia.covers ]?.filter((s) => s && !s.startsWith("data:"))?.slice(0, 5) || [];
                newMedia  = {
                    ...newMedia,
                    covers: existingMediaCovers
                }
            }
            event.params.data.media = newMedia
        }
    },

    async beforeDelete(event) {
        const { params } = event;
        await gemOrderAtDeleteGem(params.where.id);
        deleteParentGem(params.where.id);
    },

    async beforeUpdate(event) {
        const { params } = event;
        const oldGemData = await strapi.entityService.findOne("api::gem.gem", params?.where?.id, {
            populate: {
                collection_gems: {fields: ["id", "name", "slug", "order_of_gems"]},
                tags: {fields: ["id", "tag", "slug", "order_of_gems"]}
            }
        })
        if (params?.data?.hasOwnProperty('collection_gems')) await gemOrderAtUpdateGem(oldGemData, params.data);
    }
}; 