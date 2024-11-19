'use strict';

const { areCollectionIdSame, getFullScreenshot, createActivity } = require('../../../../utils');
const { getService } = require('../../../extensions/users-permissions/utils');
const { createBulkElasticData } = require('./after-operations');

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController("api::gem.gem", ({ strapi }) => ({

    async importSocialfeedPost(user, boomarks, collectionId, isImportProfile) {
        const jwt = getService('jwt').issue({ id: user.id });
        if (boomarks && user) {

            let profiles
            if (isImportProfile === "true") {
                const profileArr = boomarks.filter((b) => {
                    return b.media_type === "Profile"
                })

                const profilePromises = profileArr.map((p) => {
                    return this.createPostGem(p, user.id, collectionId, null)
                })

                profiles = await Promise.all(profilePromises)
                createBulkElasticData(user.id, profiles.map((n) => n.res), user.username)
            }
            const postArr = boomarks.filter((b) => {
                return b.media_type !== "Profile"
            })
            const postResArr = [];
            for (const post of postArr) {
                // postResArr.push(await this.createPostGem(post, user.id, collectionId, profiles.filter((p) => { return p.url === post.socialfeed_obj.user.profile_url })[0]))
                let profile = null;
                if (profiles && profiles.length > 0) {
                    profile = profiles.find((p) => p.url === post.socialfeed_obj.user.profile_url);
                }
                postResArr.push(await this.createPostGem(post, user.id, collectionId, profile));
            }

            const newPostArr = postResArr.filter((postObj) => {
                return postObj.isCreated === true
            })
            createBulkElasticData(user.id, newPostArr.map((n) => n.res), user.username)

            const collId = [];
            let collName;
            newPostArr.map((r) => {
                collName = r.res.collection_gems.name
                collId.push(r.res.collection_gems.id)
            })

            let sameId;
            if (collId.length > 0) {
                sameId = areCollectionIdSame(collId);
            }

            /* logs data for update hightlighed text  */
            if (newPostArr.length > 0) {
                const postId = [];
                newPostArr.map((post) => postId.push(post.res.id))

                const object = {
                    action: "Imported",
                    module: "Gem",
                    actionType: "SocialFeed",
                    collection_info: sameId ? { id: collId[0], name: collName } : {},
                    count: newPostArr.length,
                    author: { id: user.id, username: user.username },
                    gems_info: [postId]
                }
                createActivity(object, jwt);
            }

            return { postResArr, profiles };
        }
    },


    createPostGem(post, userId, collectionId, parent, isImported=true) {
        const socialfeed_obj = post.socialfeed_obj ? {
            ...post.socialfeed_obj,
            socialUserObj: {
                id: post?.socialfeed_obj?.user?.id || post?.socialfeed?.id,
                name: post?.socialfeed_obj?.user?.name || post?.socialfeed?.title || post?.socialfeed?.name,
                profile_url: post?.socialfeed_obj?.user?.profile_url || post?.socialfeed_obj?.user?.url ||  post?.socialfeed_obj?.profile_url,
                screen_name: post?.socialfeed_obj?.user?.screen_name,
                profile_image_url: post?.socialfeed_obj?.user?.profile_image_url || post?.socialfeed_obj?.user?.image || post?.socialfeed?.profile_image_url,
                verified: post?.socialfeed_obj?.user?.verified,
                tag_line: post?.socialfeed_obj?.user?.tag_line,
                type: post?.socialfeed_obj?.user?.type,
            },
            // metaData: post 
        } : null
        // console.log("Post ===>", {
        //     title: post.title,
        //     description: post?.description,
        //     url: post.url,
        //     collection_gems: post.collection_gems ? post.collection_gems : collectionId,
        //     author: userId,
        //     media_type: post.media_type,
        //     post_type: post.post_type,
        //     platform: post.platform,
        //     metaData: post.metaData,
        //     entityObj: post.entityObj,
        //     tags: post?.tags,
        //     media: post.media,
        //     remarks: post.remarks,
        //     is_favourite: post.is_favourite ? post.is_favourite : false,
        //     // socialfeed_obj: post.socialfeed_obj,
        //     socialfeed_obj,
        //     socialfeedAt: post?.socialfeed_obj?.date,
        //     parent_gem_id: parent ? parent.id : null,
        //     isImported: isImported,
        //     publishedAt: new Date().toISOString(),
        // })
        return new Promise((resolve, reject) => {
            strapi.db.query("api::gem.gem").findOne({
                where: { url: post.url, author: userId, media_type: { $ne: "Book" } }
            })
                .then((res) => {
                    if (res && !res.metaData?.isDefault) {
                        const obj = {
                            title: post.title,
                            description: post?.description,
                            metaData: post.metaData,
                            media: post.media,
                            collection_gems: post.collection_gems ? post.collection_gems : collectionId,
                            tags: post?.tags,
                            remarks: post.remarks,
                            is_favourite: post.is_favourite,
                            // socialfeed_obj: post.socialfeed_obj,
                            socialfeed_obj,
                            isImported: isImported,
                        }

                        if (post.entityObj) {
                            obj.entityObj = post.entityObj;
                        }
                        strapi.entityService.update("api::gem.gem", res.id, {
                            data: obj
                        })
                            .then((res) => {
                                resolve({ res, isCreated: false })
                            })
                    } else {
                        strapi.entityService.create("api::gem.gem", {
                            data: {
                                title: post.title,
                                description: post?.description,
                                url: post.url,
                                collection_gems: post.collection_gems ? post.collection_gems : collectionId,
                                author: userId,
                                media_type: post.media_type,
                                post_type: post.post_type,
                                platform: post.platform,
                                metaData: post.metaData,
                                entityObj: post.entityObj,
                                tags: post?.tags,
                                media: post.media,
                                remarks: post.remarks,
                                is_favourite: post.is_favourite ? post.is_favourite : false,
                                // socialfeed_obj: post.socialfeed_obj,
                                socialfeed_obj,
                                socialfeedAt: post?.socialfeed_obj?.date,
                                parent_gem_id: parent ? parent.id : null,
                                isImported: isImported,
                                publishedAt: new Date().toISOString(),
                            },
                            populate: {
                                collection_gems: {
                                    select: ["id", "slug"]
                                }
                            }
                        })
                            .then((res) => {
                                // getFullScreenshot(res);
                                resolve({ res, isCreated: true })
                            })
                            .catch((err) => {
                                console.log("Error in creating gem", err)
                            })
                    }
                })
        })
    },
}))