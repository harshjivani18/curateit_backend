module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/prompts',
            handler: 'prompt-builder.createPromptGem',
            config: {
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'GET',
            path: '/prompts-list',
            handler: 'prompt-builder.getPublicPrompts',
        },
        {
            method: 'GET',
            path: '/prompts-list/:promptId',
            handler: 'prompt-builder.selectPrompts',
        }
    ]
}