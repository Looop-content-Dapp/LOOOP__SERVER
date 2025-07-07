const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');


// Apple credentials - replace with your actual values
const TEAM_ID = ' C53XTGSNWR'; // Found in Apple Developer account
const CLIENT_ID = 'com.looop.Looop'; // Your Services ID
const KEY_ID = 'YRV3VG794V'; // Key ID from the private key you created
const PRIVATE_KEY_PATH = './AuthKey_YRV3VG794V.p8'; // Path to your .p8 file

function generateAppleClientSecret() {
  try {
    // Read the private key
    const privateKey = fs.readFileSync(path.resolve(PRIVATE_KEY_PATH), 'utf8');

    // JWT payload
    const payload = {
      iss: TEAM_ID,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (6 * 30 * 24 * 60 * 60), // 6 months
      aud: 'https://appleid.apple.com',
      sub: CLIENT_ID
    };

    // JWT header
    const header = {
      alg: 'ES256',
      kid: KEY_ID
    };

    // Generate the JWT
    const clientSecret = jwt.sign(payload, privateKey, {
      algorithm: 'ES256',
      header: header
    });

    console.log('Apple Client Secret (JWT):');
    console.log(clientSecret);
    console.log('\nAdd this to your .env file:');
    console.log(`APPLE_CLIENT_SECRET=${clientSecret}`);

    return clientSecret;
  } catch (error) {
    console.error('Error generating Apple Client Secret:', error.message);
    return null;
  }
}

// Generate the secret
generateAppleClientSecret();
