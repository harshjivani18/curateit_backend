const request = require('request');
const getColors = require("get-image-colors");
const { Configuration, OpenAIApi } = require("openai");
const moment = require("moment");
const axios = require("axios");
const puppeteer = require('puppeteer');
const mime = require('mime-types');
const fs = require('fs');
const FormData = require('form-data');
const slugify = require('slugify');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const getBase64MimeType = (encoded) => {
    var result = null;

    if (typeof encoded !== 'string') {
        return result;
    }

    var mime = encoded.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);

    if (mime && mime.length) {
        result = mime[1];
    }

    return result;
}

const awaitRequest = (options) => {
    return new Promise((resolve, reject) => {
        request(options, function (error, response, body) {
            if (error) reject(error);
            resolve(body);
        });
    });
};

const getURLBufferData = async (url) => {
    const buffer = await axios.get(url, { responseType: "arraybuffer" });

    return {
        data: buffer.data,
        header: buffer.headers['content-type'],
        filename: url.split('/').pop()
    }
}

const getBase64FromImgURL = (url) => {
    return new Promise((resolve, reject) => {
        if (url.startsWith("data:")) {
            resolve(url);
            return
        }
        if (url.includes(".svg")) {
            const data      = fs.readFileSync(url)
            const svgBase   = new Buffer(data.toString(), 'base64')
            resolve(`data:image/svg+xml;base64,${svgBase}`)
            return
        }
        request({ url, encoding: null }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                const base64 = `data:${response.headers["content-type"] || "image/png"};base64,${Buffer.from(body).toString('base64')}`;
                resolve(base64);
            } else {
                reject(error);
            }
        });
    });
}

const setUserSeoInformation = (user) => {
    strapi.db.query('api::internal-ai-prompt.internal-ai-prompt').findOne({
        where: { promptType: 'SEO Prompts', seo_prompt_type: "user" }
    }).then((res) => {
        const configuration = new Configuration({
            apiKey: process.env.PROD_OPENAI_API_KEY,
        });
        const openai = new OpenAIApi(configuration);
        const name = user?.firstname && user?.lastname ? `${user?.firstname} ${user?.lastname}` : user?.username;
        openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: res?.prompt?.replace("{name}", name) }],
        }, { responseType: "json" }).then((completion) => {

            let jsonObject = JSON.parse(completion?.data?.choices[0]?.message?.content);
            if (jsonObject) {
                jsonObject = {
                    ...jsonObject,
                    seo: {
                        ...jsonObject?.seo,
                        slug: slugify(jsonObject?.seo?.title?.slice(0, 70) || "", { lower: true, remove: /[0-9&,+()$~%.'":*?<>{}]/g }),
                        canonical: `${process.env.REDIRECT_URI}/u/${user?.username}`
                    }
                }
                strapi.query('plugin::users-permissions.user').update({
                    where: { id: user.id },
                    data: {
                        seo: jsonObject
                    }
                })
            }
        })
    })
}

const setGemSeoInformation = (gem, username) => {
    return new Promise((resolve, reject) => {
        strapi.db.query('api::internal-ai-prompt.internal-ai-prompt').findOne({
            where: { promptType: 'SEO Prompts', seo_prompt_type: "gem" }
        }).then((res) => {
            const configuration = new Configuration({
                apiKey: process.env.PROD_OPENAI_API_KEY,
            });
            const openai = new OpenAIApi(configuration);
            openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: res?.prompt?.replace("{gem_name}", gem?.title).replace("{gem_url}", gem?.url).replace("{gem_type}", gem?.media_type) }],
            }).then((completion) => {
                let jsonObject = JSON.parse(completion?.data?.choices[0]?.message?.content);
                if (jsonObject) {
                    jsonObject = {
                        ...jsonObject,
                        seo: {
                            ...jsonObject?.seo,
                            slug: gem?.slug,
                            canonical: `${process.env.REDIRECT_URI}/u/${username}/g/${gem?.id}/${gem?.slug}`
                        }
                    }
                    if (jsonObject?.opengraph && jsonObject?.opengraph?.image) {
                        jsonObject = {
                            ...jsonObject,
                            opengraph: {
                                ...jsonObject?.opengraph,
                                image: gem?.metaData?.covers?.length > 0 ? gem?.metaData?.covers[0] : `${process.env.AWS_S3_STATIC_URL}/webapp/curateit-200x200.png`
                            }
                        }
                    }
                    strapi.entityService.update('api::gem.gem', gem.id, {
                        data: {
                            seo: jsonObject
                        },
                        populate: {
                            collection_gems: { fields: ["id", "seo", "avatar"] }
                        }
                    }).then((gemRes) => {
                        const collImg = gemRes?.collection_gems?.avatar?.icon;
                        if (gemRes?.collection_gems?.seo && collImg !== gemRes?.collection_gems?.seo?.opengraph?.image) {
                            let seo = gemRes?.collection_gems?.seo;
                            if (seo?.opengraph && seo?.opengraph?.image) {
                                seo = {
                                    ...seo,
                                    opengraph: {
                                        ...seo?.opengraph,
                                        image: gemRes?.collection_gems?.avatar?.type === "image" ? gemRes?.collection_gems?.avatar?.icon : gem?.metaData?.covers?.length > 0 ? gem?.metaData?.covers[0] : seo?.opengraph?.image
                                    }
                                }
                                strapi.entityService.update('api::collection.collection', gemRes?.collection_gems?.id, {
                                    data: {
                                        seo
                                    }
                                }).then((gemRes) => {
                                    resolve(jsonObject)
                                })
                            }
                            else {
                                resolve(jsonObject)
                            }
                        }
                        else {
                            resolve(jsonObject)
                        }
                    });
                }
            })
            .catch((err) => {
                console.log("Error ==>", err?.response?.data?.error)
                resolve(500)
            })
        })
    })
}

