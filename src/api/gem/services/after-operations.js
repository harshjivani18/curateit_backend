const slugify = require('slugify');
const { default: axios } = require("axios");
const { parse } = require("tldts");
const { standardAPI } = require('../../../../protocol');
const { ApifyClient } = require("apify-client");
const { getService } = require('../../../extensions/users-permissions/utils');

const mediaType = [
    "Ai Prompt",
    "Audio",
    "Image",
    "Code",
    "Note",
    "PDF",
    "Quote",
    "Text Expander",
    "Video"
]

const updateUrl = async (name, id, title, slug) => {
    try {
        // const slug = slugify(title)

        const url = `${process.env.REDIRECT_URI}/u/${name}/g/${id}/${slug}`
        await strapi.entityService.update("api::gem.gem", id, {
            data: {
                url,
                isUrlUpdate: true
            }
        });

        return "success";
    } catch (error) {
        console.log("error===>", error);
        return error;
    }
}

exports.createElasticData = (userId, result, name) => {
    // if (process.env.NODE_ENV !== "production") return
    try {
        /*Create Elastic Index data*/
        strapi.entityService.findOne("api::gem.gem", result.id, {
            populate: {
                collection_gems: { fields: ["id", "name", "comments", "custom_fields_obj", "slug"] },
                tags: { fields: ["id", "tag", "slug"] }
            }
        })
            .then((gem) => {
                if (mediaType.includes(result.media_type) && ((result.fileType !== "url" && result.media_type !== "Code") || result.url === "")) {
                    updateUrl(name, result.id, result.title, result.slug);
                }
                if (process.env.NODE_ENV === 'production') {
                    strapi.db.query('api::plan-service.plan-service').findOne({
                        where: { author: userId }
                    }).then((userPlanService) => {
                        if (!userPlanService.is_advanced_search) {
                            // Query from mongodb
                            const jwt = getService('jwt').issue({ id: userId });
                            axios.post(`${process.env.MONGODB_URL}/api/searches`, gem, {
                            headers: {
                                Authorization: `Bearer ${jwt}`
                            },
                            })
                        }
                        else {
                            axios.post(
                                `${process.env.ELASTIC_SERACH_LAMBDA_URL}`,
                                {
                                    gem,
                                    userId
                                }
                            )
                        }
                    })
                }
            })
            .catch((err) => {
                console.log("err====>", err);
            })

        return "success";
    } catch (error) {
        console.log("createElasticData error====>", error);
        return error;
    }
}

exports.updateGemScreenshotsData = async (userId, name) => {
    const screens = []
    const gems    = await strapi.entityService.findMany("api::gem.gem", {
        filters: {
            isThumbnailBroken: true,
            author: userId
        }
    })
    gems.forEach((g) => {
        screens.push({
            url: g.url,
            gemId: g.id,
            userId,
            storageKey: `common/users/${userId}/gems/${g.id}/screenshots/${g.id}-${new Date().getTime()}.jpeg`
        })
    })
    const chunk         = []
    const chunkSize     = 5
    for (let i = 0; i < screens.length; i += chunkSize) {
        chunk.push(screens.slice(i, i + chunkSize))
    }
    // console.log("chunk===>", chunk.length);
    for (const cIdx in chunk) {
        const c = chunk[cIdx]
        // console.log("c===>", c.length);
        const screenshot  = await axios.post(`${process.env.SCREENSHOT_URL}/bulk-screenshots`, {
            screens: c
        })
        if (screenshot.error === undefined) {
            const { data } = screenshot
            for (const d of data) {
                const { screenshotUrl, gemId } = d
                const gIdx                     = gems.findIndex((g) => g.id === gemId)
                if (gIdx !== -1) {
                    const g = gems[gIdx]
                    await strapi.entityService.update("api::gem.gem", gemId, {
                        data: {
                            metaData: {
                                ...g.metaData,
                                defaultThumbnail: screenshotUrl,
                                docImages: [ screenshotUrl, ...g.metaData?.docImages ],
                                covers: [ screenshotUrl, ...g.metaData?.covers ]
                            },
                            isThumbnailBroken: false
                        }
                    })
                }
            }
        }
    }
}

