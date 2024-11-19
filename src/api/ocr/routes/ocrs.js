module.exports = {
    routes: [
      {
        method: 'POST',
        path: '/ocre', // Pass
        handler: 'ocrs.storeImage',
        config: {
          middlewares: [
            "api::ocr.plan-service",
            "api::gem.gems-operation"
          ],
        },
      },
      {
        method: 'GET',
        path: '/ocre', // This is giving the data according to the logged in user only so there is no need to validate the permissions
        handler: 'ocrs.getImageOcr',
      },
      {
        method: 'GET',
        path: '/collections/:collectionId/ocre/:gemId', // "Pass"
        handler: 'ocrs.getImageOcrById',
        config: {
          middlewares: ["api::ocr.ocr-gems"],
        },
      },
      {
        method: 'PUT',
        path: '/collections/:collectionId/ocre/:gemId', // Pass
        handler: 'ocrs.updateImageOcr',
        config: {
          middlewares: ["api::ocr.ocr-gems"],
        },
      },
      {
        method: 'DELETE',
        path: '/collections/:collectionId/ocre/:gemId', // Pass
        handler: 'ocrs.deleteImageOcr',
        config: {
          middlewares: ["api::ocr.ocr-gems"],
        },
      },
      {
        method: 'POST',
        path: '/imageocr', // Need to revalidate and revamp this api
        handler: 'ocrs.fileImageToText',
        config: {
          policies: [],
          middlewares: ["api::ocr.plan-service"],
        },
       },
    ],
  };