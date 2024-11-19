const { createActivity } = require("../../../../../utils")
const { getService } = require("../../../../extensions/users-permissions/utils");

module.exports = {
    async afterCreate(data) {
        const { result } = data;
        const userId = strapi?.requestContext?.get()?.state?.user?.id;
        const username = strapi?.requestContext?.get()?.state?.user?.username;
        const jwt = getService('jwt').issue({ id: userId });

        const object = {
            action: "Created",
            module: "SidebarApps",
            actionType: "App shortcut",
            count: 1,
            author: { id: userId, username },
        }
        createActivity(object, jwt);

    }
};