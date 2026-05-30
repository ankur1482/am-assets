import {PHASE_DEVELOPMENT_SERVER} from 'next/constants.js';

const nextConfig=(phase)=>({
  reactStrictMode:true,
  distDir:phase===PHASE_DEVELOPMENT_SERVER?'.next-dev':'.next'
});

export default nextConfig;
