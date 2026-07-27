const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

function generateSecret(userEmail) {
  const issuer = process.env.TOTP_ISSUER_NAME || "Nam Global";
  return speakeasy.generateSecret({ name: `${issuer} (${userEmail})`, issuer });
}

async function generateQrCodeDataUrl(otpauthUrl) {
  return QRCode.toDataURL(otpauthUrl);
}

function verifyToken(secretBase32, token) {
  return speakeasy.totp.verify({
    secret: secretBase32,
    encoding: "base32",
    token,
    window: 1, // allow ±1 time-step (30s) of clock drift
  });
}

module.exports = { generateSecret, generateQrCodeDataUrl, verifyToken };