const setTagSeoInformation = (tag, username) => {
    return new Promise((resolve, reject) => {
        strapi.db.query('api::internal-ai-prompt.internal-ai-prompt').findOne({
            where: { promptType: 'SEO Prompts', seo_prompt_type: "tag" }
        }).then((res) => {
            const configuration = new Configuration({
                apiKey: process.env.PROD_OPENAI_API_KEY,
            });
            const openai = new OpenAIApi(configuration);
    
            openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: res?.prompt?.replace("{tag_name}", tag?.tag) }],
            }).then((completion) => {
                let jsonObject = JSON.parse(completion?.data?.choices[0]?.message?.content);
                if (jsonObject) {
                    jsonObject = {
                        ...jsonObject,
                        seo: {
                            ...jsonObject?.seo,
                            slug: tag?.slug,
                            canonical: `${process.env.REDIRECT_URI}/u/${username}/tags/${tag?.id}/${tag?.slug}`
                        }
                    }
                    if (jsonObject?.opengraph && jsonObject?.opengraph?.image) {
                        jsonObject = {
                            ...jsonObject,
                            opengraph: {
                                ...jsonObject?.opengraph,
                                image: tag?.avatar ? tag?.avatar : `${process.env.AWS_S3_STATIC_URL}/webapp/curateit-200x200.png`
                            }
                        }
                    }
                    strapi.entityService.update('api::tag.tag', tag?.id, {
                        data: {
                            seo: jsonObject
                        }
                    }).then((tagRes) => {
                        resolve(jsonObject)
                    })
                }
            }).catch(err => {
                console.log("Error ==>", err?.response?.data?.error)
                resolve(500)
            })
        })
    })
}

const setCollectionSeoInformation = (collection, username) => {
    return new Promise((resolve, reject) => {
        strapi.db.query('api::internal-ai-prompt.internal-ai-prompt').findOne({
            where: { promptType: 'SEO Prompts', seo_prompt_type: "collection" }
        }).then((res) => {
            const configuration = new Configuration({
                apiKey: process.env.PROD_OPENAI_API_KEY,
            });
            const openai = new OpenAIApi(configuration);
            openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: res?.prompt?.replace("{collection_name}", collection?.name) }],
            }).then((completion) => {
                let jsonObject = JSON.parse(completion?.data?.choices[0]?.message?.content)
                if (jsonObject) {
                    jsonObject = {
                        ...jsonObject,
                        seo: {
                            ...jsonObject?.seo,
                            slug: collection?.slug,
                            canonical: `${process.env.REDIRECT_URI}/u/${username}/c/${collection?.id}/${collection?.slug}`
                        }
                    }
                    if (jsonObject?.opengraph && jsonObject?.opengraph?.image) {
                        jsonObject = {
                            ...jsonObject,
                            opengraph: {
                                ...jsonObject?.opengraph,
                                image: `${process.env.AWS_S3_STATIC_URL}/webapp/curateit-logo.png`
                            }
                        }
                    }
                    strapi.entityService.update("api::collection.collection", collection.id, {
                        data: {
                            seo: jsonObject
                        }
                    }).then((collectionRes) => {
                        resolve(jsonObject)
                    })
                }
            })
            .catch((err) => {
                console.log("Error ==>", err?.response?.data?.error)
                resolve(500)
            })
        })
    })
}

