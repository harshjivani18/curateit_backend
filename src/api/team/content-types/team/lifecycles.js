const { updatePlanService } = require("../../../../../utils");

module.exports = {

    afterCreate(event) {
        const userId = strapi?.requestContext?.get()?.state?.user?.id;
        updatePlanService(userId, "team")
    },
    afterUpdate(event) {
        const userId = strapi?.requestContext?.get()?.state?.user?.id;
        updatePlanService(userId, "team")
    },
    afterDelete(event) {
        const userId = strapi?.requestContext?.get()?.state?.user?.id;
        updatePlanService(userId, "team")
    }
}