const verifyByReference = require('./verify/[reference].js')

module.exports = async function handler(request, response) {
  return verifyByReference(request, response)
}
