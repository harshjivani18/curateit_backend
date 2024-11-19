module.exports = {
    routes: [
        {
            method: "POST",
            path: "/prompt-gems",  // not in use
            handler: "prompt-gems.createGemFromAIPrompt",
        },
        {
            method: "GET",
            path: "/fetch-public-prompts",
            handler: "prompt.getAllPublicPromptGems",
        }
    ]
}
 