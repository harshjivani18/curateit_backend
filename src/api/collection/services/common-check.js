const { createCoreService } = require('@strapi/strapi').factories;

const checkPermission = async (data, collectionData, invitedUsersViaMail, invitedUsersViaLinks, strapi, isGemsCheck, sharable_links, followedUserArr) => {
    let finalStatus = { status: 200, accessType: null }
    const { user } = data.state;
    // const userPermissionEmail   = invitedUsersViaMail?.filter((o) => { return parseInt(o.id) === user.id }) || []
    const userPermissionEmail = invitedUsersViaMail?.filter((o) => { 
        return (!o.isGroupShare && o.emailId === user?.email) || 
        (o.members && o.members?.findIndex((m) => { 
            return m.email === user?.email 
        }) > -1) 
    }) || []

    const userPermissionLink = invitedUsersViaLinks?.filter((obj) => { return obj.emailArr?.includes(user?.email) }) || []
    let emailPermission = userPermissionEmail.length > 0 ? userPermissionEmail[0] : null
    const linkPermission = userPermissionLink.length !== 0 ? userPermissionLink[0] : null
    if (emailPermission && emailPermission.members) {
        const memberPermissions = emailPermission.members.filter((m) => { return m.email === user?.email })
        if (memberPermissions.length !== 0) {
            emailPermission.accessType = memberPermissions[0].accessType
        }
    }
    const finalPermission = emailPermission || linkPermission || null
    let followPermission
    if (followedUserArr && followedUserArr.length > 0) {
        followedUserArr.forEach((f) => {
            if (f?.email === user?.email)
                return followPermission = true
        })
    }
    if (followPermission && data.request.method === "GET") return finalStatus = { status: 200, accessType: finalPermission?.accessType }

    if ((finalPermission && finalPermission.accessType === "viewer" && data.request.method === "GET") || (data.request.url.includes("remove-access") && data.request.method === "DELETE") || (data.request.url.includes("remove-collection") && data.request.method === "DELETE")) {
        finalStatus = { status: 200, accessType: finalPermission?.accessType }
    }
    else if (finalPermission && finalPermission.accessType === "editor") {
        if (isGemsCheck || data.request.method !== "DELETE") {
            finalStatus = { status: 200, accessType: finalPermission?.accessType }
        }
        else {
            finalStatus = { status: 403, accessType: finalPermission?.accessType }
        }
    }
    else if (finalPermission && finalPermission.accessType === "owner") {
        finalStatus = { status: 200, accessType: finalPermission?.accessType }
    }
    else if (sharable_links && data.request.method === "GET") {
        finalStatus = { status: 200, accessType: finalPermission?.accessType }
    }
    else {
        finalStatus = { status: 403, accessType: finalPermission?.accessType }
    }

    if (collectionData && finalStatus.status !== 200) {
        const newCollection = await strapi.entityService.findOne("api::collection.collection", collectionData.id, {
            fields: ["invitedUsersViaLinks", "invitedUsersViaMail", "sharable_links", "follower_users"],
            populate: {
                author: {
                    fields: ["id", "username"]
                },
                collection: true
            }
        })
        finalStatus = await checkPermission(data, newCollection.collection, newCollection.invitedUsersViaMail, newCollection.invitedUsersViaLinks, strapi, isGemsCheck, newCollection.sharable_links, newCollection?.follower_users)
    }

    return finalStatus
}

const checkTagPermission = async (data, tagData, invitedUsersViaMail, invitedUsersViaLinks, strapi, isGemsCheck, sharable_links) => {
    let finalStatus = { status: 200, accessType: null }
    const { user } = data.state;

    // const userPermissionEmail   = invitedUsersViaMail?.filter((o) => { return parseInt(o.id) === user.id }) || []
    const userPermissionEmail = invitedUsersViaMail?.filter((o) => { return (user && !o.isGroupShare && o.emailId === user?.email) || (o.members && o.members?.findIndex((m) => { return m.email === user?.email }) !== -1) }) || []
    const userPermissionLink = invitedUsersViaLinks?.filter((obj) => { return obj.emailArr?.includes(user?.email) }) || []

    const emailPermission = userPermissionEmail.length !== 0 ? userPermissionEmail[0] : null
    const linkPermission = userPermissionLink.length !== 0 ? userPermissionLink[0] : null
    const finalPermission = emailPermission || linkPermission || null

    if ((finalPermission && finalPermission.accessType === "viewer" && data.request.method === "GET") || (data.request.url.includes("remove-access") && data.request.method === "DELETE") || (data.request.url.includes("remove-tag") && data.request.method === "DELETE")) {
        finalStatus = { status: 200, accessType: finalPermission?.accessType }
    }
    else if (finalPermission && finalPermission.accessType === "editor") {
        if (isGemsCheck || data.request.method !== "DELETE") {
            finalStatus = { status: 200, accessType: finalPermission?.accessType }
        }
        else {
            finalStatus = { status: 403, accessType: finalPermission?.accessType }
        }
    }
    else if (finalPermission && finalPermission.accessType === "owner") {
        finalStatus = { status: 200, accessType: finalPermission?.accessType }
    }
    else if (sharable_links && data.request.method === "GET") {
        finalStatus = { status: 200, accessType: finalPermission?.accessType }
    }
    else {
        finalStatus = { status: 403, accessType: finalPermission?.accessType }
    }

    if (tagData && finalStatus.status !== 200) {
        const newTag = await strapi.entityService.findOne("api::tag.tag", tagData.id, {
            fields: ["invitedUsersViaLink", "invitedUsersViaMail", "sharable_links"],
            populate: {
                users: {
                    fields: ["id", "username"]
                },
                parent_tag: true
            }
        })
        finalStatus = await checkTagPermission(data, newTag.parent_tag, newTag.invitedUsersViaMail, newTag.invitedUsersViaLink, strapi, isGemsCheck, newTag.sharable_links)
    }

    return finalStatus
}

