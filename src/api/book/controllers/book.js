'use strict';

/**
 * book controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::book.book', {

    getBookByName: async (ctx) => {
        try {

            if (ctx.request.query.name == undefined) {
                throw "Please enter a Book Name";
            };

            const bookName = ctx.request.query.name;

            const data = await strapi.service('api::book.book').getBookByName(bookName);

            return data;
        } catch (error) {
            return { status: 400, message: error };
        }
    },

    createBookGem: async (ctx) => {
        
        const id = ctx.request.query.bookId;

        try {
            
            if (ctx.request.query.bookId == undefined) {
                throw "Please enter a Book Id";
            };
            
            const data = await strapi.service('api::book.book').createBookGem(id);

            return data;
        } catch (error) {
            return { status: 400, message: error };
        }
    },

    getAllBook: async (ctx) => {
        try {
            const userId = ctx.state.user.id;

            const data = await strapi.service('api::book.book').getAllBook(userId);

            return data;
        } catch (error) {
            return { status: 400, message: error };
        }
    },

    getBookById: async (ctx) => {
        try {
            const gemId = ctx.params.gemId;

            const data = await strapi.service('api::book.book').getBookById(gemId);

            return data;
        } catch (error) {
            return { status: 400, message: error };
        }
    },

    updateBook: async (ctx) => {
        try {

            const body = ctx.request.body;
            const gemId = ctx.params.gemId;

            const data = await strapi.service('api::book.book').updateBook(body, gemId);

            ctx.send(data)
        } catch (error) {
            ctx.send({ status: 400, message: error });
        };
    },

    deleteBook: async (ctx) => {
        try {
            const gemId = ctx.params.gemId;

            const data = await strapi.service('api::book.book').deleteBook(gemId);

            return { status: 200, message: "Book data deleted" };

        } catch (error) {
            return { status: 400, message: error };
        }
    },


});