const getExtAndColors = async (url, isFetchImageColors = false) => {
    const col = []
    const buffer = await axios.get(url, { responseType: 'arraybuffer' });
    const ext = (!buffer.error) ? mime.extension(buffer.headers['content-type']) : getPathExtension(url);

    if (buffer.error) return null

    if (isFetchImageColors) {
        try {
            const colors = await getColors(buffer.data, ext === false ? "image/jpg" : `image/${ext === "jpeg" ? "jpg" : ext}`);
            const hexColor = [];
            colors.map(color => hexColor.push(color.hex()));
            col.push(
                {
                    url: url,
                    imageColor: hexColor
                }
            )
        }
        catch (err) {
            console.log("Error ==>", err.message)
        }
    }

    return {
        colors: col.length === 0 ? null : col,
        ext: ext,
        data: buffer.data,
        header: buffer.headers['content-type'],
        filename: `${Date.now()}.${ext === false ? 'jpg' : ext}`
    }
}

const imageColor = async (link, type) => {
    const col = [];
    const buffer = await axios.get(link, { responseType: 'arraybuffer' });
    const colors = await getColors(buffer.data, type === false ? "image/jpg" : `image/${type}`);

    const hexColor = [];
    colors.map(color => hexColor.push(color.hex()));
    col.push(
        {
            url: link,
            imageColor: hexColor
        }
    )
    return col;
};

const getPathExtension = (url) => {
    const path = url.split("/");
    const ext = path.length > 0 ? path[path.length - 1].split(".") : [];
    return ext.length > 0 ? ext[ext.length - 1] : "jpeg";
}

const openai = async (prompt) => {

    const configuration = new Configuration({
        apiKey: process.env.PROD_OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
    });
    console.log("OpenAI Response1", completion.data.choices[0].message.content)
    return completion.data.choices[0].message.content;
}

const updatePlanService = async (userId, module, usedLimit, remainLimit) => {
    let count
    // const planService = await strapi.db.query("api::plan-service.plan-service").findOne({
    //     where: { author: userId }
    // })
    if (module === 'collection') {
        count = await strapi.entityService.count("api::collection.collection", {
            filters: { author: userId }
        })

        await strapi.db.query('api::plan-service.plan-service').update({
            where: {
                author: userId
            },
            data: { coll_used: count }
        })
    } else if (module === 'tag') {
        count = await strapi.entityService.count("api::tag.tag", {
            filters: {
                users: {
                    id: {
                        $in: [userId]
                    }
                }
            }
        });

        await strapi.db.query('api::plan-service.plan-service').update({
            where: {
                author: userId
            },
            data: { tag_used: count }
        })

    } else if (module === 'speech') {
        // count = await strapi.entityService.count("api::text-to-speech.text-to-speech", {
        //     filters: { author: userId }
        // })

        await strapi.db.query('api::plan-service.plan-service').update({
            where: {
                author: userId
            },
            data: { speech_used: usedLimit, speech_remain: remainLimit }
        })
    } else if (module === 'ocr_image') {
        await strapi.db.query('api::plan-service.plan-service').update({
            where: {
                author: userId
            },
            data: { ocr_image_used: usedLimit }
        })
    } else if (module === 'audio') {

        await strapi.db.query('api::plan-service.plan-service').update({
            where: {
                author: userId
            },
            data: { audio_recording_used: usedLimit }
        })

    } else if (module === 'public_collection_tag') {

        const publicCollections = await strapi.entityService.count("api::collection.collection", {
            filters: { author: userId, sharable_links: { $notNull: true } }
        })

        const publicTags = await strapi.entityService.count("api::tag.tag", {
            filters: { users: userId, sharable_links: { $notNull: true } }
        })

        const usedLimit = (publicCollections ? parseInt(publicCollections) : 0) + (publicTags ? parseInt(publicTags) : 0)

        await strapi.db.query('api::plan-service.plan-service').update({
            where: {
                author: userId
            },
            data: { public_collection_and_tags_used: usedLimit }
        })

    } else if (module === 'team') {
        const planService = await strapi.db.query("api::plan-service.plan-service").findOne({
            where: { author: userId },
            populate: {
                related_plan: {
                    select: ["id", "display_name", "is_team_plan"]
                },
                subscription: {
                    select: ["id", "subscription_id"]
                }
            }
        })

        if (!planService?.related_plan?.is_team_plan) {
            const [membersCount, guestsCount] = await Promise.all([
                strapi.entityService.count("api::team.team", {
                    filters: { isMember: true, author: userId }
                }),
                strapi.entityService.count("api::team.team", {
                    filters: { isGuest: true, author: userId }
                })
            ])
            await strapi.db.query('api::plan-service.plan-service').update({
                where: {
                    author: userId
                },
                data: { 
                    included_members_used: membersCount, 
                    guest_users_used: guestsCount 
                }
            })
        } 
        else if (planService?.related_plan?.is_team_plan && planService?.subscription?.id) {
            const userobjs = await strapi.db.query("api::plan-service.plan-service").findMany({
                where: { subscription: planService?.subscription?.id },
                populate: {
                    author: {
                        select: ["id"]
                    }
                }
            })
            const [tMembersCount, tGuestsCount] = await Promise.all([
                strapi.entityService.count("api::team.team", {
                    filters: { isMember: true, author: { id: { $in: userobjs.map(u => u.author.id) } } }
                }),
                strapi.entityService.count("api::team.team", {
                    filters: { isGuest: true, author: { id: { $in: userobjs.map(u => u.author.id )}} }
                })
            ])
            await strapi.service('api::plan-service.migrate-user-service').updateAllMembersGuests(planService?.subscription?.id, tMembersCount, tGuestsCount)
        }


    } else {
        count = await strapi.entityService.count("api::gem.gem", {
            filters: { author: userId }
        })

        await strapi.db.query('api::plan-service.plan-service').update({
            where: {
                author: userId
            },
            data: { gem_used: count }
        })

    }
    // updatePlanService(userId, { coll_used: count })
    // await strapi.db.query('api::plan-service.plan-service').update({
    //     where: {
    //         author: userId
    //     },
    //     data: { ...updateData }
    // })
}

