module.exports = {
    routes: [
      { 
        method: 'POST',
        path: '/text-to-speechify',
        handler: 'text-to-speech.convertingTextToSpeech',
        config: {
          middlewares: ["api::text-to-speech.plan-service"],
        }, 
      },
    ]
  }