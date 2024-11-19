module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/openai',
            handler: 'openai.openai',
        },
        {
            method: 'POST',
            path: "/send-ai-response",
            handler: 'openai.sendAIResponse',
        },
        {
            method: "POST",
            path: "/repharse-prompt",
            handler: 'openai.repharsePrompt',
        },
        {
            method: "POST",
            path: "/convert-chat-to-audio",
            handler: 'openai.textToSpeechWithOpenai',
        }
    ]
}