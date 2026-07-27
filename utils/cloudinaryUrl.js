const CLOUDINARY_HOST = "res.cloudinary.com";

/**
 * Inserts Cloudinary transformation params (width + auto format/quality)
 * into a Cloudinary-hosted image URL. Section 2.9 — "Cloudinary
 * transformations... responsive images." Safely returns the original URL
 * unchanged for anything not actually hosted on Cloudinary (e.g. the local
 * /images/... paths used by seed/demo data per Section 2.15), so this is
 * safe to wrap around every product image without special-casing callers.
 */
function cloudinaryResize(url, { width } = {}) {
  if (!url || !url.includes(CLOUDINARY_HOST) || !url.includes("/upload/")) return url;

  const transform = width ? `w_${width},f_auto,q_auto` : "f_auto,q_auto";
  return url.replace("/upload/", `/upload/${transform}/`);
}

/** Builds a srcset string across a few common breakpoints. */
function cloudinarySrcset(url, widths = [320, 640, 960]) {
  if (!url || !url.includes(CLOUDINARY_HOST) || !url.includes("/upload/")) return "";
  return widths.map((w) => `${cloudinaryResize(url, { width: w })} ${w}w`).join(", ");
}

module.exports = { cloudinaryResize, cloudinarySrcset };
