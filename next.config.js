/** @type {import('next').NextConfig} */
const nextConfig = {
    /* config options here */
    images: {
        // 静的ホスティング系のデプロイ先でも画像表示を壊さない
        unoptimized: true,
        // 外部画像（Googleプロフィール画像など）を許可
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
                pathname: '/**',
            },
        ],
        // SVGなどの画像を安全に使用するための設定
        dangerouslyAllowSVG: true,
        contentDispositionType: 'attachment',
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    }
};

module.exports = nextConfig;
