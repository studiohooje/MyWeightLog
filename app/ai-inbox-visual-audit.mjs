import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {connect} from './qa-cdp.mjs';
const c=await connect(9238,'http://localhost:4173/ai-inbox-preview.html');
try{
 await c.send('Page.enable');
 for(const width of [390,768,1200]){
  await c.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width===390});
  await new Promise(r=>setTimeout(r,300));
  const result=await c.run(`(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,cards:document.querySelectorAll('.ai-draft').length,estimate:document.querySelectorAll('.ai-estimate').length}))()`);
  assert.equal(result.cards,1);assert.equal(result.estimate,2);assert.ok(result.scroll<=result.width,JSON.stringify(result));
  const shot=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
  await fs.writeFile(`../artifacts/ai-inbox-preview-${width}.png`,Buffer.from(shot.data,'base64'));
  console.log(JSON.stringify(result));
 }
}finally{c.close()}