// const updateGemiScoreRecs = async (userId, updateData) => {
//     console.log("data");
//     await strapi.db.query('api::gamification-score.gamification-score').update({
//         where: {
//             author: userId
//         },
//         data: {
//             ...updateData
//         }
//     })
// }

const updateGemiScoreRecs = (userId, updateData) => {
    return new Promise((resolve, reject) => {
        strapi.db.query('api::gamification-score.gamification-score').update({
            where: {
                author: userId
            },
            data: {
                ...updateData
            }
        })
            .then((res) => {
                resolve(res)
            })
    })
}

const removeDuplicateObject = (inputArr) => {
    let uniqueObj = {};
    const newArrays = [];

    // Storing unique obj
    let uniqueId;
    for (let i in inputArr) {
        uniqueId = inputArr[i].id;
        if (!uniqueObj[uniqueId])
            uniqueObj[uniqueId] = inputArr[i];
    }

    // updating newArrays
    for (let i in uniqueObj) {
        newArrays.push(uniqueObj[i]);
    }
    return newArrays;
}

const collRelWithMultiGems = (inputArr) => {
    let uniqueObj = {};
    const newArrays = [];

    // Storing unique obj
    let uniqueId;
    for (let i in inputArr) {
        uniqueId = inputArr[i].id;
        if (!uniqueObj[uniqueId])
            uniqueObj[uniqueId] = { ...inputArr[i], gems: [] };
        else {
            let getExistingColl = uniqueObj[uniqueId];
            if (getExistingColl.gem_id !== inputArr[i].gem_id) {
                if (getExistingColl.gems.length > 0) {
                    getExistingColl = {
                        ...inputArr[i],
                        gems: [...getExistingColl.gems, inputArr[i]]
                    }
                } else {
                    getExistingColl = {
                        ...inputArr[i],
                        gems: [getExistingColl, inputArr[i]]
                    }
                }
                uniqueObj[uniqueId] = getExistingColl;
            }
        }
    }

    // updating newArrays
    for (let i in uniqueObj) {
        newArrays.push(uniqueObj[i]);
    }
    return newArrays;
}

const bookmarkUtils = (inputArr) => {
    return inputArr.filter((i) => i !== undefined ).map(bm => {
        return {
            ...bm,
            createdAt: moment(bm.createdAt).format('DD-MM-YYYY')
        }
    })
}

const filterByCF = (gems, groupBy) => {
    let groupingData = {};
    for (const gm of gems) {
        if (!gm?.custom_fields_obj) {
            if (!groupingData["no-group"]) {
                groupingData["no-group"] = {
                    name: `No ${groupBy}`,
                    grpData: [gm]
                };
            } else {
                const existsObj = groupingData["no-group"];
                const { grpData } = existsObj;
                const grpArr = [...grpData, gm];
                groupingData["no-group"] = { ...existsObj, grpData: grpArr };
            }
        } else {
            const customFdArr = gm?.custom_fields_obj;
            if (Array.isArray(customFdArr)) {
                const cusFd = customFdArr.find(cf => (cf?.name && (cf.name.toLowerCase() === groupBy.toLowerCase() && cf?.answer)));
                if (cusFd) {
                    if (!groupingData[cusFd.answer]) {
                        groupingData[cusFd.answer] = {
                            name: cusFd.answer,
                            grpData: [gm]
                        };
                    } else {
                        const existsObj = groupingData[cusFd.answer];
                        const { grpData } = existsObj;
                        const grpArr = [...grpData, gm];
                        groupingData[cusFd.answer] = { ...existsObj, grpData: grpArr };
                    }
                } else {
                    if (!groupingData["no-group"]) {
                        groupingData["no-group"] = {
                            name: `No ${groupBy}`,
                            grpData: [gm],
                        };
                    } else {
                        const existsObj = groupingData["no-group"];
                        const { grpData } = existsObj;
                        const grpArr = [...grpData, gm];
                        groupingData["no-group"] = { ...existsObj, grpData: grpArr };
                    }
                }
            } else {
                if (!groupingData["no-group"]) {
                    groupingData["no-group"] = {
                        name: `No ${groupBy}`,
                        grpData: [gm],
                    };
                } else {
                    const existsObj = groupingData["no-group"];
                    const { grpData } = existsObj;
                    const grpArr = [...grpData, gm];
                    groupingData["no-group"] = { ...existsObj, grpData: grpArr };
                }
                uniqueObj[uniqueId] = getExistingColl;
            }
        }
    }
    return groupingData;
}

