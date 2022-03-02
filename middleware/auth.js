const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  const token = req.header("x-auth-token");

  if (!token) return res.status(401).send({ message: "Not authenticated" });

  try {
    const payload = jwt.verify(token, process.env.SECRET_KEY);
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).send({ message: "Not authenticated" });
  }
};

module.exports = auth;
