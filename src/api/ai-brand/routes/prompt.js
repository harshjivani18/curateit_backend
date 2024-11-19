module.exports = {
    routes : [
        { 
          method: 'GET',
          path: '/get-brand-prompts',
          handler: 'prompt.getAllPublicPrompts',
        }
    ]
}