const {_electron:electron}=require(process.env.PLAYWRIGHT_MODULE);
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'videokit-edge-ui-'));
 const env={...process.env,VIDEOKIT_TEST_PROFILE:profile,VITE_PORT:'5184',FFMPEG_PATH:path.resolve(root,'../ffmpeg.exe'),FFPROBE_PATH:path.resolve(root,'../ffprobe.exe')};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:require('electron'),args:[path.join(__dirname,'queue-ui-test-entry.cjs')],cwd:root,env});
 try {
  await app.firstWindow();
  await new Promise(r=>setTimeout(r,2500));
  const page=app.windows().find(p=>p.url().startsWith('http://localhost:5184'));
  assert.ok(page,'main window');page.on('dialog',d=>d.accept());
  await page.waitForFunction(()=>window._reelsState&&typeof _rbtTtsProvider==='function',null,{timeout:20000});
  await page.evaluate(profile=>{
   localStorage.setItem('vk_default_output_dir',profile);localStorage.setItem('rbt_tts_provider','elevenlabs');
   _batchTableState.projectDir='';_batchTableState.tabs=[{id:'tab_1',name:'微软配音测试',tasks:[]}];_batchTableState.activeTabId='tab_1';
   window._reelsState.tasks=[{id:'edge-test-1',baseName:'微软测试一',ttsText:'你好，这是任务表里的微软配音测试。',txtContent:'测试字幕',ttsVoiceId:''},{id:'edge-test-2',baseName:'微软测试二',ttsText:'第二条任务也可以使用微软语音。',txtContent:'另一条字幕',ttsVoiceId:''}];
   reelsToggleBatchTable();
  },profile);
  await page.locator('#rbt-tts-provider').selectOption('edge');
  await page.waitForFunction(()=>document.querySelectorAll('#rbt-tts-voices-list option').length>100,null,{timeout:60000});
  assert.equal(await page.locator('#rbt-tts-model').isDisabled(),true);
  await page.locator('#rbt-tts-default-voice').fill('edge:zh-CN-XiaoxiaoNeural');
  await page.locator('#rbt-tts-default-voice').dispatchEvent('change');
  await page.locator('#rbt-apply-voice-all-btn').click();
  await page.locator('#rbt-tts-provider').selectOption('elevenlabs');
  assert.equal(await page.locator('#rbt-tts-model').isDisabled(),false);
  await page.locator('#rbt-tts-provider').selectOption('edge');
  assert.equal(await page.locator('#rbt-tts-default-voice').inputValue(),'edge:zh-CN-XiaoxiaoNeural');
  await page.evaluate(()=>_runTTSBatchProcessing());
  const tasks=await page.evaluate(()=>window._reelsState.tasks.map(t=>({audio:t.audioPath,srt:t.srtPath,voice:t.ttsVoiceId,aligned:t.aligned})));
  for(const t of tasks){assert.equal(t.voice,'edge:zh-CN-XiaoxiaoNeural');assert.ok(t.audio&&fs.statSync(t.audio).size>1000);assert.ok(t.srt&&fs.readFileSync(t.srt,'utf8').includes('-->'));assert.equal(t.aligned,true);}
  await page.locator('#rbt-save-queue-btn').click();await page.locator('[data-name]').fill('微软配音队列');await page.locator('[data-save]').click();await page.locator('#rbt-queue-dialog').waitFor({state:'detached'});
  const snapshot=await page.evaluate(async()=>{const {queues}=await _queueRequest('queue-library/list');return (await _queueRequest('queue-library/load',{id:queues[0].id})).snapshot;});
  assert.equal(snapshot.tabs[0].tasks[0].ttsVoiceId,'edge:zh-CN-XiaoxiaoNeural');
  fs.mkdirSync(path.join(root,'diagnostics/edge-tts'),{recursive:true});await page.screenshot({path:path.join(root,'diagnostics/edge-tts/task-table.png')});
  console.log('PASS: live Edge voices, provider switch, 2-row real synthesis, MP3/SRT backfill, queue voice persistence');
  console.log('TEST_OUTPUT',profile);
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
