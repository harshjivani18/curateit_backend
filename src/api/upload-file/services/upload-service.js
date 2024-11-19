async function getFileSize(url) {
    try {
        const response = await axios.head(url);
        const contentLength = response.headers['content-length'];
        return contentLength;
    } catch (error) {
        console.error('Error retrieving file size:', error.message);
        return null;
    }
}

exports.updatePlanService = async (userId, size) => {
    try {
        let fileSize
        if (!size) {
            const url = 'https://example.com/path/to/your/file';
            fileSize = await getFileSize(url);
        }
        console.log("updatePlanService====>", fileSize);

        // const planService = await strapi.db.query("api::plan-service.plan-service").findOne({
        //     where: { author: userId },
        //     select: ["id", "file_upload"]
        // })

        // const uploadSize = planService + size;

        // const updatePlanService = await strapi.entityService.update("api::plan-service.plan-service", planService?.id, {
        //     data: {
        //         file_upload: uploadSize
        //     }
        // })
        console.log("updatePlanService====>", updatePlanService);
    } catch (error) {
        return error.message
    }
}