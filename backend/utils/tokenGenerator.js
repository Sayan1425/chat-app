const jwt = require('jsonwebtoken')

const tokenGenerate = (userId) => {
  return jwt.sign({userId}, process.env.JWT_SECRET, {
    expiresIn:'1y'
  })
}
module.exports = tokenGenerate;
