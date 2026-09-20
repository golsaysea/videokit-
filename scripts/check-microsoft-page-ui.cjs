const {_electron:electron}=require(process.env.PLAYWRIGHT_MODULE);const fs=require('fs'),path=require('path'),os=require('os'),assert=require('node:assert/strict');
(async()=>{const root=path.resolve(__dirname,'..'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'videokit-ms-page-'));const env={...process.env,VIDEOKIT_TEST_PROFILE:profile,VITE_PORT:'5184'};delete env.ELECTRON_RUN_AS_NODE;const app=await electron.launch({executablePath:require('electron'),args:[path.join(__dirname,'queue-ui-test-entry.cjs')],cwd:root,env});try{
 await app.firstWindow();await new Promise(r=>setTimeout(r,2500));const page=app.windows().find(p=>p.url().startsWith('http://localhost:5184'));page.on('dialog',d=>d.accept());
 await page.locator('[data-tab="microsoft-tts"]').click();await page.locator('#microsoft-tts-panel.active').waitFor();
 await page.waitForFunction(()=>document.querySelectorAll('#ms-voice option').length>100,null,{timeout:60000});
 await page.locator('#ms-voice-search').fill('中文');await page.locator('#ms-voice').selectOption('edge:zh-CN-XiaoxiaoNeural');
 await page.locator('#ms-text').fill('这是独立微软语音页面的第一条测试。\n\n这是第二条测试文案。');await page.locator('#ms-add').click();assert.equal(await page.locator('#ms-queue textarea').count(),2);
 await page.locator('#ms-start').click();await page.waitForFunction(()=>document.getElementById('ms-progress').textContent.includes('生成结束'),null,{timeout:120000});
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('videokit_microsoft_tts_queue_v1')));assert.equal(stored.rows.filter(r=>r.state==='success').length,2);for(const r of stored.rows){assert.ok(fs.statSync(r.audio).size>1000);assert.ok(fs.readFileSync(r.srt,'utf8').includes('-->'));}
 await page.reload();await page.locator('[data-tab="microsoft-tts"]').click();assert.equal(await page.locator('#ms-queue textarea').count(),2);assert.equal(await page.getByRole('button',{name:'播放音频',exact:true}).count(),2);
 console.log('PASS: Microsoft tab position, voice filter, 2-item real batch generation, audio/subtitle files, reload persistence');
 }finally{await app.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
