exports.checkPrompt = async (params, userId) => {
    try {
        const collectionId = params.collection_gems;

        const prompt = params?.media?.expander ? params?.media.expander.find((d) => d.type === "prompt").text : params?.expander ? params?.expander.find((d) => d.type === "prompt").text : null

        const gems = await strapi.entityService.findMany("api::gem.gem", {
            filters: { 
                author: userId, 
                expander: { $notNull: true, $containsi: prompt},
                collection_gems: collectionId 
            }
        })

        if (gems?.length > 0) {
            return { status: 400, message: "Prompt is already there" }
        }

        return { status: 200 }
    } catch (error) {
        return error.message;
    }
}