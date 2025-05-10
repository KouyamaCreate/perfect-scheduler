/** @type {import('next').NextConfig} */
const nextConfig = {
    /* config options here */
    images: {
        // SVGなどの画像を安全に使用するための設定
        dangerouslyAllowSVG: true,
        contentDispositionType: 'attachment',
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    }
};

module.exports = nextConfig;