exports.updateScreenshotsData = async (userId, result, name) => {
    const screens = []
    result.forEach((g) => {
        screens.push({
            url: g.url,
            gemId: g.id,
            userId,
            storageKey: `common/users/${userId}/gems/${g.id}/screenshots/${g.id}-${new Date().getTime()}.jpeg`
        })
    })

    const screenshot  = await axios.post(`${process.env.SCREENSHOT_URL}/bulk-screenshots`, {
        screens
    })
    if (screenshot.error === undefined) {
        const { data } = screenshot
        for (const d of data) {
            const { screenshotUrl, gemId } = d
            strapi.entityService.update("api::gem.gem", gemId, {
                data: {
                    metaData: {
                        ...res.metaData,
                        defaultThumbnail: screenshotUrl,
                        docImages: [ screenshotUrl, ...g.metaData?.docImages ],
                        covers: [ screenshotUrl, ...g.metaData?.covers ]
                    }
                }
            })
        }
    }
}

// exports.updateScreenshotsData = async (userId, result, name) => {
//     for (const g of result) {
//         const iframelyRes = await axios.get(`https://iframe.ly/api/iframely?url=${encodeURIComponent(g.url)}/&api_key=${process.env.IFRAMELY_API_KEY}`, {
//             headers: {
//                 'Accept': 'application/json',
//                 'Accept-Encoding': 'identity'
//             }
//         })  
//         const { data }    = iframelyRes
//         if (data && data.links?.thumbnail && data.links?.thumbnail?.length !== 0) {
//             const { thumbnail } = data.links
//             strapi.entityService.update("api::gem.gem", g.id, {
//                 data: {
//                     metaData: {
//                         ...res.metaData,
//                         defaultThumbnail: thumbnail[0].href,
//                         docImages: [ thumbnail[0].href, ...g.metaData.docImages ],
//                         covers: [ thumbnail[0].href, ...g.metaData.covers ]
//                     }
//                 }
//             })
//         }
//         else {
//             const screenshot  = await axios.post(`${process.env.SCREENSHOT_URL}/take-screenshot`, {
//                 url: g.url,
//                 storageKey: `common/users/${userId}/gems/${g.id}/screenshots/${g.id}-${new Date().getTime()}.jpeg`
//             })
//             if (screenshot.error === undefined) {
//                 const { screenshotUrl } = screenshot.data
//                 strapi.entityService.update("api::gem.gem", g.id, {
//                     data: {
//                         metaData: {
//                             ...res.metaData,
//                             defaultThumbnail: screenshotUrl,
//                             docImages: [ screenshotUrl, ...g.metaData?.docImages ],
//                             covers: [ screenshotUrl, ...g.metaData?.covers ]
//                         }
//                     }
//                 })
//             }
//         }
//     }
// }

exports.createBulkElasticData = async (userId, results, name) => {
    try {
        /*Create Elastic Index data*/
        const chunk = [];
        for (const result of results) {
            const gem = await strapi.entityService.findOne("api::gem.gem", result.id, {
                exclude: ["seo"],
                populate: {
                    collection_gems: { fields: ["id", "name", "comments", "custom_fields_obj", "slug"] },
                    tags: { fields: ["id", "tag", "slug"] }
                }
            })
            chunk.push(gem)
            if (mediaType.includes(result.media_type) && ((result.fileType !== "url" && result.media_type !== "Code") || result.url === "")) {
                updateUrl(name, result.id, result.title, result.slug);
            }
        }
        if (process.env.NODE_ENV === 'production') {
            const userPlanService = await strapi.db.query('api::plan-service.plan-service').findOne({
                where: { author: userId }
            })
        
            if (!userPlanService.is_advanced_search) {
                // Query from mongodb
                const jwt = getService('jwt').issue({ id: userId });
                await axios.post(`${process.env.MONGODB_URL}/api/searches/bulk-create`, chunk, {
                    headers: {
                        Authorization: `Bearer ${jwt}`
                    },
                })
            }
            else {
                await axios.post(
                    `${process.env.ELASTIC_SERACH_LAMBDA_URL}/bulk`,
                    {
                        gems: chunk,
                        userId
                    }
                );
            }
            return "success";
        }
    } catch (error) {
        console.log("createElasticData BULK error====>", error.message);
        return error;
    }
}

