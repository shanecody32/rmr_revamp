'use client'

import * as React from 'react';

import {login as loginRequest, fetchCurrentUser} from '@/lib/api/auth';
import {clearStoredAuthToken, getStoredAuthToken, setStoredAuthToken} from '@/lib/auth/token';
import type {AuthState} from '@/types/auth';

interface AuthContextType extends AuthState {
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const INITIAL_STATE: AuthState = {
    user: null,
    token: null,
    isLoading: true,
};

export function AuthProvider({children}: { children: React.ReactNode }) {
    const [state, setState] = React.useState<AuthState>(INITIAL_STATE);

    React.useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            const storedToken = getStoredAuthToken();
            if (!storedToken) {
                if (isMounted) {
                    setState({user: null, token: null, isLoading: false});
                }
                return;
            }

            try {
                const current = await fetchCurrentUser();
                if (!isMounted) {
                    return;
                }
                setState({
                    user: {
                        id: current.pid,
                        email: current.email,
                        firstName: current.first_name,
                        lastName: current.last_name,
                        name: `${current.first_name} ${current.last_name}`.trim(),
                    },
                    token: storedToken,
                    isLoading: false,
                });
            } catch (error) {
                clearStoredAuthToken();
                if (isMounted) {
                    setState({user: null, token: null, isLoading: false});
                }
            }
        };

        void initialize();

        return () => {
            isMounted = false;
        };
    }, []);

    const login = React.useCallback(async (email: string, password: string) => {
        setState(prev => ({...prev, isLoading: true}));
        try {
            const loginResponse = await loginRequest({email, password});
            setStoredAuthToken(loginResponse.token);

            let userEmail = email;
            let firstName = loginResponse.first_name;
            let lastName = loginResponse.last_name;

            try {
                const current = await fetchCurrentUser();
                userEmail = current.email;
                firstName = current.first_name;
                lastName = current.last_name;
            } catch (error) {
                // Unable to fetch current user details; proceed with login response data
            }

            setState({
                user: {
                    id: loginResponse.pid,
                    email: userEmail,
                    firstName,
                    lastName,
                    name: `${firstName} ${lastName}`.trim(),
                    isVerified: loginResponse.is_verified,
                },
                token: loginResponse.token,
                isLoading: false,
            });
        } catch (error) {
            clearStoredAuthToken();
            setState({user: null, token: null, isLoading: false});
            throw error;
        }
    }, []);

    const logout = React.useCallback(async () => {
        clearStoredAuthToken();
        setState({user: null, token: null, isLoading: false});
    }, []);

    return (
        <AuthContext.Provider value={{...state, login, logout}}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = React.useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
