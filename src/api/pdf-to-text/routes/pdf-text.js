'use strict';

/**
 * pdf-to-text router
 */

module.exports = {
    routes: [
        {
         method: 'POST',
         path: '/pdf', // Need to remove access because it is not in use and revalidate and refactor this api
         handler: 'pdf-text.getPdfToText',
         config: {
           policies: [],
           middlewares: ["api::gem.plan-service"],
         },
        },
        {
          method: 'POST',
          path: '/pdfstore', // No gem or collection operation perform so no need to check permissions over here
          handler: 'pdf-text.pdfStore',
        },
        {
          method: 'POST',
          path: '/highlightpdf', // Pass
          handler: 'pdf-text.createHighlightPdf',
          config: {
            middlewares: ["api::gem.gems-operation", "api::gem.plan-service"],
          },
        },
        {
          method: 'GET',
          path: '/highlightpdf', // It is getting all the highlights created by the logged in user only so no need to validate the permisions
          handler: 'pdf-text.getPdfHighlight',
        },
        {
          method: 'GET',
          path: '/collections/:collectionId/highlightpdf/:gemId',  // Pass
          handler: 'pdf-text.getPdfHighlightById',
          config: {
            middlewares: ["api::ocr.ocr-gems"],
          },
        },
        {
          method: 'PUT',
          path: '/collections/:collectionId/highlightpdf/:gemId', // Pass
          handler: 'pdf-text.updatePdfHighlight',
          config: {
            middlewares: ["api::ocr.ocr-gems"],
          },
        },
        {
          method: 'DELETE',
          path: '/collections/:collectionId/highlightpdf/:gemId', // Pass
          handler: 'pdf-text.deletePdfHighlight',
          config: {
            middlewares: ["api::ocr.ocr-gems"],
          },
        },


        {
          method: 'GET',
          path: '/pdftext',
          handler: 'pdf-text.linkPdfToText', // collection access or not any gem operation is being performed so no need to check permission for it
          config: {
            policies: [],
            middlewares: [],
          },
         },
      ],
}