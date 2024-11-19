module.exports = {
    routes : [
        { 
          method: 'GET',
          path: '/get-user-voices',
          handler: 'voices.getUserVoices',
        },
        {
          method: 'POST',
          path: "/voices",
          handler: 'voices.createVoice'
        }
    ]
}