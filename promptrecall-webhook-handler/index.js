/**
 * HTTP Cloud Run Service.
 *
 * @param {Object} req Request context.
 * @param {Object} res Response context.
 */
exports.helloHttp = (req, res) => {
  console.log('Received a request!');
  res.status(200).send('Hello, this is the PromptRecall webhook handler!');
};