// exports.updateGemificationScore = async (userId) => {
//     try {
//         /* Update Gemification score */
//         // const gemiScore = await strapi.db.query('api::gamification-score.gamification-score').findOne({
//         //     where: {
//         //         author: userId
//         //     }
//         // });
//         const gemCount = await strapi.entityService.count("api::gem.gem", {
//             filters: { author: userId }
//         })

//         // if (gemiScore) {
//         // const gemScore = parseInt(gemiScore.gems) + 1;
//         await updateGemiScoreRecs(userId, { gems: gemCount, gems_point: gemCount });
//         // }

//         const updatedGemiScore = await strapi.db.query('api::gamification-score.gamification-score').findOne({
//             where: {
//                 author: userId
//             }
//         })
//         let level;
//         let totalScore = 0
//         for (const keys in updatedGemiScore) {
//             if (score_keys.includes(keys)) {
//                 totalScore += parseInt(updatedGemiScore[keys])
//             }
//         }
//         switch (true) {
//             case totalScore < 25000:
//                 level = "Rookie";
//                 break;
//             case totalScore < 100000:
//                 level = "Aspiring Influencer";
//                 break;
//             case totalScore < 500000:
//                 level = "Expert";
//                 break;
//             default:
//                 level = "Legend";
//         }
//         await updateGemiScoreRecs(userId, { level, totalScore });

//         return "success";
//     } catch (error) {
//         console.log("error==>", error);
//         return error;
//     }
// }

exports.updateElasticData = (result, userId) => {
    // if (process.env.NODE_ENV !== "production") return
    try {
        if (process.env.NODE_ENV === 'development') return "success"
        /* Update Elastic Data */
        strapi.entityService.findOne("api::gem.gem", result.id, {
            exclude: ["seo"],
            populate: {
                collection_gems: { fields: ["id", "name", "slug"] },
                tags: { fields: ["id", "tag", "slug"] }
            }
        })
            .then((gem) => {
                strapi.db.query('api::plan-service.plan-service').findOne({
                    where: { author: userId }
                }).then((userPlanService) => {
                    if (!userPlanService.is_advanced_search) {
                        // Query from mongodb
                        const jwt = getService('jwt').issue({ id: userId });
                        axios.patch(`${process.env.MONGODB_URL}/api/searches/${gem.id}`, gem, {
                            headers: {
                                Authorization: `Bearer ${jwt}`
                            },
                        })
                    }
                    else {
                        axios.put(
                            `${process.env.ELASTIC_SERACH_LAMBDA_URL}/${result.id}`,
                            {
                                gem,
                                userId
                            }
                        )
                    }
                })
            })

        return "Success";
    } catch (error) {
        console.log("error===>", error);
        return error;
    }
}

exports.deleteElasticData = (id, userId) => {
    // if (process.env.NODE_ENV !== "production") return
    try {
        if (process.env.NODE_ENV === 'development') return "success"
        strapi.db.query('api::plan-service.plan-service').findOne({
            where: { author: userId }
        }).then((userPlanService) => {
            if (!userPlanService.is_advanced_search) {
                // Query from mongodb
                const jwt = getService('jwt').issue({ id: userId });
                axios.delete(`${process.env.MONGODB_URL}/api/searches/${id}`, {
                    headers: {
                        Authorization: `Bearer ${jwt}`
                    },
                })
            }
            else {
                axios.delete(
                    `${process.env.ELASTIC_SERACH_LAMBDA_URL}/${id}`
                )
            }
        })

        return "Success"
    } catch (error) {
        console.log("error===>", error);
        return error;
    }
}

