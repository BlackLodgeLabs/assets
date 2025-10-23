const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore
const firestore = new Firestore();

/**
 * Checks if a given email has a license in Firestore.
 * Expects a GET request with an 'email' query parameter.
 * Example: /?email=user@example.com
 *
 * @param {import('@google-cloud/functions-framework').Request} req
 * @param {import('@google-cloud/functions-framework').Response} res
 */
functions.http('verifyLicense', async (req, res) => {
  // Allow CORS for requests from the Chrome extension
  // Replace '*' with your extension ID for better security in production
  // 'chrome-extension://YOUR_EXTENSION_ID'
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests for CORS
  if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
  }

  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  const email = req.query.email;

  if (!email) {
    return res.status(400).json({ valid: false, message: 'Email query parameter is required.' });
  }

  console.log(`Checking license for: ${email}`);

  try {
    const licenseRef = firestore.collection('licenses').doc(email);
    const doc = await licenseRef.get();

    if (!doc.exists) {
      console.log(`License not found for ${email}`);
      res.status(200).json({ valid: false, message: 'License not found.' });
    } else {
      console.log(`License found for ${email}`);
      // You could add more checks here, e.g., if the license is active, expired, etc.
      const licenseData = doc.data();
      res.status(200).json({
          valid: true,
          message: 'License valid.',
          key: licenseData.licenseKey, // Send back the key
          planType: licenseData.planType // Send back the plan type
      });
    }
  } catch (error) {
    console.error(`Error checking license for ${email}:`, error);
    res.status(500).json({ valid: false, message: 'Internal server error.' });
  }
});