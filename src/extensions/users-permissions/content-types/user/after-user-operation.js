exports.followCurateitCollection = (result) => {
    try {
        const obj = {
            id: result?.id,
            email: result?.email,
            username: result?.username
        }

        strapi.db.query("api::config-limit.config-limit").findOne({
            where: { curateitDefaultId: { $notNull: true} },
        }).then((curateitCollectionId) => {
            strapi.entityService.findOne("api::collection.collection", curateitCollectionId?.curateitDefaultId, {
                fields: ["id", "name", "follower_users"]
            }).then((followerData) => {
                let followerUserArr = followerData?.follower_users ? [...followerData?.follower_users, obj] : [obj]
                // console.log("Details", curateitCollectionId?.curateitDefaultId)
                strapi.entityService.update("api::collection.collection", curateitCollectionId?.curateitDefaultId, {
                    data: {
                        follower_users: [ ...followerUserArr ]
                    }
                })
            })
        });
    } catch (error) {
        return error.message;
    }
}

exports.updateTeamData = async (email, userId) => {
    const test = await strapi.db.query("api::team.team").findMany({
        where: { email },
        select: ["id"]
    })
    
    test?.forEach((t) => {
        strapi.db.query("api::team.team").update({
            where: { id: t.id },
            data: {
                username: userId
            }
        })
    })
}