exports.deleteBulkElasticData = (id, userId) => {
    // if (process.env.NODE_ENV !== "production") return
    try {
        if (process.env.NODE_ENV === 'development') return "success"
        
        strapi.db.query('api::plan-service.plan-service').findOne({
            where: { author: userId }
        }).then((userPlanService) => {
            if (!userPlanService.is_advanced_search) {
                // Query from mongodb
                const jwt = getService('jwt').issue({ id: userId });
                axios.delete(`${process.env.MONGODB_URL}/api/searches/bulk-delete?searchIds=${id.join(",")}`, {
                    headers: {
                        Authorization: `Bearer ${jwt}`
                    },
                })
            }
            else {
                axios.delete(
                    `${process.env.ELASTIC_SERACH_LAMBDA_URL}/bulk?ids=${id.join(",")}`
                )
            }
        })

        return "Success"
    } catch (error) {
        console.log("error===>", error);
        return error;
    }
}

exports.updateCollection_gems = async (data) => {
    try {
        const collId = data.params?.data?.collection_gems
        const collection = await strapi.entityService.findOne("api::collection.collection", collId, {
            populate: {
                gems: {
                    fields: ["id", "title", "slug"]
                }
            }
        })

        collName = collection.name
        if (collection && collection.gems) {
            await strapi.entityService.update("api::collection.collection", collId, {
                data: {
                    gems: [...collection.gems, data.result?.id]
                }
            })
        }

        return "Success";
    } catch (error) {
        console.log("updateCollection_gems error===>", error);
        return error;
    }
}

exports.domainmanagerData = async (data) => {
    try {
        const dUrl = await standardAPI(data.url);
        const domain = new URL(dUrl);
        const subDomainDetails = parse(data.url);
        const domainUrl = domain.protocol + '//' + subDomainDetails.domain + '/';
        const d = await strapi.db.query("api::domain-manager.domain-manager").findOne({
            where: {
                url: data.url
            },
            populate: {
                gems: {
                    select: ["id"]
                }
            }
        })
        if (d) {
            await strapi.entityService.update("api::domain-manager.domain-manager", d.id, {
                data: {
                    gems: [...d.gems, data.id]
                }
            })
        } else {

            const twitterRegex = /^https?:\/\/(www\.)?twitter\.com\/[A-Za-z0-9_]{1,15}$/i;
            const githubProfileRegex = /^https:\/\/github\.com\/[A-Za-z0-9-]+$/i;
            const redditProfileRegex = /^https:\/\/(www\.)?reddit\.com\/user\/[A-Za-z0-9_-]+\/?$/i;
            const mediumProfileRegex = /^https:\/\/medium\.com\/@[\w.-]+$/i;

            const isProfileUrl = twitterRegex.test(data.url) || githubProfileRegex.test(data.url) || redditProfileRegex.test(data.url) || mediumProfileRegex.test(data.url)

            let DomainType
            if (isProfileUrl) {
                DomainType = "Profile"
            } else if (domain.pathname.length) {
                DomainType = "URL"
            } else if (subDomainDetails.subdomain) {
                DomainType = "Subdomain"
            } else {
                DomainType = "Domain"
            }

            const createDomainDetails = await strapi.entityService.create("api::domain-manager.domain-manager", {
                data: {
                    url: data.url.toLowerCase(),
                    title: data.title,
                    description: data.description,
                    // DomainType: domain.pathname.length > 1 ? "URL" : subDomainDetails.subdomain ? "Subdomain" : "Domain",
                    DomainType,
                    domainName: subDomainDetails.domain,
                    gems: data.id,
                    publishedAt: new Date().toISOString()
                }
            })
            if (domain.pathname.length > 1) {
                let parentUrl

                if (data.url.includes("twitter.com")) parentUrl = domain.origin + domain.pathname.split('/').slice(0, 2).join('/') + '/';

                if (data.url.includes("github.com")) parentUrl = domain.origin + '/' + domain.pathname.split('/').slice(1, 2).join('/') + '/';

                if (data.url.includes("reddit.com")) parentUrl = domain.origin + domain.pathname.split('/').slice(0, 3).join('/') + '/';

                if (data.url.includes("medium.com")) parentUrl = domain.origin + domain.pathname.split('/').slice(0, 2).join('/') + '/'

                let filters = DomainType === "Profile" ? { url: domainUrl } : { url: parentUrl.toLowerCase() }

                const domainDetails = await strapi.entityService.findMany("api::domain-manager.domain-manager",
                    {
                        filters,
                    }
                )

                await strapi
                    .entityService.update("api::domain-manager.domain-manager", createDomainDetails.id, {
                        data: {
                            MainDomain: domainDetails[0].id,
                        }
                    })
            } else {
                const mainDomain = await strapi.db.query("api::domain-manager.domain-manager").findOne(
                    {
                        where: { domainName: subDomainDetails.domain },
                    }
                )
                const url = parse(data.url);
                let mainDomainId
                if (url.subdomain.length <= 1) mainDomainId = mainDomain.id;

                if (subDomainDetails.subdomain.length > 1) {
                    await strapi.entityService.update(
                        "api::domain-manager.domain-manager",
                        createDomainDetails.id,
                        {
                            data: {
                                MainDomain: mainDomainId,
                            },
                        }
                    );
                } else {
                    const urlid = await strapi.entityService.findMany("api::domain-manager.domain-manager",
                        {
                            filters: { domainName: subDomainDetails.domain, DomainType: { $ne: "Domain" } },
                        }
                    );
                    let result = urlid.map(({ id }) => id);
                    await strapi.entityService.update("api::domain-manager.domain-manager", createDomainDetails.id,
                        {
                            data: {
                                URLs: result,
                            },
                        }
                    );
                }
            }
        }

        return "success"
    } catch (error) {
        console.log("domainmanagerData error====>", error);
    }
}

