'use strict';

/**
 * book service
 */

const { createCoreService } = require('@strapi/strapi').factories;
const fetch = require('node-fetch')

module.exports = createCoreService('api::book.book', {

    getBookByName: async (name) => {
        try {

            const books = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${name}&key=${process.env.GOOGLE_BOOK_API_KEY}`);

            const bookJson = await books.json();

            return bookJson;
        } catch (error) {
            console.log(error);
        }
    },

    createBookGem: async (id) => {
        try {

            const books = await fetch(`https://www.googleapis.com/books/v1/volumes/${id}`);

            const result = await books.json();

            return result;
        } catch (error) {
            console.log(error);
        }
    },

    getAllBook: async (userId) => {
        try {
            const books = await strapi.entityService.findMany("api::gem.gem", {
                filters: {author: userId, media_type: "Books"}
            });

            return books;
        } catch (error) {
            console.log(error);
        }
    },

    getBookById: async(gemId) => {
        try {
            console.log("HEllo");
            const bookGem = await strapi.entityService.findOne("api::gem.gem", gemId, {
                populate: '*'
            });

            return bookGem;
        } catch (error) {
            console.log(error);
        }
    },

    updateMovie: async (body, gemId) => {
        try {

            const pdfOcrGem = await strapi.entityService.update('api::gem.gem', gemId, {
                data: {
                    
                }
            });

            return pdfOcrGem;
        } catch (error) {
            console.log(error);
        }
    },

    deleteBook: async(gemId) => {
        try {
            
            const bookGem = await strapi.entityService.delete("api::gem.gem", gemId);
        
            return bookGem;
        } catch (error) {
            console.log(error);
        }
    }
});
