import { promisify } from 'util';
import { Injectable, Optional } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-openidconnect';
import bcrypt from 'bcryptjs';
import type { Request } from 'express';
import type { VerifyCallback } from 'passport-openidconnect';
import type { FactoryProvider } from '@nestjs/common/interfaces/modules/provider.interface';
import type { NcRequest } from '~/interface/config';
import Noco from '~/Noco';
import { UsersService } from '~/services/users/users.service';
import { BaseUser, Plugin, User } from '~/models';
import { sanitiseUserObj } from '~/utils';

@Injectable()
export class HackItStrategy extends PassportStrategy(Strategy, 'hackit') {
  constructor(
    @Optional() clientConfig: any,
    private usersService: UsersService,
  ) {
    super(clientConfig);
  }

  // When passReqToCallback is true, the verify callback for OpenIDConnect has these parameters:
  // req, iss, uiProfile, idProfile, context, idToken, accessToken, refreshToken, params, done
  async validate(
    req: NcRequest,
    iss: string,
    uiProfile: any,
    idProfile: any,
    context: any,
    idToken: string | undefined,
    accessToken: string | undefined,
    refreshToken: string | undefined,
    params: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      // Use uiProfile if available, otherwise use idProfile
      const profile = uiProfile || idProfile || {};
      
      // Try multiple ways to get email
      const email = profile.email || 
                   profile.emails?.[0]?.value || 
                   idProfile?.email ||
                   idProfile?.emails?.[0]?.value;
      
      if (!email) {
        return done(new Error('No email found in HackIt profile'));
      }

      const user = await User.getByEmail(email);
      if (user) {
        // if base id defined extract base level roles
        if (req.ncBaseId) {
          BaseUser.get(req.context, req.ncBaseId, user.id)
            .then(async (baseUser) => {
              user.roles = baseUser?.roles || user.roles;
              done(null, sanitiseUserObj(user));
            })
            .catch((e) => done(e));
        } else {
          return done(null, sanitiseUserObj(user));
        }
      } else {
        // Create new user if allowed
        const salt = await promisify(bcrypt.genSalt)(10);
        const userData = {
          email_verification_token: null,
          email: email,
          password: '',
          salt,
          firstname: profile.given_name || profile.name?.split(' ')[0] || '',
          lastname: profile.family_name || profile.name?.split(' ').slice(1).join(' ') || '',
          req,
        } as any;

        const user = await this.usersService.registerNewUserIfAllowed(userData);
        return done(null, sanitiseUserObj(user));
      }
    } catch (err) {
      return done(err);
    }
  }

  authorizationParams(options: any) {
    const params = super.authorizationParams(options) as Record<string, any>;

    if (options.state) {
      params.state = options.state;
    }

    return params;
  }

  async authenticate(req: Request, options?: any): Promise<void> {
    const hackitPlugin = await Plugin.getPluginByTitle('HackIt');

    if (hackitPlugin && hackitPlugin.input) {
      const settings = JSON.parse(hackitPlugin.input);
      process.env.NC_HACKIT_CLIENT_ID = settings.client_id;
      process.env.NC_HACKIT_CLIENT_SECRET = settings.client_secret;
      process.env.NC_HACKIT_ISSUER = settings.issuer;
    }

    if (!process.env.NC_HACKIT_CLIENT_ID || !process.env.NC_HACKIT_CLIENT_SECRET) {
      return this.error(new Error('HackIt client id or secret not found. Please add environment variables NC_HACKIT_CLIENT_ID and NC_HACKIT_CLIENT_SECRET.'));
    }

    const issuerUrl = process.env.NC_HACKIT_ISSUER || 'https://sso.hackit.tw';
    const callbackURL = req.ncSiteUrl + '/auth/hackit/callback';

    return super.authenticate(req, {
      ...options,
      clientID: process.env.NC_HACKIT_CLIENT_ID,
      clientSecret: process.env.NC_HACKIT_CLIENT_SECRET,
      issuer: issuerUrl,
      authorizationURL: `${issuerUrl}/oidc/authorize`,
      tokenURL: `${issuerUrl}/oidc/token`,
      userInfoURL: `${issuerUrl}/oidc/userinfo`,
      callbackURL: callbackURL,
      passReqToCallback: true,
      scope: ['openid', 'profile', 'email'],
      state: req.query.state,
      skipUserProfile: false,
      customHeaders: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
    });
  }
}

export const HackItStrategyProvider: FactoryProvider = {
  provide: HackItStrategy,
  inject: [UsersService],
  useFactory: async (usersService: UsersService) => {
    // Only initialize if environment variables are set
    if (!process.env.NC_HACKIT_CLIENT_ID || !process.env.NC_HACKIT_CLIENT_SECRET) {
      return new HackItStrategy(null, usersService);
    }

    const issuerUrl = process.env.NC_HACKIT_ISSUER || 'https://sso.hackit.tw';
    
    const clientConfig = {
      clientID: process.env.NC_HACKIT_CLIENT_ID,
      clientSecret: process.env.NC_HACKIT_CLIENT_SECRET,
      issuer: issuerUrl,
      authorizationURL: `${issuerUrl}/oidc/authorize`,
      tokenURL: `${issuerUrl}/oidc/token`,
      userInfoURL: `${issuerUrl}/oidc/userinfo`,
      callbackURL: '/auth/hackit/callback', // Will be dynamically set in authenticate method
      passReqToCallback: true,
      scope: ['openid', 'profile', 'email'],
      skipUserProfile: false,
      customHeaders: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
    };

    return new HackItStrategy(clientConfig, usersService);
  },
}; 