exports.createPromptBuilder = async (userId, data) => {
    try {
        console.log("testoifkwnoikvhjd", data);
        const prompt = data?.media?.expander ? data.media.expander.find((d) => d.type === "prompt").plainText : data?.expander ? data.expander.find((d) => d.type === "prompt").plainText : null
        await strapi.entityService.create("api::prompt-builder.prompt-builder", {
            data: {
                name: data?.title,
                prompt,
                author: userId,
                gem: data?.id,
                share_type: data?.isPublicPrompt === true ? "Public" : "Private",
                isApproved: false,
                icon: data?.metaData?.icon?.icon ? data?.metaData?.icon?.icon : "https://d3jrelxj5ogq5g.cloudfront.net/webapp/logo192.png",
                publishedAt: new Date().toISOString()
            }
        })

    } catch (error) {
        return error;
    }
}

exports.updatePromptBuilder = async (userId, data) => {

    // const prompt = data.media.expander.find((d) => d.type === "prompt").plainText
    const prompt = data?.media?.expander ? data.media.expander.find((d) => d.type === "prompt").plainText : data?.expander ? data.expander.find((d) => d.type === "prompt").plainText : null

    const gem = await strapi.entityService.findOne("api::gem.gem", data.id, {
        fields: ["id", "title", "slug"],
        populate: {
            prompt: {
                fields: ["id"]
            }
        }
    })
    if (!gem?.prompt) return
    await strapi.entityService.update("api::prompt-builder.prompt-builder", gem.prompt.id, {
        data: {
            name: data?.title,
            prompt,
            // author: userId,
            gem: data?.id,
            share_type: data?.isPublicPrompt === true ? "Public" : "Private",
            icon: data?.metaData?.icon ? Array.isArray(data?.metaData?.icon) ? data?.metaData?.icon[0] : data?.metaData?.icon?.icon : "https://d3jrelxj5ogq5g.cloudfront.net/webapp/logo192.png",
            // isApproved: false,
            // publishedAt: new Date().toISOString()
        }
    })
}

