'use strict';

/**
 * book controller
 */
const { createCoreController }  = require('@strapi/strapi').factories;
const axios                     = require('axios');

module.exports = createCoreController('api::book.book', {

    getPlatformProfile: async (ctx) => {
        const { url } = ctx.request.query;

        const res = await axios({
            method: "get",
            headers: {
              'Accept': 'application/json',
              'Accept-Encoding': 'identity'
            },
            url: `https://iframe.ly/api/iframely?url=${encodeURIComponent(url)}/&api_key=${process.env.IFRAMELY_API_KEY}&iframe=1&omit_script=1`
        });
        
        if (res.data.error) return ctx.send({ msg: res.data.error })
        return ctx.send({ msg: 'Platform profile', data: res.data })
    }


});
