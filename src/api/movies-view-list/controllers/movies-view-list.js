'use strict';

/**
 * movies-view-list controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::movies-view-list.movies-view-list', {

    searchByMovieName: async (ctx) => {
        try {
            if(!ctx.request.query.name){
                throw "Please enter a Movie Name";
            }

            const movieName = ctx.request.query.name;

            const data = await strapi.service('api::movies-view-list.movies-view-list').searchByMovieName(movieName);

            return data;
        } catch (error) {
            return {status: 400, message: error};
        }
    },

    createMovieGem: async (ctx) => {
        try {

            if(!ctx.request.query.imdbId){
                throw "Please enter a Movie Id";
            }

            const id = ctx.request.query.imdbId;
            
            const data = await strapi.service('api::movies-view-list.movies-view-list').createMovieGem(id);

            return data ? ctx.send(data) : ctx.badRequest("Movie not found");
        } catch (error) {
            return {status: 400, message: error};
        }
    },

    getAllMovie: async (ctx) => {
        try {
            const userId = ctx.state.user.id;

            const data = await strapi.service('api::movies-view-list.movies-view-list').getAllMovie(userId);

            return data;
        } catch (error) {
            return {status: 400, message: error};
        }
    },

    getMovieByGemId: async (ctx) => {
        try {
            const gemId = ctx.params.gemId;

            const data = await strapi.service('api::movies-view-list.movies-view-list').getMovieByGemId(gemId);

            return data;
        } catch (error) {
            return {status: 400, message: error};
        }
    },

    updateMovieGem: async (ctx) => {
        try {
    
          const body = ctx.request.body;
          const gemId = ctx.params.gemId;
    
          const data = await strapi.service('api::movies-view-list.movies-view-list').updateMovieGem(body, gemId);
    
          ctx.send(data)
        } catch (error) {
          ctx.send({ status: 400, message: error });
        };
      },

    deleteMovieGem: async (ctx) => {
        try {
            const gemId = ctx.params.gemId;

            const data = await strapi.service('api::movies-view-list.movies-view-list').deleteMovieGem(gemId);

            return {status: 200, message: "Movie data deleted"};
        } catch (error) {
            return {status: 400, message: error};
        }
    },
});