import { makeRedirectUri, revokeAsync, startAsync } from 'expo-auth-session';
import React, { useEffect, createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { generateRandom } from 'expo-auth-session/build/PKCE';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const userKey = '@stream.data'
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [user, setUser] = useState({} as User);
  const [userToken, setUserToken] = useState('');

  const getUser = async () => {
    const userResponse = await AsyncStorage.getItem(userKey) as string;

    if(userResponse){
      const userFormattted = JSON.parse(userResponse);
      setUser(userFormattted)
    }
  }

  useEffect(() => {
    api.defaults.headers.common['Client-Id'] = CLIENT_ID as string | number | boolean;
    getUser();
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

      const { type, params: {
        error,
        access_token,
        state
      } } = await startAsync({ authUrl }) as AuthResponse;

      if(type === 'success' && error !== 'access_denied'){
        if(state !== STATE){
          throw new Error('Invalid state value');
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        const { data } = await api.get('/users');

        const userObj = {
          display_name: data.data[0].display_name,
          email: data.data[0].email,
          id: data.data[0].id,
          profile_image_url: data.data[0].profile_image_url
        }

        setUser(userObj)

        const userFormatted = JSON.stringify(userObj);
        await AsyncStorage.setItem(userKey, userFormatted);

        setUserToken(access_token);
      }
    } catch (error) {
      throw new Error();
    } finally {
      setIsLoggingIn(false)
    }
  }

  async function signOut() {
    try {
      setIsLoggingOut(true)
      revokeAsync(
        { token: userToken, clientId: CLIENT_ID }, 
        { revocationEndpoint: twitchEndpoints.revocation }
      )
    } catch (error) {
    } finally {
      setUser({} as User);
      setUserToken('');
      setIsLoggingOut(false)
    }
  }

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