const checkWebsites = async (url) => {
    try {
        const checkerLib = await import("linkinator")
        const checker = new checkerLib.LinkChecker()
        const test  = await checker.check({ path: url });
        const obj = test?.links?.find((link) => {
            return link?.url === url && !link?.parent
        })
        return { status: obj?.status, state: obj?.state }
    } catch (error) {
        return { status: 500, error: error.message }
    }
}

const accessPermissions = (accessType) => {
    let permissions;
    if (accessType === 'editor') {
        permissions = {
            subCollections: {
                canCreate: true,
                canRead: true,
                canUpdate: true,
                canDelete: true,
                canShare: true
            },
            gems: {
                canCreate: true,
                canRead: true,
                canUpdate: true,
                canDelete: true,
                canShare: true
            },
            existingCollections: {
                canCreate: false,
                canRead: true,
                canUpdate: true,
                canDelete: false,
                canShare: true
            }
        }

    } else if (accessType === 'viewer') {
        permissions = {
            subCollections: {
                canCreate: false,
                canRead: true,
                canUpdate: false,
                canDelete: false,
                canShare: false
            },
            gems: {
                canCreate: false,
                canRead: true,
                canUpdate: false,
                canDelete: false,
                canShare: false
            },
            existingCollections: {
                canCreate: false,
                canRead: true,
                canUpdate: false,
                canDelete: false,
                canShare: false
            }
        }
    } if (accessType === 'owner') {
        permissions = {
            subCollections: {
                canCreate: true,
                canRead: true,
                canUpdate: true,
                canDelete: true,
                canShare: true
            },
            gems: {
                canCreate: true,
                canRead: true,
                canUpdate: true,
                canDelete: true,
                canShare: true
            },
            existingCollections: {
                canCreate: false,
                canRead: true,
                canUpdate: true,
                canDelete: true,
                canShare: true
            }
        }

    }

    return permissions
}

const accessTagPermissions = (accessType) => {
    let permissions;
    if (accessType === 'editor') {
        permissions = {
            subCollections: {
                canCreate: true,
                canRead: true,
                canUpdate: true,
                canDelete: true,
                canShare: true
            },
            gems: {
                canCreate: true,
                canRead: true,
                canUpdate: true,
                canDelete: true,
                canShare: true
            },
            collection: {
                canCreate: true,
                canRead: true,
                canUpdate: true,
                canDelete: true,
                canShare: true
            },
            existingCollections: {
                canCreate: false,
                canRead: true,
                canUpdate: true,
                canDelete: false,
                canShare: true
            }
        }

    } else if (accessType === 'viewer') {
        permissions = {
            subCollections: {
                canCreate: false,
                canRead: true,
                canUpdate: false,
                canDelete: false,
                canShare: false
            },
            gems: {
                canCreate: false,
                canRead: true,
                canUpdate: false,
                canDelete: false,
                canShare: false
            },
            collection: {
                canCreate: false,
                canRead: true,
                canUpdate: false,
                canDelete: false,
                canShare: false
            },
            existingCollections: {
                canCreate: false,
                canRead: true,
                canUpdate: false,
                canDelete: false,
                canShare: false
            }
        }
    } if (accessType === 'owner') {
        permissions = {
            subTag: {
                canCreate: true,
                canRead: true,
                canUpdate: true,
                canDelete: true,
                canShare: true
            },
            gems: {
                canCreate: true,
                canRead: true,
                canUpdate: true,
                canDelete: true,
                canShare: true
            },
            collection: {
                canCreate: true,
                canRead: true,
                canUpdate: true,
                canDelete: true,
                canShare: true
            },
            existingTag: {
                canCreate: false,
                canRead: true,
                canUpdate: true,
                canDelete: true,
                canShare: true
            }
        }

    }

    return permissions
}

const areCollectionIdSame = (array) => {
    return array.every(element => element === array[0]);
}

