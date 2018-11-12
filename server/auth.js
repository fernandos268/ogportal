const jwt = require("jsonwebtoken");
const _ = require("lodash");
const bcrypt = require("bcrypt");

require("dotenv").config();

const createTokens = async (user, secret, secret2, rememberMe) => {
  const createToken = jwt.sign(
    {
      // user: _.pick(user, ["id"])
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      rememberMe: rememberMe
    },
    secret,
    {
      expiresIn: "1h"
    }
  );

  const createRefreshToken = jwt.sign(
    {
      // user: _.pick(user, "id")
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      rememberMe: rememberMe
    },
    secret2,
    {
      expiresIn: "7d"
    }
  );

  return [createToken, createRefreshToken];
};

module.exports.refreshTokens = async function(
  token,
  refreshToken,
  models,
  SECRET,
  SECRET2
) {
  let userId = 0;
  try {
    const {
      user: { id }
    } = jwt.decode(refreshToken);
    userId = id;
  } catch (err) {
    return {};
  }

  if (!userId) {
    return {};
  }

  const user = await models.User.findOne({ where: { id: userId }, raw: true });

  if (!user) {
    return {};
  }

  const refreshSecret = user.password + SECRET2;

  try {
    jwt.verify(refreshToken, refreshSecret);
  } catch (err) {
    return {};
  }

  const [newToken, newRefreshToken] = await createTokens(
    user,
    SECRET,
    refreshSecret
  );
  return {
    token: newToken,
    refreshToken: newRefreshToken,
    user
  };
};

module.exports.tryLogin = async (email, password, rememberMe, userModel) => {
  const user = await userModel.findOne({ where: { email } });
  if (!user) {
    // user with provided email not found
    return {
      ok: false,
      errors: [{ path: "email", message: "User not found" }]
    };
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    // bad password
    return {
      ok: false,
      errors: [{ path: "password", message: "Wrong password" }]
    };
  }

  const refreshTokenSecret = user.password + process.env.JWT_SECRET2;

  const [token, refreshToken] = await createTokens(
    user,
    process.env.JWT_SECRET,
    refreshTokenSecret,
    rememberMe
  );

  return {
    ok: true,
    token,
    refreshToken
  };
};