exports.microlinkAndIframelyDetails = async (gemResult, userId) => {
    try {
        const gem = await strapi.entityService.findOne("api::gem.gem", gemResult.id, {
            fields: ["id", "title", "url", "socialfeed_obj", "slug"]
        })
        const iframely = await axios({
            method: "get",
            headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'identity'
            },
            url: `https://iframe.ly/api/iframely?url=${gem.url}/&api_key=${process.env.IFRAMELY_API_KEY}&iframe=1&omit_script=1`
        })

        const { data } = await axios.get(`https://pro.microlink.io?url=${gem.url}`, {
            headers: {
                'x-api-key': process.env.MICROLINK_API_KEY,
            }
        })

        const author = iframely?.data?.meta?.author || data?.data?.author;
        const date = data?.data?.date || data?.headers.date;
        // const medias = gem.socialfeed_obj?.medias?.length > 0 ? gem.socialfeed_obj?.medias : [{url: data?.data?.image?.url}];
        const medias = gem.socialfeed_obj?.medias?.length > 0 ? gem.socialfeed_obj?.medias : [];
        const text = iframely?.data?.meta?.title || data?.data?.title;
        const url = data?.url || (iframely?.data?.url?.endsWith("/") ? iframely?.data?.url?.slice(0, -1) : iframely?.data?.url);

        let socialObj = gem.socialfeed_obj ? { ...gem.socialfeed_obj } : {}
        socialObj = {
            ...socialObj,
            authorDisplayName: author,
            date,
            medias,
            text,
            tweet_url: url,
            user: socialObj.user 
                ? { 
                    ...socialObj.user, 
                    profile_url: iframely?.data?.meta?.author_url, 
                    name: iframely?.data?.meta?.author }
                : {profile_url: iframely?.data?.meta?.author_url, 
                    name: iframely?.data?.meta?.author }
        }

        let newProfileSocialFeed = null;
        const profileImgUrl      = socialObj?.profile_image_url || socialObj?.image || socialObj?.user?.profile_image_url || socialObj?.socialUserObj?.profile_image_url;

        if (profileImgUrl && userId) {
            newProfileSocialFeed = await strapi.service('api::gem.update-save-img').updateSaveImg(profileImgUrl, gemResult.id, userId)
        }

        if (newProfileSocialFeed) {
            if (socialObj?.profile_image_url) {
                socialObj = {
                    ...socialObj,
                    profile_image_url: newProfileSocialFeed,
                    fallbackProfileImage: profileImgUrl
                }
            }

            if (socialObj?.image) {
                socialObj = {
                    ...socialObj,
                    image: newProfileSocialFeed,
                    fallbackProfileImage: profileImgUrl
                }
            }

            if (socialObj?.user?.profile_image_url) {
                socialObj = {
                    ...socialObj,
                    user: {
                        ...socialObj.user,
                        profile_image_url: newProfileSocialFeed,
                        fallbackProfileImage: profileImgUrl
                    }
                }
            }

            if (socialObj?.socialUserObj?.profile_image_url) {
                socialObj = {
                    ...socialObj,
                    socialUserObj: {
                        ...socialObj.socialUserObj,
                        profile_image_url: newProfileSocialFeed,
                        fallbackProfileImage: profileImgUrl
                    }
                }
            }
        }

        let newMediaSocialFeed = null;
        const mediaUrl = socialObj?.media
        if (mediaUrl && userId) {
            newMediaSocialFeed = await strapi.service('api::gem.update-save-img').updateSaveImg(mediaUrl, gemResult.id, userId)
            socialObj = {
                ...socialObj,
                media: newMediaSocialFeed,
                mediaFallBack: mediaUrl
            }
        }

        let socialMedias = socialObj?.medias || []
        if (socialMedias.length > 0 && userId) {
            for (let i = 0; i < socialMedias.length; i++) {
                const mediaUrl = socialMedias[i]?.url
                const newMediaSocialFeed = await strapi.service('api::gem.update-save-img').updateSaveImg(mediaUrl, gemResult.id, userId)
                socialMedias[i] = {
                    ...socialMedias[i],
                    url: newMediaSocialFeed
                }
            }
            socialObj = {
                ...socialObj,
                medias: socialMedias
            }
        }

        console.log("socialObj===>", socialObj)

        await strapi.entityService.update("api::gem.gem", gemResult.id, {
            data: {
                socialfeed_obj: socialObj
            }
        })

    } catch (error) {
        console.log("micro error===>", error);    
        return error;
    }
}

