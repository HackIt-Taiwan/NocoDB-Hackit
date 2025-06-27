import { promisify } from 'util';
import { Injectable, Optional } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import type { Request } from 'express';
import type { VerifyCallback } from 'passport-oauth2';
import type { FactoryProvider } from '@nestjs/common/interfaces/modules/provider.interface';
import type { NcRequest } from '~/interface/config';
import Noco from '~/Noco';
import { UsersService } from '~/services/users/users.service';
import { BaseUser, Plugin, User } from '~/models';
import { sanitiseUserObj } from '~/utils';

@Injectable()
export class HackItStrategy extends PassportStrategy(OAuth2Strategy, 'hackit') {
  constructor(
    @Optional() clientConfig: any,
    private usersService: UsersService,
  ) {
    super(clientConfig);
  }

  async validate(
    req: NcRequest,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      console.log('HackIt SSO validation started with access token:', accessToken);
      
      // Get user info from HackIt SSO using access token
      const userInfoResponse = await axios.get('https://sso.hackit.tw/oidc/userinfo/', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      const userInfo = userInfoResponse.data;
      console.log('User info from HackIt SSO:', userInfo);

      const email = userInfo.email;
      
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
          firstname: userInfo.given_name || userInfo.name?.split(' ')[0] || '',
          lastname: userInfo.family_name || userInfo.name?.split(' ').slice(1).join(' ') || '',
          req,
        } as any;

        const user = await this.usersService.registerNewUserIfAllowed(userData);
        return done(null, sanitiseUserObj(user));
      }
    } catch (err) {
      console.error('Error in HackIt SSO validation:', err);
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

  authenticate(req: Request, options?: any): void {
    console.log('HackIt SSO authenticate called:', { url: req.url, query: req.query });
    
    if (!process.env.NC_HACKIT_CLIENT_ID || !process.env.NC_HACKIT_CLIENT_SECRET) {
      return this.error(new Error('HackIt client id or secret not found. Please add environment variables NC_HACKIT_CLIENT_ID and NC_HACKIT_CLIENT_SECRET.'));
    }

    const dynamicOptions = {
      ...options,
      clientID: process.env.NC_HACKIT_CLIENT_ID,
      clientSecret: process.env.NC_HACKIT_CLIENT_SECRET,
      authorizationURL: 'https://sso.hackit.tw/oidc/authorize/',
      tokenURL: 'https://sso.hackit.tw/oidc/token/',
      callbackURL: req.ncSiteUrl + '/auth/hackit/callback',
      passReqToCallback: true,
      scope: ['openid', 'profile', 'email'],
      state: req.query.state,
    };

    return super.authenticate(req, dynamicOptions);
  }
}

export const HackItStrategyProvider: FactoryProvider = {
  provide: HackItStrategy,
  inject: [UsersService],
  useFactory: async (usersService: UsersService) => {
    const clientConfig = {
      authorizationURL: 'https://sso.hackit.tw/oidc/authorize/',
      tokenURL: 'https://sso.hackit.tw/oidc/token/',
      clientID: process.env.NC_HACKIT_CLIENT_ID || 'NocoDB',
      clientSecret: process.env.NC_HACKIT_CLIENT_SECRET || '',
      callbackURL: '/auth/hackit/callback',
      scope: ['openid', 'profile', 'email'],
      passReqToCallback: true,
    };

    return new HackItStrategy(clientConfig, usersService);
  },
}; 