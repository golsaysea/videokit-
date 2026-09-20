const { _electron: electron } = require(process.env.PLAYWRIGHT_MODULE);
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'videokit-ui-test-'));
 const env={...process.env,VIDEOKIT_TEST_PROFILE:profile}; delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:require('electron'),args:[path.join(__dirname,'queue-ui-test-entry.cjs')],cwd:root,env});
 try{
  let page=await app.firstWindow(); console.log('FIRST',page.url());
  await new Promise(r=>setTimeout(r,2500)); console.log('WINDOWS',app.windows().map(p=>p.url())); page=app.windows().find(p=>p.url().startsWith('http://localhost:5173')) || page;
  page.on('dialog',d=>d.accept());
  await page.waitForFunction(()=>typeof _openQueueLibrary==='function' && window._reelsState, null, {timeout:15000}); console.log('READY');
  await page.evaluate(()=>{
   _batchTableState.projectDir='';
   _batchTableState.tabs=[{id:'tab_1',name:'测试账号',tasks:[]}];
   _batchTableState.activeTabId='tab_1';
   window._reelsState.tasks=[{id:'sample',baseName:'字幕样式测试',txtContent:'保存后的字幕文案',subtitleStyle:{font_size:48},segments:[{text:'测试字幕',start:0,end:1}]}];
   reelsToggleBatchTable();
  });
  await page.locator('#rbt-save-queue-btn').click();
  await page.locator('[data-name]').fill('测试队列 · 中文字幕');
  await page.locator('[data-save]').click();
  await page.locator('#rbt-queue-dialog').waitFor({state:'detached'});
  await page.locator('#rbt-load-queue-btn').click();
  await page.getByText('测试队列 · 中文字幕',{exact:true}).waitFor();
  await page.screenshot({path:path.join(root,'queue-library-preview.png')});
  await page.evaluate(()=>{window._reelsState.tasks[0].txtContent='覆盖前的文案';});
  await page.getByRole('button',{name:'调用此队列'}).click();
  await page.locator('#rbt-queue-dialog').waitFor({state:'detached'});
  const restored=await page.evaluate(()=>window._reelsState.tasks[0]);
  assert.equal(restored.txtContent,'保存后的字幕文案');
  const list=await page.evaluate(()=>_queueRequest('queue-library/list'));
  assert.equal(list.queues.length,2);
  await page.locator('#rbt-cloud-settings-btn').click();
  await page.locator('[data-save]').waitFor({state:'visible'});
  await page.locator('[data-provider]').selectOption('groq');
  await page.locator('[data-keys]').fill('test-key-only');
  await page.locator('[data-save]').click();
  await page.locator('#rbt-queue-dialog').waitFor({state:'detached'});
  const conf=await page.evaluate(()=>_queueRequest('settings/transcription-providers'));
  assert.equal(conf.primary,'groq'); assert.equal(conf.providers.groq.keyCount,1);
  console.log('PASS: Electron queue save, list, restore, backup and Groq settings UI');
 } finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});


