import {PHASE_DEVELOPMENT_SERVER} from 'next/constants.js';

const nextConfig=(phase)=>{
  const isDev=phase===PHASE_DEVELOPMENT_SERVER;
  const csp=[
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev?" 'unsafe-eval'":''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.upstox.com https://www.googleapis.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev?[]:["upgrade-insecure-requests"])
  ].join('; ');
  return {
    reactStrictMode:true,
    distDir:isDev?'.next-dev':'.next',
    async headers(){
      return [{source:'/:path*',headers:[
        {key:'Content-Security-Policy',value:csp},
        {key:'X-Content-Type-Options',value:'nosniff'},
        {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
        {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(), payment=(), usb=()'},
        {key:'X-Frame-Options',value:'DENY'}
      ]}];
    }
  };
};

export default nextConfig;
