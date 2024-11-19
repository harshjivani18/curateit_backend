'use strict';

/**
 * collection service
 */
const findCollection = async (id) => {
    try {
        const collectionData = await strapi.entityService.findOne("api::collection.collection", id, {
            populate: {
                parent_collection: true,
                collection: true,
                author: { fields: [ "id" ] },
                gems: {
                    populate: {
                        tags: { fields: ["id", "tag", "slug"] },
                        child_gem_id: { fields: ["id", "slug"] },
                        parent_gem_id: { fields: ["id", "slug"] },
                        author: { fields: [ "id" ] },
                    }
                    // fields: ["title", "description", "metaData", "upvotes", "downvotes", "is_favourite", "media", "media_type", "url", "text", "tags", "remarks", "Comments", "SharesViews", "AverageRating", "S3_link", "FileName", "imageColor", "entityObj", "ratings", "custom_fields_obj", "isTabCollection", "service_type", "image_url", "user_id", "item_id", "post_type", "broken_link", "status_code", "highlightId", "socialfeed_obj", 
                    // // child_gem_id, parent_gem_id, 
                    // "socialfeedAt", "platform", "expander", "creatorName", "releaseDate", "entityId", "isRead", "showThumbnail", "fileType", "html_file_link"]
                }
            }
        })

        return collectionData;
    } catch (error) {
        console.log("findCollection error ===>", error);
    }
}

const createCollection = async (data, userId, collId) => {
    try {
        delete data.id;
        delete data.parent_collection;
        delete data.collection;
        delete data.gems;
        delete data.invitedUsersViaMail;
        delete data.invitedUsersViaLinks;
        delete data.sharable_links;
        delete data.createdAt;
        delete data.updatedAt;
        delete data.follower_users;
        delete data?.order_of_gems;
        
        data.author = userId;
        data.collection = collId;
        data.isShareCollection = true;

        const plan_service = await strapi.db.query("api::plan-service.plan-service").findOne({
            where: {
                author: userId
            },
            select: ["id", "coll_limit", "coll_used"]
        })

        if (parseInt(plan_service?.coll_used) >= parseInt(plan_service?.coll_limit)) {
            return { status: 400 }
        }

        const collection = await strapi.entityService.create("api::collection.collection", {
            data
        })

        return collection;
    } catch (error) {
        console.log("createCollection error ===>", error);
    }
}

const createGem = async (data, userId, collId, isAuthor) => {
    if (!isAuthor && data?.isPending === true) return null
    try {

        // data.forEach(async (gemData) => {
        // console.log("data===>", data);
        const test = { ...data }
        delete test.id;
        delete test.createdAt;
        delete test.updatedAt;
        test.author = userId;
        test.collection_gems = collId;
        test.isShare = true;
        const tags = []
        if (test.tags && test.tags.length > 0) {
            // test.tags.map(async (t) => {
            for (const t of test.tags) {

                const existingTag = await strapi.db.query('api::tag.tag').findOne({
                    where: {
                        tag: t.tag,
                        users: userId
                    }
                })

                if (existingTag !== null) { tags.push(existingTag.id) }
                else {
                    const addTag = await strapi.db.query('api::tag.tag').create({
                        data: {
                            tag: t.tag,
                            users: userId,
                            publishedAt: new Date().toISOString()
                        }
                    })
                    tags.push(addTag.id);
                }
                // const tag = await strapi.entityService.create("api::tag.tag", {
                //     data: {
                //         tag: t.tag,
                //         users: userId,
                //         publishedAt: new Date().toISOString()
                //     }
                // })
                // tags.push(tag.id)

            }
        }
        test.tags = tags
        const gemObj = {
            ...test,
            child_gem_id: []
        }

        const plan_service = await strapi.db.query("api::plan-service.plan-service").findOne({
            where: {
                author: userId
            },
            select: ["id", "gem_limit", "gem_used"]
        })

        if (parseInt(plan_service?.gem_used) >= parseInt(plan_service?.gem_limit)) {
            return { status: 400 }
        }

        const gem = await strapi.entityService.create("api::gem.gem", {
            data: gemObj
        })

        // if(gemData.child_gem_id && gemData.child_gem_id.length > 0) {
        //     gemData.child_gem_id.map(async (child) => {
        //         console.log("child", child);
        //         data.forEach(async (d) => {
        //             console.log("gemid",d.id, gem.id);
        //             if(d.id === child.id) d.parent_gem_id.id = gem.id
        //         })
        //     })
        // }

        // })

        return gem
    } catch (error) {
        console.log("createGem error ===>", error);
    }
}

exports.createCollectionCopy = async (id, user, parentCollId) => {
    try {
        const collectionData = await findCollection(id)
        const obj = { ...collectionData }

        const isFollowCollection = await strapi.service('api::collection.checks').checkIsRootFollowed(parseInt(id), user)
        if (!collectionData.sharable_links && !isFollowCollection) {
            return {status: 403, message: "You are not authorized"}
        }
        if (!parentCollId) collectionData.is_sub_collection = false
        const collection = await createCollection(collectionData, user.id, parentCollId);

        if (collection?.status === 400) { return { status: 400, message: 'Collection Limit Exceeded, please upgrade your plan buy add-ons or earn some credits to unlock more!' } }

        const parentGem = obj.gems.filter((data) => {
            return data.child_gem_id && data.child_gem_id.length > 0
        })
        // parentGem.forEach((data) => {
        for (const data of parentGem) {
            // const test = {...data}
            // delete test.id;
            // test.author = userId;
            // test.collection_gems = collId;

            // if(data.child_gem_id && )

            // if(data.child_gem_id && data.child_gem_id.length > 0) {

            const gem = await createGem(data, user.id, collection.id, obj?.author?.id === data?.author?.id)

            if (gem?.status === 400) { return { status: 400, message: 'Gem Limit Exceeded, please upgrade your plan buy add-ons or earn some credits to unlock more!' } }
            if (gem) {
                data.child_gem_id.map((child) => {
                    obj.gems.forEach((d, index) => {
                        if (d.id === child.id) {
                            obj.gems[index] = {
                                ...obj.gems[index],
                                parent_gem_id: {
                                    ...obj.parent_gem_id,
                                    id: gem.id
                                }
                            }
                            obj.gems = [...obj.gems]
                        }
                    })
                })
            }

            // }
        }

        const childGem = obj.gems.filter((data) => {
            return !(data.child_gem_id && data.child_gem_id.length > 0)
        })

        // childGem.forEach((data) => {
            for (const data of childGem) {
            // const test = {...data}
            // delete test.id;
            // test.author = userId;
            // test.collection_gems = collId;
                const gem = await createGem(data, user.id, collection.id, obj?.author?.id === data?.author?.id)
                if (gem?.status === 400) { return { status: 400, message: 'Gem Limit Exceeded, please upgrade your plan buy add-ons or earn some credits to unlock more!' } }
            }

        // await createGem(obj.gems, userId, test.id)
        if (obj.parent_collection && obj.parent_collection.length > 0) {
            obj.parent_collection.forEach(async (data) => {
                await this.createCollectionCopy(data.id, user, collection.id)
            })
        }

        return {status: 200, message: "Collection created", collectionId: collection.id};
    } catch (error) {
        console.log("createCollectionCopy===>", error);
        return error;
    }
}