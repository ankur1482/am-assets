import type { Config } from 'tailwindcss';
const config: Config = {content:['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}','./lib/**/*.{ts,tsx}'],theme:{extend:{colors:{sage:'#115C45',leaf:'#1B7A5C',cream:'#F7F1E5',sand:'#EDE3D0',ink:'#17382B'},boxShadow:{soft:'0 18px 45px rgba(21,45,36,.10)'},borderRadius:{'3xl':'1.5rem'}}},plugins:[]};
export default config;
