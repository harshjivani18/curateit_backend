'use strict';

const { convertRestQueryParams } = require('strapi-utils/lib');
const url                        = require('url');

/**
 * gem controller
 */

const puppeteer                 = require('puppeteer');
const { createCoreController }  = require('@strapi/strapi').factories;

module.exports = createCoreController('api::gem.gem', ({strapi}) => ({

    getFullPageScreenshot: async (ctx) => {
        const { url,
                width,
                height,
                cx,
                cy,
                cw,
                ch,
                scrollX,
                scrollY 
              }         = ctx.query;
        const h         = height ? parseInt(height) : 0;
        const w         = width ? parseInt(width) : 0;
        const clipX     = cx ? parseInt(cx) : 0;
        const clipY     = cy ? parseInt(cy) : 0;
        const clipW     = cw ? parseInt(cw) : 0;
        const clipH     = ch ? parseInt(ch) : 0;
        const browser   = await puppeteer.launch();
        const page      = await browser.newPage();
        let screenshot  = null;
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        if (cx && cy && cw && ch && scrollX && scrollY) {
            await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
            screenshot  = await page.screenshot({ 
                clip: { 
                    x: clipX + parseInt(scrollX),
                    y: clipY + parseInt(scrollY), 
                    width: clipW, 
                    height: clipH
                }, 
                type: 'jpeg' 
            })
        }
        else { 
            await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
            screenshot  = await page.screenshot({ 
                fullPage: true, 
                type: 'jpeg'
            });
        }
        await browser.close();

        const finalURL  = await strapi.service("api::upload-file.upload-file").uploadFileFrombase64(screenshot, `common/screenshots/${Date.now()}-${w !== 0 ? w : clipW}-${h !== 0 ? h : clipH}.jpg`);
        ctx.send(finalURL);
    },

    updateGemScreenshot: async (ctx) => {
        const { user }  = ctx.state
        if (user) {
            const { url }   = ctx.request.query
            const browser   = await puppeteer.launch();
            const page      = await browser.newPage();
            await page.goto(url, { waitUntil: 'networkidle2' });
            const screenshot  = await page.screenshot({ type: 'jpeg' });
            const finalURL  = await strapi.service("api::upload-file.upload-file").uploadFileFrombase64(screenshot, `common/users/${user.id}/screenshots/cover-${Date.now()}}.jpg`);
            return ctx.send(finalURL);
        }
        return ctx.send({ message: "User not found" })
    },
     
    updateScreenshot: async (ctx) => {
        const { s3URL,
                // gemId,
                image }  = ctx.request.body;
        const paresedURL = url.parse(s3URL);
        const s3Path     = paresedURL.pathname;
        const s3Key      = s3Path.charAt(0) === '/' ? s3Path.substring(1) : s3Path;
        const finalURL   = await strapi.service("api::upload-file.upload-file").uploadFileFrombase64(Buffer.from(image.split(',')[1], 'base64'), s3Key);
        ctx.send(finalURL);      
    },

    saveBase64ToBucket: async (ctx) => {
        const { 
            key,
            base64 }     = ctx.request.body;
        const finalURL  = await strapi.service("api::upload-file.upload-file").uploadFileFrombase64(Buffer.from(base64.split(',')[1], 'base64'), key);
        return ctx.send(finalURL);      
    },

    storeScreenshot: (ctx) => {
        if (!ctx.request.files) {
            return ctx.send({ msg: "No file exists" }, 400);
        }
        const { user }          = ctx.state 
        const { files }         = ctx.request.files;

        const finalURL          = strapi.service("api::upload-file.upload-file").storeImageScreenshot(files, `users/${user.id}/screenshots`);
        ctx.send([finalURL]);      
    }

}));
