'use strict';

/**
 * movies-view-list service
 */

const { createCoreService } = require('@strapi/strapi').factories;
const axios = require("axios");

module.exports = createCoreService('api::movies-view-list.movies-view-list', {

    searchByMovieName: async (name) => {
        try {

            const options = {
                method: 'GET',
                url: 'https://mdblist.p.rapidapi.com/',
                params: { s: name },
                headers: {
                    'X-RapidAPI-Key': process.env.X_RAPIDAPI_KEY,
                    'X-RapidAPI-Host': 'mdblist.p.rapidapi.com'
                }
            };

            let imdbId;

            await axios.request(options).then(function (response) {
                imdbId = response.data.search;
            }).catch(function (error) {
                console.error(error);
            });

            return imdbId;
        } catch (error) {
            console.log(error);
        }
    },

    createMovieGem: async (id) => {
        try {

            const options = {
                method: 'GET',
                url: 'https://mdblist.p.rapidapi.com/',
                params: { i: id },
                headers: {
                    'X-RapidAPI-Key': process.env.X_RAPIDAPI_KEY,
                    'X-RapidAPI-Host': 'mdblist.p.rapidapi.com'
                }
            };

            const movieRes = await axios(options)
            const result   = (movieRes.error === undefined) ? movieRes.data : null;
            if (result === null || result.response === false) {
                return null;
            }
            const rating = result?.ratings?.[0]?.value;
            let keywords = []
            result.keywords.map(data => keywords.push(data.name));

            const movieObj = {
                data: {
                    title: result.title,
                    description: result.description,
                    url: `https://www.imdb.com/title/${id}`,
                    entityObj: result,
                    ratings: rating,
                    image: result.poster
                }
            }

            return movieObj;
        } catch (error) {
            console.log(error);
        }
    },

    getAllMovie: async (userId) => {
        try {
            const books = await strapi.entityService.findMany("api::gem.gem", {
                filters: { author: userId, media_type: "Movies" }
            });

            return books;
        } catch (error) {
            console.log(error);
        }
    },

    getMovieByGemId: async (gemId) => {
        try {

            const moviesGem = await strapi.entityService.findOne("api::gem.gem", gemId, {
                populate: '*'
            });

            return moviesGem;
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

    deleteMovieGem: async (gemId) => {
        try {

            const moviesGem = await strapi.entityService.delete("api::gem.gem", gemId);

            return moviesGem;
        } catch (error) {
            console.log(error);
        }
    }
});