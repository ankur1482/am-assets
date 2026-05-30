'use client';

import {useState} from 'react';
import {ExternalLink, Maximize2, RotateCcw, Smartphone} from 'lucide-react';

const devices=[
  {name:'iPhone 15 Pro',width:393,height:852},
  {name:'iPhone 15 Plus',width:430,height:932},
  {name:'iPhone SE',width:375,height:667}
];

export default function IPhonePreviewPage(){
  const [device,setDevice]=useState(devices[0]);
  const [refreshKey,setRefreshKey]=useState(0);
  return <main className="min-h-screen bg-[#101118] px-5 py-5 text-[#f4f7f2]">
    <div className="mx-auto flex max-w-7xl gap-6 max-xl:flex-col">
      <aside className="w-80 shrink-0 max-xl:w-full">
        <div className="rounded-2xl border border-[#2b2f3d] bg-[#171922] p-4">
          <div className="mb-4 flex items-center gap-2">
            <Smartphone size={18}/>
            <h1 className="text-lg font-black">iPhone Preview</h1>
          </div>
          <label className="mb-2 block text-xs font-black uppercase tracking-widest text-[#9aa4b2]">Device</label>
          <select
            className="w-full rounded-xl border border-[#2b2f3d] bg-[#101118] px-3 py-2 text-sm font-bold text-[#f4f7f2] outline-none"
            value={device.name}
            onChange={e=>setDevice(devices.find(d=>d.name===e.target.value)||devices[0])}
          >
            {devices.map(d=><option key={d.name} value={d.name}>{d.name} - {d.width} x {d.height}</option>)}
          </select>
          <div className="mt-4 grid gap-2">
            <button className="btn !border-[#2b2f3d] !bg-[#202331] !text-[#f4f7f2]" onClick={()=>setRefreshKey(k=>k+1)}>
              <RotateCcw size={15}/> Refresh Preview
            </button>
            <a className="btn !border-[#2b2f3d] !bg-[#202331] !text-[#f4f7f2]" href="/" target="_blank" rel="noreferrer">
              <ExternalLink size={15}/> Open Full App
            </a>
          </div>
          <p className="mt-4 text-sm font-semibold leading-6 text-[#a8b1bd]">
            This frame loads the real app in a phone-sized viewport. Sign in inside the phone once, then use it to review spacing, realtime values, and navigation before we tune the UI.
          </p>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 items-start justify-center overflow-auto rounded-3xl border border-[#2b2f3d] bg-[#0b0c12] p-5">
        <div className="rounded-[3rem] border-[10px] border-black bg-black p-2 shadow-2xl">
          <div className="mx-auto mb-2 h-5 w-32 rounded-b-2xl bg-black"/>
          <iframe
            key={`${device.name}-${refreshKey}`}
            title={`${device.name} app preview`}
            src="/"
            style={{width:device.width,height:device.height}}
            className="block rounded-[2.2rem] border-0 bg-[#111219]"
          />
        </div>
      </section>
    </div>
  </main>;
}
