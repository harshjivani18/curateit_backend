const { createCoreService } = require('@strapi/strapi').factories;

const checkPermissionNew = async (data, tagData, invitedUsersViaMail, invitedUsersViaLinks, strapi, isGemsCheck, sharable_links) => {

    const { user }              = data.state;
    let finalStatus             = { status: 200, accessType: null };
    // let followPermission        = null;

    const userPermissionEmail   = invitedUsersViaMail?.filter((o) => { 
        return (!o.isGroupShare && o.emailId === user?.email) || 
        (o.members && o.members?.findIndex((m) => { 
            return m.email === user?.email 
        }) > -1) 
    }) || [];

    const userPermissionLink    = invitedUsersViaLinks?.filter((obj) => { return obj.emailArr?.includes(user?.email) }) || [];
    let emailPermission         = userPermissionEmail.length > 0 ? userPermissionEmail[0] : null;
    const linkPermission        = userPermissionLink.length !== 0 ? userPermissionLink[0] : null;

    if (emailPermission && emailPermission.members) {
        const memberPermissions = emailPermission.members.filter((m) => { return m.email === user?.email })
        if (memberPermissions.length !== 0) {
            emailPermission.accessType = memberPermissions[0].accessType
        }
    }

    const finalPermission       = emailPermission || linkPermission || null
    
    // if (followedUserArr && followedUserArr.length > 0) {
    //     followedUserArr.forEach((f) => {
    //         if (f?.email === user?.email) {
    //             return followPermission = true
    //         }
    //     })
    // }

    // if (followPermission) {
    //     return finalStatus      = { status: 200, accessType: finalPermission?.accessType }
    // }

    if ((finalPermission && finalPermission.accessType === "viewer" && data.request.method === "GET") || (data.request.url.includes("remove-access") && data.request.method === "DELETE") || (data.request.url.includes("remove-tag") && data.request.method === "DELETE")) {
        finalStatus = { status: 200, accessType: finalPermission?.accessType }
    } else if (finalPermission && finalPermission.accessType === "editor") {
        if (isGemsCheck || data.request.method !== "DELETE") {
            finalStatus         = { status: 200, accessType: finalPermission?.accessType }
        } else {
            finalStatus         = { status: 403, accessType: finalPermission?.accessType }
        }
    } else if (finalPermission && finalPermission.accessType === "owner") {
        finalStatus             = { status: 200, accessType: finalPermission?.accessType }
    } else if (sharable_links && data.request.method === "GET") {
        finalStatus             = { status: 200, accessType: finalPermission?.accessType }
    } else {
        finalStatus             = { status: 403, accessType: finalPermission?.accessType }
    }

    if (tagData && finalStatus.status !== 200) {
        const newTag = await strapi.entityService.findOne("api::tag.tag", tagData.id, {
            fields: ["invitedUsersViaLink", "invitedUsersViaMail", "sharable_links"],
            populate: {
                usres: {
                    fields: ["id", "username"]
                },
                parent_tag: true
            }
        })
        finalStatus = await checkPermissionNew(data, newTag.collection, newTag.invitedUsersViaMail, newTag.invitedUsersViaLink, strapi, isGemsCheck, newTag.sharable_links)
    }

    return finalStatus
}

const checkPermission = async (data, tagData, invitedUsersViaMail, invitedUsersViaLink, strapi, isGemsCheck, sharable_links) => {
    let finalStatus = { status: 200 } 
    const { user }  = data.state;
    // const userPermissionEmail   = invitedUsersViaMail?.filter((o) => { return parseInt(o.id) === user.id }) || []
    const userPermissionEmail   = invitedUsersViaMail?.filter((o) => { 
        return (user && !o.isGroupShare && o.emailId === user?.email) || 
        (o.members && o.members?.findIndex((m) => { 
            return m?.email === user?.email 
        }) > -1) 
        }) || []

    const userPermissionLink    = invitedUsersViaLink?.filter((obj) => { return obj.emailArr?.includes(user?.email) }) || []
    const emailPermission       = userPermissionEmail.length !== 0 ? userPermissionEmail[0] : null
    const linkPermission        = userPermissionLink.length !== 0 ? userPermissionLink[0] : null
    const finalPermission       = emailPermission || linkPermission || null
    if ((finalPermission && finalPermission.accessType === "viewer" && data.request.method === "GET") || (data.request.url.includes("remove-access") && data.request.method === "DELETE") || (data.request.url.includes("remove-tag") && data.request.method === "DELETE")) {
        finalStatus = { status: 200 }
    }
    else if (finalPermission && finalPermission.accessType === "editor") {
        if (isGemsCheck || data.request.method !== "DELETE") {
            finalStatus = { status: 200 }
        }
        else {
            finalStatus = { status: 403 }
        }
    }
    else if (finalPermission && finalPermission.accessType === "owner") {
        finalStatus = { status: 200 }
    }
    else if (sharable_links && data.request.method === "GET") {
        finalStatus = { status: 200 }
    }
    else {
        finalStatus = { status: 403 }
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
        finalStatus = await checkPermission(data, newTag.parent_tag, newTag.invitedUsersViaMail, newTag.invitedUsersViaLink, strapi, newTag?.sharable_links)
    }

    return finalStatus
}
 
module.exports = createCoreService('api::tag.tag', ({ strapi }) => ({
    async permissinosMiddlewareFunc(tagId, loggedInUser, ctx, collectionId, isGemsCheck=false) {
        const { user } = ctx.state;

        if (collectionId) {
            const collection = await strapi.entityService.findOne("api::collection.collection", collectionId, {
                fields: ["id", "name", "sharable_links"]
            })

            if (collection.sharable_links) {return {status: 200}}
        }

       const tagData   = await strapi.entityService.findOne("api::tag.tag", tagId, {
           fields: ["invitedUsersViaLink", "invitedUsersViaMail", "sharable_links"],
           populate: {
               users: {
                   fields: ["id", "username"]
               },
               parent_tag: true
           }
       })

       const userPermissionEmail = tagData?.invitedUsersViaMail?.filter((o) => { return (user && !o.isGroupShare && o.emailId === user?.email) || (o.members && o.members?.findIndex((m) => { return m.email === user?.email }) !== -1) }) || []
       const emailPermission = userPermissionEmail.length !== 0 ? userPermissionEmail[0] : null
       const finalPermission = emailPermission || null

       const memberIdx = finalPermission?.members?.findIndex((m) => { return m.email === user?.email })
       if (memberIdx && memberIdx !== -1) return { status: 200, accessType: finalPermission?.accessType }

       if (tagData?.sharable_links) return { status: 200 }
    
    //    if (!loggedInUser) return { status: 403 }

       if (tagData?.users[0].id === ctx?.state?.user?.id) {
           return { status: 200 }
       }

       const permission = await checkPermissionNew(ctx, tagData?.parent_tag, tagData.invitedUsersViaMail, tagData.invitedUsersViaLink, strapi, isGemsCheck, tagData.sharable_links)

       return permission
    }
}))
