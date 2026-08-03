import type { Metadata,Viewport } from 'next';import './globals.css';
export const metadata:Metadata={metadataBase:new URL('https://gupta.vercel.app'),title:'Asset Manager Cloud',description:'Vercel + Supabase cloud asset management tool',manifest:'/manifest.webmanifest',applicationName:'Asset Manager Cloud',appleWebApp:{capable:true,title:'Asset Manager',statusBarStyle:'default'},icons:{icon:[{url:'/asset-manager-icon.svg',type:'image/svg+xml'},{url:'/icon-192.png',sizes:'192x192',type:'image/png'}],apple:[{url:'/icon-180.png',sizes:'180x180',type:'image/png'}]}};
export const viewport:Viewport={width:'device-width',initialScale:1,maximumScale:5,themeColor:'#131921',viewportFit:'cover'};
const legacySafariBootstrap = `(function(){
  if(!Array.prototype.at){Object.defineProperty(Array.prototype,"at",{configurable:true,writable:true,value:function(index){var length=this.length>>>0;var integer=Math.trunc(Number(index)||0);var position=integer<0?length+integer:integer;return position<0||position>=length?void 0:this[position];}});}
  if(!Object.fromEntries){Object.defineProperty(Object,"fromEntries",{configurable:true,writable:true,value:function(entries){var result={};var iterator=entries[Symbol.iterator]();var step;while(!(step=iterator.next()).done){result[step.value[0]]=step.value[1];}return result;}});}
  if(typeof window.queueMicrotask!=="function"){window.queueMicrotask=function(callback){Promise.resolve().then(callback).catch(function(error){setTimeout(function(){throw error;},0);});};}
})();`;
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang='en'><head><script dangerouslySetInnerHTML={{__html:legacySafariBootstrap}}/></head><body>{children}</body></html>}
