const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { createQueueLibrary } = require('../electron/services/queueLibrary');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'videokit-queue-test-'));
const library = createQueueLibrary(path.join(root, 'library'));
const srt = path.join(root, 'captions.srt');
fs.writeFileSync(srt, '1\n00:00:00,000 --> 00:00:01,000\n原始字幕\n');
const snapshot = { version: '2.0', activeTabId: 'a', tabs: [
    { id: 'a', name: '账号一', tasks: [{ id: '1', audioPath: 'C:/音频/a.wav', bgPath: 'C:/素材/v.mp4', srtPath: srt, segments: [{text:'原始字幕',start:0,end:1}], subtitleStyle: {fontSize:42}, overlays:[{title_text:'标题'}] }] },
    { id: 'b', name: '账号二', tasks: [{ id: '2', audioPath: 'C:/音频/a.wav', bgPath: 'C:/素材/v2.mp4', bgmPath: 'C:/音乐/b.mp3' }] },
], project: {style:{fontSize:42},exportOpts:{quality:'high'}} };
let saved;
test('save preserves multi-tab configuration, unique media counts and inline subtitles', () => {
    saved=library.save('中文队列', snapshot);
    assert.deepEqual(saved.counts,{tasks:2,audio:2,video:2,subtitles:1,tabs:2});
    assert.ok(Date.parse(saved.savedAt));
    assert.equal(snapshot.tabs[0].tasks[0].srtContent,undefined);
    assert.equal(library.list()[0].name,'中文队列');
});
test('disk reload survives source subtitle edits and uses a separate restored file', () => {
    fs.writeFileSync(srt,'changed');
    const restored=createQueueLibrary(path.join(root,'library')).load(saved.id);
    assert.equal(restored.snapshot.tabs.length,2);
    const task=restored.snapshot.tabs[0].tasks[0];
    assert.match(fs.readFileSync(task.srtPath,'utf8'),/原始字幕/);
    assert.notEqual(task.srtPath,srt);
    assert.equal(task.subtitleStyle.fontSize,42);
    assert.equal(restored.snapshot.project.exportOpts.quality,'high');
    assert.equal(fs.readFileSync(srt,'utf8'),'changed');
});
test('same name creates independent snapshots and malformed entries do not break list', () => {
    const another=library.save('中文队列',snapshot);
    assert.notEqual(another.id,saved.id);
    fs.writeFileSync(path.join(root,'library','00000000-0000-0000-0000-000000000000.json'),'{');
    assert.equal(library.list().length,2);
    assert.throws(()=>library.load('../outside'));
    assert.throws(()=>library.save('bad',{version:'2.0',tabs:[{}]}));
});
test('Groq adapter sends the documented model and word timestamp multipart fields', async () => {
    const file=path.resolve(__dirname,'../electron/services/cloudTranscription.js');
    const context={require:n=>n==='./gladia'?{}:n==='./settings'?{}:require(n),module:{exports:{}},Buffer,URL,setTimeout,clearTimeout,console:{log(){},warn(){}}};
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(file,'utf8')+'\nmodule.exports.segment=transcribeSegment; request=async (options)=>{globalThis.sent=options; return {status:200,body:Buffer.from(JSON.stringify({text:"Hello",words:[{word:"Hello",start:0,end:1}]}))}};',context);
    const result=await context.module.exports.segment('groq',srt,'test-key-only','english');
    assert.equal(context.sent.url,'https://api.groq.com/openai/v1/audio/transcriptions');
    assert.equal(context.sent.headers.Authorization,'Bearer test-key-only');
    assert.match(context.sent.body.toString(),/whisper-large-v3-turbo/);
    assert.match(context.sent.body.toString(),/name="timestamp_granularities\[\]"\r\n\r\nword/);
    assert.match(context.sent.body.toString(),/verbose_json/);
    assert.equal(result.words[0].start,0);
    assert.equal(result.words[0].end,1);
});
