import { Client, Issuer } from 'openid-client';

const issuerUrl = process.env.KEYCLOAK_ISSUER;
const clientId = process.env.KEYCLOAK_CLIENT_ID;
const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET;
const redirectUri = process.env.KEYCLOAK_REDIRECT_URI;
const postLogoutRedirectUri =
  process.env.KEYCLOAK_LOGOUT_REDIRECT_URI ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000/login';

if (!issuerUrl || !clientId || !clientSecret || !redirectUri) {
  throw new Error('Missing Keycloak configuration. Please set KEYCLOAK_ISSUER, KEYCLOAK_CLIENT_ID, KEYCLOAK_CLIENT_SECRET, KEYCLOAK_REDIRECT_URI.');
}

let clientPromise: Promise<Client> | null = null;

export function getKeycloakClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = Issuer.discover(issuerUrl).then((issuer) => {
      return new issuer.Client({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uris: [redirectUri],
        response_types: ['code'],
        token_endpoint_auth_method: 'client_secret_post',
      });
    });
  }
  return clientPromise;
}

export function getKeycloakRedirectUri() {
  return redirectUri;
}

export function getPostLogoutRedirectUri() {
  return postLogoutRedirectUri;
}

export const KEYCLOAK_CLIENT_ID = clientId;


