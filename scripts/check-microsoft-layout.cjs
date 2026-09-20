const fs=require('fs');const assert=require('assert');const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
(async()=>{const browser=await chromium.launch({headless:true,channel:"msedge"});try{const page=await browser.newPage();
const html=fs.readFileSync('src/index.html','utf8');const section=html.slice(html.indexOf('<section id="microsoft-tts-panel"'),html.indexOf('<!-- ==================== 字幕对齐'));
await page.route('http://localhost/**',r=>r.fulfill({contentType:'text/html',body:'<button data-tab="microsoft-tts">Microsoft</button>'+section}));await page.goto('http://localhost');
await page.evaluate(()=>{window.API_BASE='/api';window.apiFetch=async()=>({ok:true,json:async()=>({voices:[{voice_id:'edge:en-US-AriaNeural',locale:'en-US',gender:'Female',name:'Aria'},{voice_id:'edge:zh-CN-XiaoxiaoNeural',locale:'zh-CN',gender:'Female',name:'Xiaoxiao'},{voice_id:'edge:fr-FR-DeniseNeural',locale:'fr-FR',gender:'Female',name:'Denise'}]})});});
await page.addScriptTag({path:'src/microsoft-tts.js'});await page.evaluate(()=>document.dispatchEvent(new Event('DOMContentLoaded')));await page.click('[data-tab="microsoft-tts"]');
assert.equal(await page.inputValue('#ms-language'),'en');assert.equal(await page.locator('#ms-voice option').count(),1);
await page.selectOption('#ms-language','fr');assert.equal(await page.inputValue('#ms-voice'),'edge:fr-FR-DeniseNeural');
const paste=async(plain,html='')=>page.evaluate(({plain,html})=>{const data=new DataTransfer();data.setData('text/plain',plain);if(html)data.setData('text/html',html);document.querySelector('#ms-text').dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));},{plain,html});
await paste('First\t"Second\nline"\t\n"Say ""hello"""\tLast');
assert.deepEqual(await page.locator('#ms-queue textarea').evaluateAll(es=>es.map(e=>e.value)),['First','Second\nline','Say "hello"','Last']);
await paste('', '<table><tr><td>HTML one<br>continued</td><td></td><td>HTML two</td></tr></table>');
assert.equal(await page.locator('#ms-queue textarea').count(),6);assert.equal(await page.locator('#ms-queue textarea').nth(4).inputValue(),'HTML one\ncontinued');
await page.click('#ms-new');await page.locator('#ms-queue textarea').last().fill('Editable text');assert.match(await page.textContent('#ms-total'),/7 条/);
const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('videokit_microsoft_tts_queue_v1')));assert.equal(saved.language,'fr');assert.equal(saved.rows[6].text,'Editable text');
console.log('PASS: default English, language voice dropdown, quoted TSV multiline/empty cells, HTML table paste, editable cards, saved settings');
}catch(e){console.error(e);process.exitCode=1;}finally{await browser.close();}})();


