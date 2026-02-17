import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './lib/AuthContext';
import { Auth0Provider } from '@auth0/auth0-react';

// Debug: Log environment variables
console.log('AUTH0_DOMAIN:', import.meta.env.VITE_AUTH0_DOMAIN);
console.log('AUTH0_CLIENT_ID:', import.meta.env.VITE_AUTH0_CLIENT_ID);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      redirectUri={window.location.origin}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </Auth0Provider>
  </StrictMode>,
)