const client = new ApifyClient({
  token: process.env.APIFY_KEY,
});

async function fetchInstagramData(username) {
  const input = {
      directUrls: [`https://www.instagram.com/${username}/`],
      resultsType: "details",
      resultsLimit: 200,
      addParentData: false,
      searchType: "hashtag",
      searchLimit: 1,
  };

  try {
      // Run the Actor and wait for it to finish
      const run = await client.actor(process.env.INSTAGRAM_TOKEN).call(input);

      // Fetch and process Actor results from the run's dataset
      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      let allResults = items[0];
      let name = items[0].fullName;
      let description = items[0].biography;
      let totalFollowers = items[0].followersCount;
      let totalPosts = items[0].postsCount;
      let highlightReelCount = items[0].highlightReelCount;
      let igtvCount = items[0].igtvVideoCount;

      let totalComments = 0;
      let totalLikes = 0;
      let numberOfPosts = items[0].latestPosts.length;

      items[0].latestPosts.forEach((post) => {
          totalComments += post.commentsCount;
          totalLikes += post.likesCount;
      });

      // Calculate the averages
      let averageComments = totalComments / numberOfPosts;
      let averageLikes = totalLikes / numberOfPosts;
      let engagementScore = averageLikes + averageComments;

      const data = {
          description,
          totalFollowers,
          totalPosts,
          highlightReelCount,
          igtvCount,
          engagementScore,
          name,
          allResults,
      };

      return data;
  } catch (error) {
      console.error("Error fetching Instagram data:", error);
      throw error;
  }
}

async function fetchTiktokData(username) {
  const input = {
      startUrls: [`https://www.tiktok.com/@${username}`],
      maxItems: 1,
      getFollowers: true,
      getFollowing: true,
      customMapFunction: (object) => {
          return { ...object };
      },
  };

  try {
      // Run the Actor and wait for it to finish
      const run = await client.actor(process.env.TIKTOK_TOKEN).call(input);

      // Fetch and process Actor results from the run's dataset
      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      let allResults = items[0];
      let name = items[0].nickname;
      let followers = items[0].followers;
      let totalLikes = items[0].likes;
      let totalVideos = items[0].videos;
      let description = items[0].bio;
      let likes = items[0].likes;
      let videos = items[0].videos;
      let following = items[0].following;

      const likesWeight = 0.4;
      const videosWeight = 0.3;
      const followersWeight = 0.2;
      const followingWeight = 0.1;

      // Calculate engagement score
      const engagementScore =
          likesWeight * likes +
          videosWeight * videos +
          followersWeight * followers -
          followingWeight * following;

      const data = {
          followers,
          totalLikes,
          totalVideos,
          description,
          allResults,
          name,
          engagementScore,
      };

      return data;
  } catch (error) {
      console.error("Error fetching Tiktok data:", error);
      throw error;
  }
}

async function fetchYoutubeData(username) {
  const input = {
      startUrls: [
          {
              url: `https://www.youtube.com/@${username}`,
          },
      ],
      maxResults: 1,
  };

  try {
      // Run the Actor and wait for it to finish
      const run = await client.actor(process.env.YOUTUBE_TOKEN).call(input);

      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      let allResults = items[0];
      let name = items[0].channelName;
      let subscriberCount = items[0]?.numberOfSubscribers;
      let videoCount = items[0]?.channelTotalVideos;
      let description = items[0]?.channelDescription;
      let viewsCount = parseInt(items[0]?.channelTotalViews.replace(/,/g, ""));
      let avgViews = viewsCount / videoCount;
      let avgSubs = subscriberCount / videoCount;
      let engagementScore = Math.round(avgViews + avgSubs);
      const data = {
          subscriberCount,
          videoCount,
          description,
          viewsCount,
          engagementScore,
          allResults,
          name,
      };

      return data;
  } catch (error) {
      console.error("Error fetching Tiktok data:", error);
      throw error;
  }
}

