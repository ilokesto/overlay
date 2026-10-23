import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  serverExternalPackages: ['@takumi-rs/image-response'],
  transpilePackages: ['@ilokesto/overlay-docs-runtime'],
  reactStrictMode: true,
  experimental: { cpus: 2 },
};

export default withMDX(config);
