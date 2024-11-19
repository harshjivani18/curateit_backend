exports.removeAllCollections = async (email, groupName, groupId) => {
    try {
        const collections = await strapi.entityService.findMany("api::collection.collection", {
            filters: {
                invitedUsersViaMail: { $notNull: true, $containsi: groupName }
            }
        })

        for (const c of collections) {
            const invitedUsers = c.invitedUsersViaMail
            for (const i of invitedUsers) {
                if (i?.isGroupShare === true && parseInt(i?.id) === parseInt(groupId)) {

                    const members = i?.members;

                    const memberIdx = members?.findIndex((m) => {
                        return m.email === email
                    });

                    if (memberIdx !== -1) {
                        members.splice(memberIdx, 1)
                    }

                    await strapi.entityService.update("api::collection.collection", c.id, {
                        data: {
                            invitedUsersViaMail: c.invitedUsersViaMail
                        }
                    })
                }
            }
        }

        return collections
    } catch (error) {
        return error.message;
    }
}

exports.removeGroupAllCollections = async (groupId, groupName) => {
    try {
        const collections = await strapi.entityService.findMany("api::collection.collection", {
            filters: {
                invitedUsersViaMail: { $notNull: true, $containsi: groupName }
            }
        })

        for (const c of collections) {
            const invitedUsers = c.invitedUsersViaMail
            const grpIdx = invitedUsers?.findIndex((i) => (i?.isGroupShare === true && parseInt(i?.id) === parseInt(groupId)))

            if (grpIdx !== -1) {
                invitedUsers.splice(grpIdx, 1)
                await strapi.entityService.update("api::collection.collection", c.id, {
                    data: {
                        invitedUsersViaMail: invitedUsers
                    }
                })
            }
        }

        return collections
    } catch (error) {
        return error.message;
    }
}