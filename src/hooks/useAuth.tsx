import { makeRedirectUri, revokeAsync, startAsync } from 'expo-auth-session';
import React, { useEffect, createContext, useContext, useState, ReactNode } from 'react';
import { generateRandom } from 'expo-auth-session/build/PKCE';

import { api } from '../services/api';

interface User {
  id: number;
  display_name: string;
  email: string;
  profile_image_url: string;
}

interface AuthContextData {
  user: User;
  isLoggingOut: boolean;
  isLoggingIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

interface AuthProviderData {
  children: ReactNode;
}

const AuthContext = createContext({} as AuthContextData);

const twitchEndpoints = {
  authorization: 'https://id.twitch.tv/oauth2/authorize',
  revocation: 'https://id.twitch.tv/oauth2/revoke'
};

type AuthResponse = {
  params: {
    access_token: string;
    error: string;
    state: string;
  },
  type: string;
}

const { CLIENT_ID } = process.env;

const REDIRECT_URI = makeRedirectUri({ useProxy: true  });
const RESPONSE_TYPE = 'token';
const SCOPE = encodeURI('openid user:read:email user:read:follows');
const FORCE_VERIFY = true;
const STATE = generateRandom(30);

function AuthProvider({ children }: AuthProviderData) {

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [user, setUser] = useState({} as User);
  const [userToken, setUserToken] = useState('');

  useEffect(() => {
    api.defaults.headers.common['Client-Id'] = CLIENT_ID as string | number | boolean;
  }, [])

  async function signIn() {
    try {
      setIsLoggingIn(true);
 
      const authUrl = twitchEndpoints.authorization + 
        `?client_id=${CLIENT_ID}` + 
        `&redirect_uri=${REDIRECT_URI}` + 
        `&response_type=${RESPONSE_TYPE}` + 
        `&scope=${SCOPE}` + 
        `&force_verify=${FORCE_VERIFY}` +
        `&state=${STATE}`;

      const { type, params } = await startAsync({ authUrl }) as AuthResponse;

      if(type === 'success' && params.error !== 'access_denied'){
        if(params.state !== STATE){
          throw new Error('Invalid state value');
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${params.access_token}`;
      }

        // set user state with response from Twitch API's route "/users"
        // set userToken state with response's access_token from startAsync
    } catch (error) {
      throw new Error('');
    } finally {
      setIsLoggingIn(false)
    }
  }

  async function signOut() {
    try {
      // set isLoggingOut to true

      // call revokeAsync with access_token, client_id and twitchEndpoint revocation
    } catch (error) {
    } finally {
      // set user state to an empty User object
      // set userToken state to an empty string

      // remove "access_token" from request's authorization header

      // set isLoggingOut to false
    }
  }

  useEffect(() => {
    // add client_id to request's "Client-Id" header
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoggingOut, isLoggingIn, signIn, signOut }}>
      { children }
    </AuthContext.Provider>
  )
}

function useAuth() {
  const context = useContext(AuthContext);

  return context;
}

export { AuthProvider, useAuth };
