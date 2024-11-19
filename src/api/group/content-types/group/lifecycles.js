const { removeAllCollections, removeGroupAllCollections } = require("../../services/group-service");

module.exports = {
    beforeUpdate(event) {
        const { params } = event
        const query = strapi?.requestContext?.get()?.request?.url;
        if (query.includes("isRemove=true")) {
            strapi.entityService.findOne("api::group.group", params.where.id)
                .then((group) => {
                    const oldMembers = group.members;
                    const newMembers = params.data.members;
                    const uniqueTo1 = oldMembers.filter(item => !newMembers.find(element => element.id === item.id));
                    removeAllCollections(uniqueTo1[0]?.email, group?.name, group?.id)
                })
        }
    },

    beforeDelete(event) {
        const { params } = event;
        strapi.entityService.findOne("api::group.group", params.where.id)
            .then((group) => {
                removeGroupAllCollections(group?.id, group?.name)
            })
    }
}