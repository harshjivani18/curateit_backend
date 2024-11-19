module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/prompt-res',
            handler: 'prompt-response.createPromptRes',
            config: {
                policies: [],
                middlewares: [],
            },
        }
        
    ]
}