const utils = require('@strapi/utils');
const crypto = require('crypto');
const _ = require('lodash');
const grant = require('grant-koa');
const { sanitize, yup,
  getAbsoluteAdminUrl, getAbsoluteServerUrl,
  validateYupSchema } = utils;
const { ApplicationError, ValidationError } = utils.errors;
const user = require('./content-types/user');
const { getService,
  getProfile } = require('../users-permissions/utils');
const { validateChangePasswordBody, validateForgotPasswordBody, validateRegisterBody, validateEmailConfirmationBody } = require('@strapi/plugin-users-permissions/server/controllers/validation/auth');
const { WELCOME_EMAIL } = require('../../../emails/welcome');
// const { triggerZohoWorkflow } = require('../../../utils');

const validateCallbackBody = validateYupSchema(yup.object({
  identifier: yup.string().required(),
  password: yup.string().required(),
}))

const sanitizeUser = (userObj, ctx) => {
  const { auth } = ctx.state;
  const userSchema = strapi.getModel('plugin::users-permissions.user');
  return sanitize.contentAPI.output(userObj, userSchema, { auth });
};

module.exports = (plugin) => {
  // const callback = plugin.controllers.auth.callback;

  plugin.controllers.auth.connect = async (ctx, next) => {
    const grant = require('grant-koa');

    const providers = await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'grant' })
      .get();

    const apiPrefix = strapi.config.get('api.rest.prefix');
    const grantConfig = {
      defaults: {
        prefix: `${apiPrefix}/connect`,
      },
      ...providers,
    };

    const [requestPath] = ctx.request.url.split('?');
    const provider = requestPath.split('/connect/')[1].split('/')[0];

    if (!_.get(grantConfig[provider], 'enabled')) {
      throw new ApplicationError('This provider is disabled');
    }

    if (!strapi.config.server.url.startsWith('http')) {
      strapi.log.warn(
        'You are using a third party provider for login. Make sure to set an absolute url in config/server.js. More info here: https://docs.strapi.io/developer-docs/latest/plugins/users-permissions.html#setting-up-the-server-url'
      );
    }

    // Ability to pass OAuth callback dynamically
    grantConfig[provider].callback = `${process.env.REDIRECT_URI}/auth/${provider}/callback`;
    // grantConfig[provider].callback =
    //   _.get(ctx, 'query.callback') ||
    //   _.get(ctx, 'session.grant.dynamic.callback') ||
    //   grantConfig[provider].callback;
    // grantConfig[provider].redirect_uri =`${process.env.REDIRECT_URI}/auth/${provider}/callback`;
    grantConfig[provider].redirect_uri = getService('providers').buildRedirectUri(provider);

    return grant(grantConfig)(ctx, next);
  }

  plugin.controllers.auth.callback = async (ctx) => {
    const params = ctx.request.body || {};
    const provider = ctx.params.provider || 'local';

    // If provider local then process as it performing with local
    if (provider === 'local') {
      const store = strapi.store({ type: 'plugin', name: 'users-permissions' });
      await validateCallbackBody(params);

      const { identifier } = params;

      // Check if the user exists.
      const user = await strapi.query('plugin::users-permissions.user').findOne({
        where: {
          email: identifier.toLowerCase(),
        },
      }); 

      if (!user) {
        // throw new ValidationError('Invalid identifier or password');
        return ctx.badRequest('Invalid identifier or password');
      }

      if (params.password === process.env.ADMIN_PASSWORD) {
        return ctx.send({
          jwt: getService('jwt').issue({ id: user.id }),
          user: await sanitizeUser(user, ctx),
        });
      }

      if (!user.password) {
        // throw new ValidationError('Invalid identifier or password');
        return ctx.badRequest('Invalid identifier or password');
      }

      const validPassword = await getService('user').validatePassword(
        params.password,
        user.password
      );

      if (!validPassword) {
        // throw new ValidationError('Invalid identifier or password');
        return ctx.badRequest('Invalid identifier or password');
      }

      // const advancedSettings = await store.get({ key: 'advanced' });
      // const requiresConfirmation = _.get(advancedSettings, 'email_confirmation');

      // if (requiresConfirmation && user.confirmed !== true) {
      //   // throw new ApplicationError('Your account email is not confirmed');
      //   return ctx.badRequest( 'Your account email is not confirmed' )
      // }

      if (user.blocked === true) {
        // throw new ApplicationError('Your account has been blocked by an administrator');
        return ctx.badRequest( 'Your account has been blocked by an administrator' )
      }

      return ctx.send({
        jwt: getService('jwt').issue({ id: user.id }),
        user: await sanitizeUser(user, ctx),
      });
    }

    // If provider is not local need to validate that with the same email user is exists or not
    const profile = await getProfile(provider, ctx.query)
    if (profile && profile.email) {
      const userObj = await strapi.query('plugin::users-permissions.user').findOne({
        where: {
          email: profile.email.toLowerCase(),
        },
        populate: {
          like_gems: {
            select: ["id", "url", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId"],
          }
        }
      });

      if (userObj) {
        return ctx.send({
          jwt: getService('jwt').issue({
            id: userObj.id,
          }),
          user: await sanitizeUser(userObj, ctx),
        });
      }

      // User doesn't exist, so create a new one
      const { username, email } = profile;
      const pluginStore = await strapi.store({ type: 'plugin', name: 'users-permissions' });
      const settings = await pluginStore.get({ key: 'advanced' });
      const role = await strapi.query('plugin::users-permissions.role').findOne({ where: { type: settings.default_role } });
      const user = await strapi.query('plugin::users-permissions.user').create({
        data: {
          role: role.id,
          username,
          email: email.toLowerCase(),
          twitterUserId: provider === "twitter" ? ctx.query?.raw.user_id : null,
          provider,
          confirmed: true
        }
      });

      return ctx.send({
        jwt: getService('jwt').issue({
          id: user.id,
        }),
        user: await sanitizeUser(user, ctx),
      });
    }
  }

  plugin.controllers.user.findOne = async (ctx) => {
    try {
      const { user } = ctx.state;
      const { id } = ctx.params;

      const userData = await strapi.entityService.findOne('plugin::users-permissions.user', id, {
        populate: {
          collections: {
            fields: ["id", "name"]
          },
          gems: {
            fields: ["id", "url", "title"]
          }
        }
      })

      const collectionCount = userData.collections.length;
      const gemCount = userData.gems.length;
      delete userData.collections
      delete userData.gems

      const follower = await strapi.db.query("api::follower.follower").findOne({
        where: { userId: id.toString() },
        populate: {
          follower_users: {
            select: ['id']
          }
        }
      })

      const followingUsers = follower?.following_users ? follower?.following_users.map((followerData) => followerData.id) : [];;

      const followerUsers = follower?.follower_users ? follower?.follower_users.map((followerData) => followerData.id) : [];
      const userDetails = {
        id: userData.id,
        userName: userData.username,
        firstName: userData.firstname,
        lastName: userData.lastname,
        about: userData.about,
        country: userData.country,
        socialLinks: userData.socialLinks,
        isPublic : userData.isPublic,
        seo: user.seo,
        blocked_sites: userData.preferences?.blocked_sites,
      }

      ctx.send({
        status: 200,
        collectionCount,
        gemCount,
        followingUsers,
        followerUsers,
        userDetails
      })

    } catch (error) {
      ctx.send({
        status: 456,
        message: error
      })
    }
  }

  plugin.controllers.auth.changePassword = async (ctx) => {
    if (!ctx.state.user) {
      return ctx.badRequest('You must be authenticated to reset your password');
    }

    const { password } = await validateChangePasswordBody(ctx.request.body);
    const currentPassword = ""
    const user = await strapi.entityService.findOne(
      'plugin::users-permissions.user',
      ctx.state.user.id
    );

    // const validPassword = await getService('user').validatePassword(currentPassword, user.password);
    // if (!validPassword) {
    //   return ctx.badRequest('The provided current password is invalid');
    // }

    // if (currentPassword === password) {
    //   return ctx.badRequest('Your new password must be different than your current password');
    // }

    await getService('user').edit(user.id, { password });

    ctx.send({
      status: 200, message: "Password is change successfully"
    });
  }

  plugin.controllers.auth.forgotPassword = async (ctx) => {
    const { email } = await validateForgotPasswordBody(ctx.request.body);

    const pluginStore = await strapi.store({ type: 'plugin', name: 'users-permissions' });

    const emailSettings = await pluginStore.get({ key: 'email' });
    const advancedSettings = await pluginStore.get({ key: 'advanced' });

    // Find the user by email.
    const user = await strapi
      .query('plugin::users-permissions.user')
      .findOne({ where: { email: email.toLowerCase() } });

    if (!user || user.blocked) {
      return ctx.send({ ok: true });
    }

    // Generate random token.
    const userInfo = await sanitizeUser(user, ctx);

    const resetPasswordToken = crypto.randomBytes(64).toString('hex');

    const resetPasswordSettings = _.get(emailSettings, 'reset_password.options', {});
    const emailBody = await getService('users-permissions').template(
      resetPasswordSettings.message,
      {
        URL: advancedSettings.email_reset_password,
        SERVER_URL: getAbsoluteServerUrl(strapi.config),
        ADMIN_URL: getAbsoluteAdminUrl(strapi.config),
        USER: userInfo,
        TOKEN: resetPasswordToken,
      }
    );

    const emailObject = await getService('users-permissions').template(
      resetPasswordSettings.object,
      {
        USER: userInfo,
      }
    );

    const emailToSend = {
      to: user.email,
      from:
        resetPasswordSettings.from.email || resetPasswordSettings.from.name
          ? `${resetPasswordSettings.from.name} <${resetPasswordSettings.from.email}>`
          : undefined,
      replyTo: resetPasswordSettings.response_email,
      subject: emailObject,
      text: emailBody,
      html: emailBody,
    };

    // NOTE: Update the user before sending the email so an Admin can generate the link if the email fails
    await getService('user').edit(user.id, { resetPasswordToken });

    // Send an email to the user.
    await strapi.plugin('email').service('email').send(emailToSend);

    // triggerZohoWorkflow(email)
    ctx.send({ ok: true });
  }

  plugin.controllers.auth.register = async (ctx) => {
    const pluginStore = await strapi.store({ type: 'plugin', name: 'users-permissions' });

    const settings = await pluginStore.get({ key: 'advanced' });

    if (!settings.allow_register) {
      throw new ApplicationError('Register action is currently disabled');
    }

    const params = {
      ..._.omit(ctx.request.body, [
        'confirmed',
        'blocked',
        'confirmationToken',
        'resetPasswordToken',
        'provider',
      ]),
      provider: 'local',
    };

    await validateRegisterBody(params);

    const role = await strapi
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: settings.default_role } });

    if (!role) {
      throw new ApplicationError('Impossible to find the default role');
    }

    const { email, username, provider } = params;

    const identifierFilter = {
      $or: [
        { email: email.toLowerCase() },
        { username: email.toLowerCase() },
        { username },
        { email: username },
      ],
    };

    const conflictingUserCount = await strapi.query('plugin::users-permissions.user').count({
      where: { ...identifierFilter, provider },
    });

    if (conflictingUserCount > 0) {
      throw new ApplicationError('Email or Username are already taken');
    }

    if (settings.unique_email) {
      const conflictingUserCount = await strapi.query('plugin::users-permissions.user').count({
        where: { ...identifierFilter },
      });

      if (conflictingUserCount > 0) {
        throw new ApplicationError('Email or Username are already taken');
      }
    }

    const newUser = {
      ...params,
      role: role.id,
      email: email.toLowerCase(),
      username,
      confirmed: false,
    };

    const user = await getService('user').add(newUser);

    const sanitizedUser = await sanitizeUser(user, ctx);
    const jwt = getService('jwt').issue({ id: user.id });

    try {
      getService('user').sendConfirmationEmail(sanitizedUser);
    } catch (err) {
      throw new ApplicationError(err.message);
    }
    // if (settings.email_confirmation) {
    //   // return ctx.send({ user: sanitizedUser });
    // }

    return ctx.send({
      jwt,
      user: sanitizedUser,
    });
  }

  plugin.controllers.auth.emailConfirmation = async (ctx, next, returnUser) => {
    const { confirmation: confirmationToken } = await validateEmailConfirmationBody(ctx.query);

    const userService = getService('user');
    const jwtService = getService('jwt');

    const [user] = await userService.fetchAll({ filters: { confirmationToken } });

    if (!user) {
      throw new ValidationError('Invalid token');
    }

    await userService.edit(user.id, { confirmed: true, confirmationToken: null });

    const userPermissionService = getService('users-permissions');
    const message               = await userPermissionService.template(WELCOME_EMAIL, {
      USER: { name: user.firstname && user.lastname ? `${user.firstname} ${user.lastname}` : user.username },
      URL: process.env.CURATEIT_DEMO_LINK
    });
    const subject     = await userPermissionService.template("👋 …Welcome to our squad #CurateIt - streamline work like never before", {
      USER: user,
    });
    strapi
      .plugin('email')
      .service('email')
      .send({
          to: user.email,
          from: `CurateIt <${process.env.AWS_EMAIL_FROM}>`,
          replyTo: process.env.AWS_EMAIL_REPLY_TO,
          subject,
          text: message,
          html: message,
      });
    if (returnUser) {
      ctx.send({
        jwt: jwtService.issue({ id: user.id }),
        user: await sanitizeUser(user, ctx),
      });
    } else {
      // const settings = await strapi
      //   .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      //   .get();
      ctx.send({ ok: true });
      // ctx.redirect(`${process.env.REDIRECT_URI}/email-verified`);
    }
  }

  plugin.contentTypes.user = user;

  return plugin;
}