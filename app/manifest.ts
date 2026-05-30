import type {MetadataRoute} from 'next';

export default function manifest():MetadataRoute.Manifest{
  return {
    name:'Asset Manager Cloud',
    short_name:'Asset Manager',
    description:'Cloud asset, document and portfolio manager',
    start_url:'/',
    scope:'/',
    display:'standalone',
    orientation:'portrait',
    background_color:'#fbf9f1',
    theme_color:'#115C45',
    icons:[
      {src:'/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
      {src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},
      {src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'},
      {src:'/asset-manager-icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'},
      {src:'/asset-manager-icon.svg',sizes:'any',type:'image/svg+xml',purpose:'maskable'}
    ]
  };
}
