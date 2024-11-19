'use strict';

/**
 * openai service
 */

const { createCoreService } = require('@strapi/strapi').factories;
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Anthropic = require('@anthropic-ai/sdk');
const { PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { default: axios } = require('axios');

module.exports = createCoreService('api::openai.openai', ({ strapi }) => ({
    openai: async (body, query) => {
        try {

            const { Configuration, OpenAIApi } = require("openai");

            const configuration = new Configuration({
                apiKey: process.env.PROD_OPENAI_API_KEY,
            });
            const openai = new OpenAIApi(configuration);
            // if (body.mode === 'Complete') {
            //     const response = await openai.createCompletion({
            //         model: body.model,
            //         prompt: `${body.prompt}\n\n\n${body.text}\n\n`,
            //         temperature: 0.7,
            //         max_tokens: body.max_length,
            //         top_p: 1,
            //         frequency_penalty: 0,
            //         presence_penalty: 0,
            //     });
              
            //     return response.data.choices[0].text.replace(/\n/g, '');

            // } else if (body.mode === 'Insert') {

            //     const prefix = body.prompt.split('[Insert]')[0].trim();
            //     const suffix = body.prompt.split('[Insert]')[1].trim();
                
            //     const response = await openai.createCompletion({
            //         model: body.model,
            //         prompt: prefix,
            //         suffix: suffix,
            //         temperature: 0.7,
            //         max_tokens: body.max_length,
            //         top_p: 1,
            //         frequency_penalty: 0,
            //         presence_penalty: 0,
            //     });

            //     return response.data.choices[0].text.replace(/\n/g, '');
            // } else if (body.mode === "Edit") {
            //     const response = await openai.createEdit({
            //         model: body.model,
            //         input: body.text,
            //         instruction: body.prompt,
            //         temperature: 0.7,
            //         top_p: 1,
            //     });

            //     return response.data.choices[0].text.replace(/\n/g, '');

            // } else {

                // const promptsData = await strapi.db.query('api::internal-ai-prompt.internal-ai-prompt').findOne({
                //     filters: { promptType: 'Youtube Summary' }
                // });

                // const prompt = promptsData.prompt.replace(/{Text}/g, body.text);

                let prompt
                if (query?.isSummary) {
                    const promptsData = await strapi.db.query('api::internal-ai-prompt.internal-ai-prompt').findOne({
                        filters: { promptType: 'Youtube Summary' }
                    });
                    prompt = promptsData.prompt.replace(/{Text}/g, body.text);
                }
                if (query?.isCitation) {
                    const promptsData = await strapi.db.query('api::internal-ai-prompt.internal-ai-prompt').findOne({
                        filters: { promptType: 'Citation' }
                    });
                    prompt = promptsData.prompt.replace(/{date}/g, body?.date).replace(/{month}/g, body?.month).replace(/{year}/g, body?.year).replace(/{value}/g, body?.text).replace(/{url}/g, body?.url)
                }
                

                const response = await openai.createCompletion({
                    model: "gpt-3.5-turbo-instruct",
                    prompt: prompt,
                    temperature: 1,
                    max_tokens: 256,
                    top_p: 1,
                    frequency_penalty: 0,
                    presence_penalty: 0,
                  });

                  return response.data.choices[0].text.replace(/\n/g, '');
            // }
        } catch (error) {
            return error;
        }
    },

    processAndSendAIResponse: async (body, platform, user) => {
        if (platform === "openai") {
            try {
                const { Configuration, OpenAIApi } = require("openai");
    
                const configuration = new Configuration({
                    apiKey: process.env.PROD_OPENAI_API_KEY,
                });
    
                const openai = new OpenAIApi(configuration);
    
                const response = await openai.createChatCompletion({
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: body.prompt }],
                });
    
                return response.data.choices[0].message.content;
            }
            catch (err) {
                return err?.response?.data?.error;
            }
        }

        const aiPlatform = body.selectedModel?.model || user?.ai_settings?.defaultModel || null;
        const lang       = body?.selectedLanguage || user?.ai_settings?.defaultLanguage;
        const voiceId    = body?.selectedVoice?.selectedVoice || user?.ai_settings?.defaultBrandVoiceId;
        const personaId  = body?.selectedPersona?.selectedPersona || user?.ai_settings?.defaultBrandPersona;
        const promptId   = body?.selectedPrompt || null;

        let voiceRef     = null;
        let personaRef   = null;
        let selectedPrompt = null;

        if (voiceId) {
            voiceRef     = await strapi.entityService.findOne("api::ai-brand.ai-brand", parseInt(voiceId))
        }

        if (personaId) {
            personaRef   = await strapi.entityService.findOne("api::ai-brand.ai-brand", parseInt(personaId))
        }

        if (promptId) {
            const gem       = await strapi.entityService.findOne("api::gem.gem", parseInt(promptId))
            selectedPrompt  = gem?.expander?.find(item => item.type === "prompt")?.plainText
        }

        const mainPrompt = await strapi.db.query('api::internal-ai-prompt.internal-ai-prompt').findOne({
            where: {
                promptType: "Main Chat Prompt"
            }
        })

        if (!mainPrompt) return null

        const finalPrompt = `${body.prompt} ${mainPrompt?.prompt?.replace("{persona_desc}", personaRef?.description || "")
                                       .replace("{voice_desc}", voiceRef?.description || "")
                                       .replace("{language}", lang)
                                       .replace("{prompt}", selectedPrompt || "")
                                       .replace("{includes}", body?.selectedHashTag?.join(", "))}`

        if (aiPlatform?.includes("gpt")) {
            const gptAIKey      = user?.ai_settings?.openAIKey || process.env.PROD_OPENAI_API_KEY;
            const { 
                Configuration, 
                OpenAIApi 
            }                   = require("openai");
            const configuration  = new Configuration({
                apiKey: gptAIKey,
            });
            const openai         = new OpenAIApi(configuration);
            const chatRes        = await openai.createChatCompletion({
                model: aiPlatform,
                messages: [{ 
                    role: "user", 
                    content: finalPrompt
                }],
            })

            return chatRes?.data?.choices?.[0]?.message?.content;
        }
        
        if (aiPlatform?.includes("gemini")) {
            const geminiAIKey   = user?.ai_settings?.geminiAPIKey || process.env.PROD_GEMINI_API_KEY;
            const googleAI      = new GoogleGenerativeAI(geminiAIKey);
            const geminiConfig  = {
                temperature: 0.9,
                topP: 1,
                topK: 1,
                maxOutputTokens: 100000,
            };
            const geminiModel   = googleAI.getGenerativeModel({
                model: aiPlatform,
                geminiConfig,
            });

            const result        = await geminiModel.generateContent(finalPrompt);
            console.log("1", result)
            const response      = result.response;
            console.log("2", response)
            return response.text()
        }
        
        if (aiPlatform?.includes("claude")) {
            const claudeAIKey   = user?.ai_settings?.claudeAPIKey || process.env.PROD_CLAUDE_API_KEY;

            const anthropic     = new Anthropic({
                apiKey: claudeAIKey
            });
            try {
                const message       = await anthropic.messages.create({
                    max_tokens: 4096,
                    messages: [{ role: 'user', content: finalPrompt }],
                    model: aiPlatform,
                });

                return message.content?.[0]?.text
            }
            catch (err) {
                console.log(err)
            }
        }

        return null
    },

    repharsePrompt: async (prompt, user) => {
        const rephraseExistingPrompt = await strapi.db.query('api::internal-ai-prompt.internal-ai-prompt').findOne({
            where: {
                promptType: "Rephrase Prompt"
            }
        })

        if (!rephraseExistingPrompt) return null

        const { Configuration, OpenAIApi } = require("openai");
    
        const configuration = new Configuration({
            apiKey: process.env.PROD_OPENAI_API_KEY,
        });
    
        const openai = new OpenAIApi(configuration);

        const response = await openai.createChatCompletion({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: rephraseExistingPrompt?.prompt?.replace("{prompt}", prompt) }],
        });

        return response?.data?.choices?.[0]?.message?.content;
    },
    textToSpeechWithOpenai: async (text, voice, isDemoLink, user) => {
        const gptAIKey          = user?.ai_settings?.openAIKey || process.env.PROD_OPENAI_API_KEY;
        
        const res               = await axios.post(`https://api.openai.com/v1/audio/speech`, {
            model: "tts-1",
            input: text,
            voice: voice,
        }, {
            headers: {
                Authorization: `Bearer ${gptAIKey}`
            },
            responseType: 'arraybuffer'
        })

        const mp3               = res?.data

        if (!mp3) return null

        const buffer            = Buffer.from(mp3);

        const { 
            AWS_BUCKET, 
            AWS_ACCESS_KEY_ID, 
            AWS_ACCESS_SECRET, 
            AWS_BASE_URL } = process.env;

        const s3Client = new S3Client({
            credentials: {
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_ACCESS_SECRET,
            },
        });
            
        const params = {
            Bucket: AWS_BUCKET,
            Key: isDemoLink ? `common/chat-responses/demos/${voice}.mp3` : `common/chat-responses/${user.id}/${Date.now()}.mp3`,
            Body: buffer,
            ContentType: "audio/mpeg",
            ACL: "public-read",
        };
        await s3Client.send(new PutObjectCommand(params));
        return `${AWS_BASE_URL}/${params.Key}`;
    }
}));

