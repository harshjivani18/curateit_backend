const { collectionOrderAtDeleteMany } = require("../../collection/services/collection-service");
const { gemOrderAtDeleteMany } = require("../../gem/services/gem-service");
const { tagOrderAtDeleteMany } = require("../../tag/services/tag-service");

exports.deleteGems = async (ids) => {
    try {
        await strapi.db.query("api::gem.gem").deleteMany({
            where: {id: ids}
        })
        gemOrderAtDeleteMany(ids)
        return "success"
    } catch (error) {
        return error.message
    }
};

exports.deleteCollections = async (userId, ids) => {
    try {
            await collectionOrderAtDeleteMany(userId, ids)
            await strapi.db.query("api::collection.collection").deleteMany({
                where: {id: ids}
            })
        return "success"
    } catch (error) {
        return error.message
    }
};

exports.deleteTags = async (userId, ids) => {
    try {

        await tagOrderAtDeleteMany(userId, ids)
        await strapi.db.query("api::tag.tag").deleteMany({
            where: {id: ids}
        })
        return "success"
    } catch (error) {
        return error.message
    }
};

exports.deleteSharedCollections = async (email, userId) => {
    const sharedCollections = await strapi.db.query("api::collection.collection").findMany({
        where: { 
            $or: [
                {
                    invitedUsersViaMail: {
                        $notNull: true,
                        $containsi: email
                    }
                },
                {
                    invitedUsersViaLinks: { 
                        $notNull: true, 
                        $containsi: email 
                    }
                },
                {
                    follower_users: {
                        $notNull: true,
                        $containsi: email
                    }
                }
            ]
        }
    })

    for (const c of sharedCollections) {
        let iMailArr        = c.invitedUsersViaMail ? [ ...c.invitedUsersViaMail ] : []
        let iLinkArr        = c.invitedUsersViaLinks ? [ ...c.invitedUsersViaLinks ] : []
        let followerArr     = c.follower_users ? [ ...c.follower_users ] : []

        const inviteMailIdx = iMailArr.findIndex(u => u.emailId === email)
        const inviteLinkIdx = iLinkArr.findIndex(u => u.emailArr.includes(email))
        const followIdx     = followerArr.findIndex(u => u.email.toLowerCase() === email.toLowerCase())

        if (inviteMailIdx > -1) {
            iMailArr.splice(inviteMailIdx, 1)
            iMailArr = [ ...iMailArr ]
        }

        if (inviteLinkIdx > -1) {
            iLinkArr.splice(inviteLinkIdx, 1)
            iLinkArr = [ ...iLinkArr ]
        }

        if (followIdx > -1) {
            followerArr.splice(followIdx, 1)
            followerArr = [ ...followerArr ]
        }

        await strapi.db.query("api::collection.collection").update({
            where: {id: c.id},
            data: {
                invitedUsersViaMail: iMailArr,
                invitedUsersViaLinks: iLinkArr,
                follower_users: followerArr
            }
        })
    }

    return "success"
}

exports.deleteSharedTags = async (email, userId) => {
    const sharedTags = await strapi.db.query("api::tag.tag").findMany({
        where: { 
            $or: [
                {
                    invitedUsersViaMail: {
                        $notNull: true,
                        $containsi: email
                    }
                },
                {
                    invitedUsersViaLink: { 
                        $notNull: true, 
                        $containsi: email 
                    }
                }
            ]
        }
    })

    for (const c of sharedTags) {
        let iMailArr        = c.invitedUsersViaMail ? [ ...c.invitedUsersViaMail ] : []
        let iLinkArr        = c.invitedUsersViaLink ? [ ...c.invitedUsersViaLink ] : []

        const inviteMailIdx = iMailArr.findIndex(u => u.emailId === email)
        const inviteLinkIdx = iLinkArr.findIndex(u => u.emailArr.includes(email))

        if (inviteMailIdx > -1) {
            iMailArr.splice(inviteMailIdx, 1)
            iMailArr = [ ...iMailArr ]
        }

        if (inviteLinkIdx > -1) {
            iLinkArr.splice(inviteLinkIdx, 1)
            iLinkArr = [ ...iLinkArr ]
        }

        await strapi.db.query("api::tag.tag").update({
            where: {id: c.id},
            data: {
                invitedUsersViaMail: iMailArr,
                invitedUsersViaLink: iLinkArr
            }
        })
    }

    return "success"
}