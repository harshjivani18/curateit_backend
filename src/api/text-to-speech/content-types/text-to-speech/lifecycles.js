const { updatePlanService } = require("../../../../../utils");

module.exports = {
    afterCreate(event) {
        const userId = strapi?.requestContext?.get()?.state?.user?.id;

        updatePlanService(userId, "speech")
    },

    afterDelete(event) {
        const userId = strapi?.requestContext?.get()?.state?.user?.id;

        updatePlanService(userId, "speech")

    }
}