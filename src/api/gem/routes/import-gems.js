module.exports = {
  routes: [
    { // Path defined with an URL parameter
      method: 'PUT',
      path: '/edit-bookmarks', // Pass
      handler: 'gem.bulkEditGem',
      config: {
        middlewares: ["api::gem.bulk-gems"],
      },
    },
    {
      method: 'GET',
      path: '/take-screenshot', // It is taking the screenshot from the page and gem action is performing so no need to validate the permission
      handler: 'screenshot.getFullPageScreenshot'
    },
    {
      method: 'PUT',
      path: '/update-existing-screenshot', // It is just updating the screenshot on the s3 path so it is no need to validate the permission
      handler: 'screenshot.updateScreenshot'
    },
    {
      method: 'GET',
      path: '/highlight-gems', // Getting the gems using logged in user only so no need to validate the permission
      handler: 'gem.getAllHighlights'
    },
    { // Path defined with an URL parameter
      method: 'POST',
      path: '/import-gems', // Pass
      handler: 'gem.importGem',
      config: {
        middlewares: ["api::gem.bulk-gems", "api::gem.plan-service"],
      },
    },
    { // Path defined with an URL parameter
      method: 'POST',
      path: '/import-gems-with-icons', // Pass
      handler: 'import-gems.importGemsWithIcons',
      config: {
        middlewares: ["api::gem.bulk-gems", "api::gem.plan-service"],
      },
    },
    { // Path defined with an URL parameter
      method: 'GET',
      path: '/audios',
      handler: 'audio.getAllAudios' // This api is giving record according to the logged in user only so no need to validate it permissions
    },
    { // Path defined with an URL parameter
      method: 'POST',
      path: '/audios', // Pass
      handler: 'audio.createAudio',
      config: {
        middlewares: ["api::gem.gems-operation", "api::gem.plan-service"],
      },
    },
    { // Path defined with an URL parameter
      method: 'DELETE',
      path: '/audios/:gemId', // Pass
      handler: 'audio.deleteAudio',
      config: {
        middlewares: ["api::gem.gems-operation"],
      },
    },
    { // Path defined with an URL parameter
      method: 'GET',
      path: '/audios/:gemId', // Pass
      handler: 'audio.getAudioById',
      config: {
        middlewares: ["api::collection.share-collection"],
      },
    },
    { // Path defined with an URL parameter
      method: 'PUT',
      path: '/audios/:gemId', // Pass
      handler: 'audio.updateAudio',
      config: {
        middlewares: ["api::gem.gems-operation"],
      },
    },
    { // Path defined with an URL parameter
      method: 'POST',
      path: '/videos',
      handler: 'video.createVideo', // Pass
      config: {
        middlewares: ["api::gem.gems-operation", "api::gem.plan-service"],
      },
    },
    { // Path defined with an URL parameter
      method: 'GET',
      path: '/videos', // Get all videos created by the logged in user only so it is no need to validate the permissions
      handler: 'video.getAllVideos',
    },
    { // Path defined with an URL parameter
      method: 'DELETE',
      path: '/videos/:gemId', // Pass
      handler: 'video.deleteVideo',
      config: {
        middlewares: ["api::gem.gems-operation"],
      },
    },
    { // Path defined with an URL parameter
      method: 'GET',
      path: '/videos/:gemId', // Pass
      handler: 'video.getVideoById',
      config: {
        middlewares: ["api::collection.share-collection"],
      },
    },
    { // Path defined with an URL parameter
      method: 'PUT',
      path: '/videos/:gemId', // Pass
      handler: 'video.updateVideo',
      config: {
        middlewares: ["api::gem.gems-operation"],
      },
    },
    { // Path defined with an URL parameter
      method: 'POST',
      path: '/pdf',
      handler: 'pdf.createPDF', // Pass
      config: {
        middlewares: ["api::gem.gems-operation", "api::gem.plan-service"],
      },
    },
    { // Path defined with an URL parameter
      method: 'GET',
      path: '/pdf', // Get all pdf added by the logged in user so no need to validate the permissions
      handler: 'pdf.getAllPDF',
    },
    { // Path defined with an URL parameter
      method: 'DELETE',
      path: '/pdf/:gemId', // Pass
      handler: 'pdf.deletePDF',
      config: {
        middlewares: ["api::gem.gems-operation"],
      },
    },
    { // Path defined with an URL parameter
      method: 'GET',
      path: '/pdf/:gemId', // Pass
      handler: 'pdf.getPDFById',
      config: {
        middlewares: ["api::collection.share-collection"],
      },
    },
    { // Path defined with an URL parameter
      method: 'PUT',
      path: '/pdf/:gemId', // Pass
      handler: 'pdf.updatePDF',
      config: {
        middlewares: ["api::gem.gems-operation"],
      },
    },
    { // Path defined with an URL parameter
      method: 'POST',
      path: '/kindle-highlight', // Pass
      handler: 'kindle-highlight.createKindleHighlight',
      config: {
        middlewares: ["api::gem.gems-operation", "api::gem.plan-service"],
      },
    },
    {
      method: 'POST',
      path: '/delete-bookmarks', // Pass
      handler: 'gem.bulkDeleteGem',
      config: {
        middlewares: ["api::gem.bulk-gems"],
      },
    },
    {
      method: 'GET',
      path: '/all-highlights/:gemId',
      handler: 'gem.getHighlightsData',
      config: {
        middlewares: ["api::gem.gems-operation"],
      }
    },
    {
      method: 'GET',
      path: '/cache-details',
      handler: 'gem.getDetailsMicrolinkAndIframely',
    },
  ]
}