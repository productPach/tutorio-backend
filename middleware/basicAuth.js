// ТОЛЬКО ДЛЯ РЕЛИЗНОГО СТЕНДА (ДЕВ РАЗРАБОТКИ НА СЕРВЕРЕ)
module.exports = function basicAuth(req, res, next) {
  // Разрешаем публичный доступ к маршрутам CloudPayments — подкорректируй под свои пути
  if (req.path.startsWith("/api/cloudpayments")) {
    return next();
  }

  const auth = req.headers.authorization;
  if (!auth) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Restricted Area"');
    return res.status(401).send("Authentication required.");
  }

  const [scheme, encoded] = auth.split(" ");
  if (scheme !== "Basic" || !encoded) {
    return res.status(400).send("Bad authorization format.");
  }

  const buff = Buffer.from(encoded, "base64");
  const [user, pass] = buff.toString().split(":");

  const validUser = process.env.BASIC_AUTH_USER || "tutorioDev";
  const validPass = process.env.BASIC_AUTH_PASS || "GL2ps#OInM)dhxtA";

  if (user === validUser && pass === validPass) {
    return next();
  } else {
    res.setHeader("WWW-Authenticate", 'Basic realm="Restricted Area"');
    return res.status(401).send("Authentication failed.");
  }
};
