const functions = require('@google-cloud/functions-framework');

/**
 * HTTP Cloud Function.
 *
 * @param {import('@google-cloud/functions-framework').Request} req
 * @param {import('@google-cloud/functions-framework').Response} res
 */
functions.http('helloHttp', (req, res) => {
  console.log('Received a request via Functions Framework!'); // Added a new log message
  res.status(200).send('Hello, this is the PromptRecall webhook handler via Framework!');
});