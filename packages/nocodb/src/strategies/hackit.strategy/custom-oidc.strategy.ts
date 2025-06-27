import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import axios from 'axios';
import type { Request } from 'express';
import type { VerifyCallback } from 'passport-oauth2';

@Injectable()
export class CustomHackItStrategy extends PassportStrategy(OAuth2Strategy, 'hackit-custom') {
  constructor() {
    super({
      authorizationURL: 'https://sso.hackit.tw/oidc/authorize/',
      tokenURL: 'https://sso.hackit.tw/oidc/token/',
      clientID: process.env.NC_HACKIT_CLIENT_ID || 'NocoDB',
      clientSecret: process.env.NC_HACKIT_CLIENT_SECRET || '',
      callbackURL: '/auth/hackit/callback',
      scope: ['openid', 'profile', 'email'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      console.log('Access Token received:', accessToken);
      
      // Manually get user info from HackIt SSO
      const userInfoResponse = await axios.get('https://sso.hackit.tw/oidc/userinfo/', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      const userInfo = userInfoResponse.data;
      console.log('User info from HackIt SSO:', userInfo);

      // Create a standardized profile
      const standardProfile = {
        id: userInfo.sub,
        username: userInfo.preferred_username || userInfo.email,
        displayName: userInfo.name,
        name: {
          familyName: userInfo.family_name,
          givenName: userInfo.given_name,
        },
        emails: [{ value: userInfo.email }],
        email: userInfo.email,
        given_name: userInfo.given_name,
        family_name: userInfo.family_name,
        _raw: userInfo,
        _json: userInfo,
      };

      return done(null, standardProfile);
    } catch (error) {
      console.error('Error getting user info from HackIt SSO:', error.response?.data || error.message);
      return done(error);
    }
  }

  authenticate(req: Request, options?: any): void {
    console.log('Custom HackIt authenticate:', { url: req.url, query: req.query });
    
    const dynamicOptions = {
      ...options,
      clientID: process.env.NC_HACKIT_CLIENT_ID || 'NocoDB',
      clientSecret: process.env.NC_HACKIT_CLIENT_SECRET || '',
      callbackURL: req.ncSiteUrl + '/auth/hackit/callback',
      state: req.query.state,
    };

    super.authenticate(req, dynamicOptions);
  }
} 