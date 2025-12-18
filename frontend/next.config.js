/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
        LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
        LIVEKIT_URL: process.env.LIVEKIT_URL,
    },
};

module.exports = nextConfig;
