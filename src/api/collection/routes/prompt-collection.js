module.exports = {
    routes: [
        {
            method: "POST",
            path: "/prompt-collections", // no need to add middleware because nothing accept from the queryparams or params
            handler: "prompt-collection.createCollectionFromAIPrompt",
        }
    ]
}