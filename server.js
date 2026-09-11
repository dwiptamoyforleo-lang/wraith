import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Dynamic handler for index.html to inject GOOGLE_CLIENT_ID if configured in environment
app.get(['/', '/index.html'], (req, res) => {
  try {
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    const isReal = clientId && !clientId.includes('YOUR_GOOGLE_CLIENT_ID');
    html = html.replace('__GOOGLE_CLIENT_ID__', isReal ? clientId : '');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).send('Internal Server Error');
  }
});

// OAuth callback endpoint for Google popup/redirect flows
app.get(['/auth/callback', '/auth/callback/'], (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authenticating...</title>
  <style>
    body { background: #08090C; color: #F1F5F9; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .msg { text-align: center; font-size: 14px; color: #94A3B8; }
    .spinner { width: 24px; height: 24px; border: 2px solid rgba(214,255,56,0.2); border-top-color: #D6FF38; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="msg">
    <div class="spinner"></div>
    Signing in with Google...
  </div>
  <script>
    (function() {
      try {
        var hash = window.location.hash.substring(1);
        var params = new URLSearchParams(hash || window.location.search);
        var token = params.get('access_token');
        var idToken = params.get('id_token');

        if (token || idToken) {
          if (token) {
            fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { 'Authorization': 'Bearer ' + token }
            })
            .then(function(r) { return r.json(); })
            .then(function(profile) {
              if (window.opener) {
                window.opener.postMessage({ type: 'WRAITH_GOOGLE_AUTH_SUCCESS', profile: profile }, '*');
                window.close();
              } else {
                localStorage.setItem('wraith_user', JSON.stringify(profile));
                window.location.replace('/shop.html');
              }
            })
            .catch(function() {
              if (window.opener) {
                window.opener.postMessage({ type: 'WRAITH_GOOGLE_AUTH_SUCCESS', token: token }, '*');
                window.close();
              } else {
                window.location.replace('/shop.html');
              }
            });
          } else if (idToken) {
            if (window.opener) {
              window.opener.postMessage({ type: 'WRAITH_GOOGLE_AUTH_SUCCESS', idToken: idToken }, '*');
              window.close();
            }
          }
        } else if (params.get('error')) {
          if (window.opener) {
            window.opener.postMessage({ type: 'WRAITH_GOOGLE_AUTH_ERROR', error: params.get('error') }, '*');
            window.close();
          }
        }
      } catch (err) {
        if (window.opener) window.close();
      }
    })();
  </script>
</body>
</html>`);
});

// API endpoint returning configured Google Client ID
app.get('/api/auth/google-config', (req, res) => {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  res.json({
    clientId: clientId,
    configured: Boolean(clientId && !clientId.includes('YOUR_GOOGLE_CLIENT_ID'))
  });
});

// Serve static assets from the root directory with html extension fallback
app.use(express.static(__dirname, { extensions: ['html'] }));

// Fallback: serve index.html for any unmatched routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
