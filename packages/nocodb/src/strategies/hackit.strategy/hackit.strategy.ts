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

  async validate(
    req: NcRequest,
    iss: string,
    sub: string,
    profile: any,
    accessToken: string,
    refreshToken: string,
    done: VerifyCallback,
  ): Promise<any> {
    const email = profile.emails?.[0]?.value || profile.email;
    
    if (!email) {
      return done(new Error('No email found in HackIt profile'));
    }

    try {
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
    const callbackURL = req.ncSiteUrl + Noco.getConfig().dashboardPath;

    return super.authenticate(req, {
      ...options,
      clientID: process.env.NC_HACKIT_CLIENT_ID,
      clientSecret: process.env.NC_HACKIT_CLIENT_SECRET,
      issuer: issuerUrl,
      authorizationURL: `${issuerUrl}/auth`,
      tokenURL: `${issuerUrl}/token`,
      userInfoURL: `${issuerUrl}/userinfo`,
      callbackURL: callbackURL,
      passReqToCallback: true,
      scope: ['openid', 'profile', 'email'],
      state: req.query.state,
    });
  }
}

export const HackItStrategyProvider: FactoryProvider = {
  provide: HackItStrategy,
  inject: [UsersService],
  useFactory: async (usersService: UsersService) => {
    const issuerUrl = process.env.NC_HACKIT_ISSUER || 'https://sso.hackit.tw';
    
    const clientConfig = {
      clientID: process.env.NC_HACKIT_CLIENT_ID ?? 'dummy-id',
      clientSecret: process.env.NC_HACKIT_CLIENT_SECRET ?? 'dummy-secret',
      issuer: issuerUrl,
      authorizationURL: `${issuerUrl}/auth`,
      tokenURL: `${issuerUrl}/token`,
      userInfoURL: `${issuerUrl}/userinfo`,
      callbackURL: 'http://localhost:8080/dashboard',
      passReqToCallback: true,
      scope: ['openid', 'profile', 'email'],
    };

    return new HackItStrategy(clientConfig, usersService);
  },
}; 