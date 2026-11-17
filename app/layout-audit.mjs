import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {connect} from './qa-cdp.mjs';

const c=await connect(9238,'http://localhost:4173');
const run=expression=>c.run(expression);
const wait=async expression=>{for(let i=0;i<50;i++){if(await run(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)};
const pages=['home','body','food','workout','analysis','calendar','settings'];
try{
 await c.send('Page.enable');
 for(const width of [390,1200]){
  await c.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width===390});
  await wait('!!document.querySelector(`[data-page="food"]`)');
  for(const page of pages){
   if(page==='analysis')await run('document.querySelector(`[data-page="workout"]`).click()');
   await run(`document.querySelector(${JSON.stringify(page==='analysis'?'[data-page="analysis"]':`[data-page="${page}"]`)}).click()`);
   const result=await run(`(()=>{const root=document.querySelector('main');const w=innerWidth;const findings=[];for(const box of root.querySelectorAll('.section.card:not(details),.progress-section,.nutrition-summary')){const children=[...box.children].filter(el=>getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().height>0);for(let i=1;i<children.length;i++){const a=children[i-1].getBoundingClientRect(),b=children[i].getBoundingClientRect();if(b.top>=a.bottom-1&&Math.max(a.left,b.left)<Math.min(a.right,b.right)){const gap=Math.round(b.top-a.bottom);if(gap<8)findings.push({section:box.className,prev:children[i-1].className||children[i-1].tagName,next:children[i].className||children[i].tagName,gap})}}}return {width:w,scroll:document.documentElement.scrollWidth,findings:findings.slice(0,30)}})()`);
   assert.ok(result.scroll<=result.width,`${width}px ${page} horizontal overflow: ${result.scroll}`);
   console.log(JSON.stringify({page,...result}));
   if(['body','workout','settings'].includes(page)){
    const shot=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
    await fs.writeFile(`../artifacts/layout-${page}-${width}.png`,Buffer.from(shot.data,'base64'));
   }
  }
 }
}finally{c.close()}