async function fetchTwitterData(username) {
  const input = {
      handles: [username],
      tweetsDesired: 100,
      addUserInfo: true,
      startUrls: [],
      proxyConfig: {
          useApifyProxy: true,
      },
  };

  try {
      // Run the Actor and wait for it to finish
      const run = await client.actor(process.env.TWITTER_TOKEN).call(input);

      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      let allResults = items[0];
      let name = items[0].user.name;
      let followers = items[0].user.followers_count;
      let bannerUrl = items[0].user.profile_banner_url;
      let profilePicUrl = items[0].user.profile_image_url_https;
      let totalPosts = items[0].user.statuses_count;
      let totalFavourites = items[0].user.favourites_count;
      let replyCount = items[0].reply_count;
      let viewCount = items[0].view_count;
      let retweetCount = items[0].retweet_count;
      let engagementScore =
          totalFavourites + replyCount + viewCount + retweetCount;

      const data = {
          followers,
          bannerUrl,
          profilePicUrl,
          totalPosts,
          engagementScore,
          allResults,
          name,
      };

      return data;
  } catch (error) {
      console.error("Error fetching Twitter data:", error);
      throw error;
  }
}

exports.domaindata = async (url, data, isUpdate, dId, socialSite, apify, id, platform) => {
    try {

        let responseObject;
        if(socialSite && apify) {

            let profileData;
            if (platform === "instagram") {
                profileData = await fetchInstagramData(id);
            } else if (platform === "tiktok") {
                profileData = await fetchTiktokData(id);
            } else if (platform === "youtube") {
                profileData = await fetchYoutubeData(id);
            } else if (platform === "twitter") {
                profileData = await fetchTwitterData(id);
            }

            if (profileData) {
                responseObject = {
                    status: "success",
                    data: {
                        id: id,
                        platform: platform,
                        profileData: profileData,
                    },
                };
            } else {
                responseObject = {
                    status: "failed",
                    data: {
                        id: id,
                        platform: platform,
                    },
                };
            }
        }

        if(isUpdate) {
            await strapi.entityService.update("api::domain-manager.domain-manager", dId, {
                data: {
                    iframely: data.iframely,
                    microlink: data.microlink,
                    apify: responseObject
                }
            })
            return
        }

        await strapi.entityService.create("api::domain-manager.domain-manager", {
            data: {
                url,
                iframely: data.iframely,
                microlink: data.microlink,
                apify: responseObject,
                publishedAt: new Date().toISOString() 
            }
        })

    } catch (error) {
        return error
    }
}

exports.updateEmptyUrl = async (name, id, title, slug) => {
    try {
        // const slug = slugify(title)

        const url = `${process.env.REDIRECT_URI}/u/${name}/g/${id}/${slug}`
        await strapi.entityService.update("api::gem.gem", id, {
            data: {
                url,
                isUrlUpdate: true
            }
        });

        return "success";
    } catch (error) {
        return error.message;
    }
}

exports.createCopyForAILibrary = async (data) => {
    try {
        let promptData = data.data;
        // const aiLibraryId = await strapi.entityService.findMany("api::config-limit.config-limit")
        const aiLibraryId = await strapi.db.query("api::config-limit.config-limit").findOne({
            where: { aiPromptLibraryId: { $notNull: true } }
        })
        
        if (parseInt(promptData?.collection_gems) === parseInt(aiLibraryId?.aiPromptLibraryId)) return null

        delete data?.collection_gems
        delete data?.createdAt
        delete data?.updatedAt

        promptData.collection_gems = aiLibraryId.aiPromptLibraryId
        promptData.publishedAt = new Date().toISOString()
        promptData.copyGem = true

        await strapi.entityService.create("api::gem.gem", {
            data: promptData
        })

    } catch (error) {
        return error.messsage;
    }
}