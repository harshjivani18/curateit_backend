const { default: axios } = require("axios");
const { updatePlanService } = require("../../../../utils");

exports.getFileSize = async (fileURL) => {
    try {
        const response = await axios.head(fileURL);
        // Check if content length is available in headers
        if (response.headers['content-length']) {
            const fileSize = parseInt(response.headers['content-length']);
            return fileSize;
        } else {
            throw new Error("Content length not provided in headers.");
        }
    } catch (error) {
        console.error("Error occurred while retrieving file size:", error);
        throw error;
    }
}

exports.updateUserPlanService = async (user, file) => {
    try {
        const fileSize = await this.getFileSize(file)
        const planService = await strapi.db.query("api::plan-service.plan-service").findOne({
            where: { author: user.id }
        })
        
        const audioRecLimit = (planService?.audio_recording ? parseInt(planService?.audio_recording) : 0) + parseInt(fileSize)

        await updatePlanService(user?.id, "audio", audioRecLimit)


    } catch (error) {
        return error.message
    }
}