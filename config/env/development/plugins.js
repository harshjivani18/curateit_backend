module.exports = ({ env }) => {
    return ({
  
      "request-id": {
        enabled: true,
        'google-auth': {
          enabled: true,
        },
        'facebook-auth': {
          enabled: true,
        },
        'twitter-auth': {
          enabled: true,
        },
        'linkedin-auth': {
          enabled: true,
        },
        config: {
          correlationIdHeader: "X-Amzn-Trace-Id",
        },
      },
  
      email: {
        config: {
          provider: 'nodemailer',
          providerOptions: {
            host: 'smtp.zoho.eu',
            port: 587,
            secure: false,
            auth: { 
              user: process.env.EMAIL_ID,
              pass: process.env.EMAIL_PASSWORD,
            },
            tls: { rejectUnauthorized: false },
  
          },
          settings: {
            defaultFrom: process.env.EMAIL_ID,
            defaultReplyTo: process.env.EMAIL_ID,
          },
        }
      },
      
      upload: {
        config: {
          provider: 'aws-s3',
          providerOptions: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_ACCESS_SECRET,
            region: process.env.AWS_REGION,
            params: {
              Bucket: process.env.AWS_BUCKET,
            },
          },
          actionOptions: {
            upload: {},
            uploadStream: {},
            delete: {},
          },
        },
      },
      meilisearch: {
        config: {
          // Your meili host
          host: process.env.MEILISEARCH_HOST,
          // Your master key or private key
          apiKey: process.env.MEILISEARCH_API_KEY,
        },
      },
    });
  };
  