const getFullScreenshot = async (gem) => {
    if (!gem.url.startsWith("http")) {
        return { status: 200, message: "Success" };
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    let screenshot = null;

    await page.goto(gem.url, { waitUntil: 'networkidle2' });

    screenshot = await page.screenshot({
        fullPage: true,
        type: 'jpeg'
    });

    browser.close();

    const finalURL = await strapi.service("api::upload-file.upload-file").uploadFileFrombase64(screenshot, `common/screenshots/${Date.now()}.jpg`)
    gem.metaData.app_screenshot = finalURL;
    const createdgem = await strapi.entityService.update('api::gem.gem', gem.id, {
        data: {
            metaData: gem.metaData
        }
    })
    return { status: 200, message: "Success" };
}

const sidebarAppData = [
    {
        name: "Airtable",
        url: "https://www.airtable.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/Airtable.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "General"
    },
    {
        name: "Calendar",
        url: "https://calendar.google.com/calendar/u/0/r",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/Calendar.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Google Apps"
    },
    {
        name: "Apple Music",
        url: "https://music.apple.com/us/browse",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/AppleMusic.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Music"
    },
    {
        name: "Google Keep",
        url: "https://keep.google.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/GoogleKeeps.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Google Apps"
    },
    {
        name: "WhatsApp",
        url: "https://www.whatsapp.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/WhatsApp.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Social Networks"
    },
    {
        name: "ChatSonic",
        url: "https://writesonic.com/chat",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/Chatsonic.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "AI"
    },
    {
        name: "ChatGPT",
        url: "https://chat.openai.com",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/Chatgpt.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "AI"
    },
    {
        name: "Bard",
        url: "https://bard.google.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/Bard.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "AI"
    },
    {
        name: "Llama",
        url: "https://www.llama2.ai/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/Llama.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "AI"
    },
    {
        name: "Claude",
        url: "https://claude.ai/chats",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/Claude.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "AI"
    },
    {
        name: "Instagram",
        url: "https://www.instagram.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/Instagram.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Social Networks"
    },
    {
        name: "Tiktok",
        url: "https://www.tiktok.com/en/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/TikTok.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Social Networks"
    },
    {
        name: "Telegram",
        url: "https://telegram.org/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/Telegram.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Social Networks"
    },
    {
        name: "Twitter",
        url: "https://twitter.com/home",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/Twitter.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Social Networks"
    },
    {
        name: "Todoist",
        url: "https://todoist.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/ToDoist.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "General"
    },
    {
        name: "Facebook Messenger",
        url: "https://www.messenger.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/FacebookMessenger.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Messengers"
    },
    {
        name: "Outlook",
        url: "https://outlook.live.com/owa/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/Outlook.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "General"
    },
    {
        name: "Spotify",
        url: "https://open.spotify.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/Spotify.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Music"
    },
    {
        name: "Youtube",
        url: "https://www.youtube.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/Youtube.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Google Apps"
    },
    {
        name: "Youtube Music",
        url: "https://music.youtube.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/YoutubeMusic.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Music"
    },
    {
        name: "Gmail",
        url: "https://mail.google.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/Gmail.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Google Apps"
    },
    {
        name: "LinkedIn",
        url: "https://in.linkedin.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/Linkedin.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Social Networks"
    },
    {
        name: "Notion",
        url: "https://www.notion.so/login",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/Notion.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "General"
    },
    {
        name: "ClickUp",
        url: "https://app.clickup.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/Clickup.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "General"
    },
    {
        name: "Github",
        url: "https://github.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/Github.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "General"
    },
    {
        name: "Linear",
        url: "https://linear.app/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/Linear.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "General"
    },
    {
        name: "Google Tasks",
        url: "https://tasksboard.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/GoogleTasks.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Google Apps"
    },
    {
        name: "Find Friends",
        url: "https://www.apple.com/icloud/find-my/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/find_friends.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "iCloud"
    },
    {
        name: "Contacts",
        url: "https://contacts.google.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/contacts.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "iCloud"
    },
    {
        name: "Find iPhone",
        url: "https://www.apple.com/in/icloud/find-my/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/find_my_iphone.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "iCloud"
    },
    {
        name: "iCloud",
        url: "https://www.icloud.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/icloud_drive.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "iCloud"
    },
    {
        name: "Keynote",
        url: "https://www.apple.com/in/keynote/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/keynote.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "iCloud"
    },
    {
        name: "Mail",
        url: "https://www.icloud.com/email",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/mail.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "iCloud"
    },
    {
        name: "Notes",
        url: "https://www.icloud.com/notes",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/notes.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "iCloud"
    },
    {
        name: "Numbers",
        url: "https://www.apple.com/numbers/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/numbers.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "iCloud"
    },
    {
        name: "Pages",
        url: "https://www.apple.com/in/pages/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/pages.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "iCloud"
    },
    {
        name: "Photos",
        url: "https://www.google.com/photos/about/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/photos.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "iCloud"
    },
    {
        name: "Reminders",
        url: "https://www.apple.com/ios/reminders/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/reminders.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "iCloud"
    },
    {
        name: "Settings",
        url: "https://www.icloud.com/settings",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/settings.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "iCloud"
    },
    {
        name: "Prime Video",
        url: "https://www.primevideo.com/offers/nonprimehomepage/ref=dv_web_force_root",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/amazon-prime.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "BBC One",
        url: "https://www.bbc.co.uk/iplayer",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/bbc-one.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "CBS",
        url: "https://www.cbs.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/cbs.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "CINEMAX",
        url: "https://www.cinemax.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/cinemax.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "Dailymotion",
        url: "https://www.dailymotion.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/dailymotion.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "DAZN",
        url: "https://www.dazn.com/en-IN/welcome",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/DAZN.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "Discovery",
        url: "https://www.discovery.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/discovery-plus.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "ESPN",
        url: "https://www.espn.co.uk/watch/espnplus/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/ESPN-player.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "FOX",
        url: "https://www.fox.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/fox.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "HBO",
        url: "https://www.hbo.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/hbo.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "Hotstar",
        url: "https://www.hotstar.com/in",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/hotstar.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "Hulu",
        url: "https://www.hulu.com/welcome",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/hulu.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "IMDb",
        url: "https://www.imdb.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/IMDb.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "Lifetime",
        url: "https://www.mylifetime.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/lifetime.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "National Geographic",
        url: "https://www.nationalgeographic.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/national-geographic.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "NBC",
        url: "https://www.nbc.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/nbc.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "PBS",
        url: "https://www.pbs.org/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/pbs.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "Netfilx",
        url: "https://www.netflix.com/in/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/netflix.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "Showtimes",
        url: "https://www.sho.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/showtime.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "Sky",
        url: "https://www.sky.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/sky.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "Sling",
        url: "https://www.sling.com/geo-block/index.html",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/sling.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "USA Network",
        url: "https://www.usanetwork.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/usa-network.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "Vimeo",
        url: "https://vimeo.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/vimeo.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Streaming"
    },
    {
        name: "Discord",
        url: "https://discord.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/discord.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Social Networks"
    },
    {
        name: "Facebook",
        url: "https://www.facebook.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/facebook.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Social Networks"
    },
    {
        name: "Hangouts",
        url: "https://hangouts.google.com",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/hangouts.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Social Networks"
    },
    {
        name: "Medium",
        url: "https://medium.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/medium.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Social Networks"
    },
    {
        name: "Pinterest",
        url: "https://in.pinterest.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/pinterest.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Social Networks"
    },
    {
        name: "Reddit",
        url: "https://www.reddit.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/reddit.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Social Networks"
    },
    {
        name: "Slack",
        url: "https://slack.com/intl/en-in",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/slack.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Social Networks"
    },
    {
        name: "VK",
        url: "https://vk.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/vk.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Social Networks"
    },
    {
        name: "WeChat",
        url: "https://www.wechat.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/wechat.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Social Networks"
    },
    {
        name: "CNN",
        url: "https://edition.cnn.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/cnn.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "News"
    },
    {
        name: "DailyMail",
        url: "https://www.dailymail.co.uk/home/index.html",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/dailymail.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "News"
    },
    {
        name: "Globo",
        url: "https://www.globo.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/globo.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "News"
    },
    {
        name: "The Guardian",
        url: "https://www.theguardian.com/international",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/guardian.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "News"
    },
    {
        name: "la Repubblica",
        url: "https://www.repubblica.it/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/larepubblica.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "News"
    },
    {
        name: "MSN",
        url: "https://www.msn.com/en-in",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/msn.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "News"
    },
    {
        name: "Naver",
        url: "https://www.naver.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/naver.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "News"
    },
    {
        name: "Bild",
        url: "https://www.bild.de/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/bild.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "News"
    },
    {
        name: "The NewYork Times",
        url: "https://www.nytimes.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/new-york-times.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "News"
    },
    {
        name: "QQ",
        url: "https://im.qq.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/qq.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "News"
    },
    {
        name: "Billboard",
        url: "https://www.billboard.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/billboard.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Music"
    },
    {
        name: "Deezer",
        url: "https://www.deezer.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/deezer.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Music"
    },
    {
        name: "Genius",
        url: "https://genius.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/genius.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Music"
    },
    {
        name: "Last",
        url: "https://www.last.fm/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/last.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Music"
    },
    {
        name: "Pandora",
        url: "https://www.pandora.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/pandora.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Music"
    },
    {
        name: "Soundcloud",
        url: "https://soundcloud.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/soundcloud.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Music"
    },
    {
        name: "Line",
        url: "https://line.me/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/LINE.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Messengers"
    },
    {
        name: "Crew",
        url: "https://crew.co/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/crewapp.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Messengers"
    },
    {
        name: "Skype",
        url: "https://www.skype.com/",
        icon: "https://curateit-files.s3.amazonaws.com/sidebar/common/icon/Skype.png",
        openAs: "Sidebar",
        viewType: "Public",
        category: "General",
        categoryType: "Messengers"
    }
]

const createActivity = async (object, jwt) => {
    try {
        await axios.post(
            `${process.env.MONGODB_URL}/api/activitylogs`,
            object,
            {
                headers: {
                    Authorization: `Bearer ${jwt}`
                },
            }
        )
    } catch (error) {
        console.log("error===>", error);
        return error;
    }
}

const deleteUserData = async (data) => {

    await strapi.db.query("api::gem.gem").deleteMany({
        where: {
            id: { $in: data.gemdata.map((item) => item.id) }
        }
    })

    await strapi.db.query("api::collection.collection").deleteMany({
        where: {
            id: { $in: data.collectionData.map((item) => item.id) }
        }
    })

    await strapi.db.query("api::tag.tag").deleteMany({
        where: {
            id: { $in: data.tagData.map((item) => item.id) }
        }
    })

    await strapi.db.query("api::bookmark-config.bookmark-config").delete({
        where: {
            id: data.bookmark_config.id
        }
    })

    await strapi.db.query("api::gamification-score.gamification-score").delete({
        where: {
            id: data.gamification_score.id
        }
    })

    await strapi.db.query("api::plan-service.plan-service").delete({
        where: {
            id: data.plan_service.id
        }
    })

    await strapi.db.query("api::sidebar-management.sidebar-management").deleteMany({
        where: {
            id: { $in: data.sidebar_app.map((item) => item.id) }
        }
    })

}

const fetchAudioFileData = async (data) => {
    const url = 'https://api.openai.com/v1/audio/transcriptions';
    const formData = new FormData();

    formData.append("model", 'whisper-1');
    formData.append('file', fs.readFileSync(data.path), { filename: "recording.mp3" });
    formData.append("language", "en");

    const res = await axios.post(url, formData, {
        headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${process.env.AUDIO_WEB_PROD_OPENAI_API_KEY}`
        }
    })

    return res.data.text;
};

const fetchGPTResponse = async (text) => {
    const promptsData = await strapi.db.query('api::internal-ai-prompt.internal-ai-prompt').findOne({
        where: { promptType: 'Audio Text' }
    })

    const configuration = new Configuration({
        apiKey: process.env.AUDIO_WEB_PROD_OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo-1106",
        messages: [
            { role: "system", content: promptsData.prompt },
            { role: "user", content: text },
        ],
        max_tokens: 2000,
    });
    return completion.data.choices[0].message.content;
};

const triggerZohoWorkflow = async (email) => {
    // get automation workflow from zoho
    const {
        ZOHO_API_BASE_URL,
        ZOHO_SEGEMENT_LIST_KEY,
        NODE_ENV
    } = process.env

    if (NODE_ENV !== "production") return
    
    const zohoToken = await strapi.db.query('api::third-party-token.third-party-token').findOne({
        where: { provider: "Zoho", is_active: true }
    })

    if (!zohoToken) {
        return;
    }

    await axios(`${ZOHO_API_BASE_URL}/addlistsubscribersinbulk?resfmt=JSON&listkey=${ZOHO_SEGEMENT_LIST_KEY}&emailids=${email}`, 
        {
            method: 'post',
            headers: {
                Authorization: `Zoho-oauthtoken ${zohoToken.token}`
            }
        })
}

const uploadUrlFile = async (userId, URLData, filename) => {
    const client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_ACCESS_SECRET,
        },
      });

      const params = {
        Bucket: process.env.AWS_BUCKET,
        Key: `common/users/${userId}/insta-wall/${filename}`,
        Body: URLData.data,
        ContentType: URLData.header,
        ACL: "public-read",
      };

      await client.send(new PutObjectCommand(params))
      return `${process.env.AWS_BASE_URL}/common/users/${userId}/insta-wall/${filename}`; 
}

module.exports = {
    awaitRequest,
    imageColor,
    getPathExtension,
    openai,
    updatePlanService,
    updateGemiScoreRecs,
    removeDuplicateObject,
    collRelWithMultiGems,
    bookmarkUtils,
    filterByCF,
    checkWebsites,
    accessPermissions,
    getBase64MimeType,
    areCollectionIdSame,
    getFullScreenshot,
    triggerZohoWorkflow,
    sidebarAppData,
    getExtAndColors,
    createActivity,
    deleteUserData,
    accessTagPermissions,
    getURLBufferData,
    setCollectionSeoInformation,
    setGemSeoInformation,
    setUserSeoInformation,
    fetchAudioFileData,
    fetchGPTResponse,
    // setImageAltForGems,
    setTagSeoInformation,
    uploadUrlFile
};