module.exports = createCoreService('api::collection.collection', ({ strapi }) => ({
    async permissinosMiddlewareFunc(collectionId, loggedInUser, ctx, isGemsCheck = false) {
        const { user } = ctx.state;
        const collectionData = await strapi.entityService.findOne("api::collection.collection", collectionId, {
            fields: ["invitedUsersViaLinks", "invitedUsersViaMail", "sharable_links", "isBioContactCollection", "follower_users"],
            populate: {
                author: {
                    fields: ["id", "username"]
                },
                collection: true
            }
        })

        const userPermissionEmail = collectionData?.invitedUsersViaMail?.filter((o) => { return (user && !o.isGroupShare && o.emailId === user?.email) || (o.members && o.members?.findIndex((m) => {
            return m.email === user?.email }) !== -1) }) || []

        const userPermissionLink = collectionData?.invitedUsersViaLinks?.filter((obj) => { return obj.emailArr?.includes(user?.email) }) || []

        const emailPermission = userPermissionEmail.length !== 0 ? userPermissionEmail[0] : null
        const linkPermission = userPermissionLink.length !== 0 ? userPermissionLink[0] : null
        const finalPermission = emailPermission || linkPermission || null

        // const memberAccessIdx = finalPermission?.members?.findIndex((m) => { return m.email === user?.email })

        // finalPermission?.members?.forEach((m) => { if (m?.email === user?.email) return m.accessType})
        
        if (finalPermission && finalPermission.members) {
            const memberIdx = finalPermission?.members?.findIndex((m) => { return m.email === user?.email })
            if (memberIdx !== -1) {
                ctx.state.collection_access_type = finalPermission?.members ? finalPermission?.members[memberIdx].accessType : finalPermission?.accessType
                return { status: 200, accessType: finalPermission?.members ? finalPermission?.members[memberIdx].accessType : finalPermission?.accessType }
            }
        }

        ctx.state.collection_access_type = user ? finalPermission?.accessType : null

        if (collectionData?.isBioContactCollection && ctx.request.method === "POST") { return { status: 200 } }

        if (collectionData?.sharable_links && ctx.request.method === "POST" && !ctx.request.url.includes("collection-email")) { return { status: 200 } }

        if (collectionData?.sharable_links && ctx.request.method === "GET") { return { status: 200 } }

        // if (!loggedInUser) {console.log( "loggedInUser");return { status: 403 }}

        if (collectionData?.author?.id === ctx?.state?.user?.id) {
            return { status: 200 }
        }

        const permission = await checkPermission(ctx, collectionData?.collection, collectionData?.invitedUsersViaMail, collectionData?.invitedUsersViaLinks, strapi, isGemsCheck, collectionData?.sharable_links, collectionData?.follower_users)
        ctx.state.collection_access_type = permission?.accessType

        return permission
    },

    async tagPermissionMiddlewareFunc(tagId, loggedInUser, ctx, isGemsCheck = false) {

        const tagData = await strapi.entityService.findOne("api::tag.tag", tagId, {
            fields: ["invitedUsersViaLink", "invitedUsersViaMail", "sharable_links"],
            populate: {
                users: {
                    fields: ["id", "username"]
                },
                parent_tag: true
            }
        })

        // if (!loggedInUser) return { status: 403 }
        if (tagData?.sharable_links && ctx.request.method === "GET") {
            finalStatus = { status: 200 }
        }

        if (tagData?.users?.[0]?.id === ctx?.state?.user?.id) {
            return { status: 200 }
        }

        const permission = await checkTagPermission(ctx, tagData?.parent_tag, tagData?.invitedUsersViaMail, tagData?.invitedUsersViaLink, strapi, isGemsCheck, tagData?.sharable_links)

        return permission
    }
}))
