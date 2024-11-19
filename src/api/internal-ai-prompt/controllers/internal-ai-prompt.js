'use strict';

/**
 * internal-ai-prompt controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const axios = require('axios');


module.exports = createCoreController('api::internal-ai-prompt.internal-ai-prompt', ({ strapi }) => ({

    // async aiTemplates (ctx) {
    //     try {

    //         // // Replace 'YOUR_API_KEY' with your actual GPT-3 API key
    //         // const apiKey = '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';
    //         // const apiUrl = 'https://api.openai.com/v1/engines/davinci-codex/completions'; // GPT-3 API endpoint

    //         // const prompt = 'Generate a template for a blog post about ';

    //         // axios.post(apiUrl, {
    //         //     prompt: prompt,
    //         //     max_tokens: 200, // Adjust the maximum number of tokens in the generated response
    //         // }, {
    //         //     headers: {
    //         //         'Content-Type': 'application/json',
    //         //         'Authorization': `Bearer ${apiKey}`
    //         //     }
    //         // })
    //         //     .then(response => {
    //         //         // Handle the API response
    //         //         console.log(response.data.choices[0].text.trim());
    //         //     })
    //         //     .catch(error => {
    //         //         // Handle errors
    //         //         console.error(error);
    //         //     });

    //         // const { content } = req.body;

    //         // Use GPT-3 to generate a template based on the content
    //         const template = await this.generateTemplate(content);
    //         console.error("template=======>", template);
          
    //         // Return the generated template to the frontend
    //         // res.json({ template });
    //     } catch (error) {
    //         ctx.send({ stutas: 400, message: error.message })
    //     }
    // },

    // async generateTemplate(content) {
    //     // Make a request to the OpenAI API
    //     const response = await axios.post(
    //       'https://api.openai.com/v1/engines/davinci-codex/completions',
    //       {
    //         prompt: `Create a template using this: ${content}`,
    //         max_tokens: 200,
    //       },
    //       {
    //         headers: {
    //           'Content-Type': 'application/json',
    //           Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    //         },
    //       }
    //     );
      
    //     // Extract and return the generated text
    //     return response.data.choices[0].text.trim();
    //   }
}));
