const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),os=require('os'),vm=require('vm');
const {parseVoice}=require('../electron/services/edgeTts');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'videokit-edge-test-'));
function workflow(){
 const calls={edge:0,eleven:0,keys:0};
 const context={require:name=>({
 './elevenlabs':{loadKeys:()=>{calls.keys++;return ['test-only'];},requestTTSWithRotation:async()=>{calls.eleven++;return {audio:Buffer.from('eleven-audio'),usedKey:'test'};}},
 './edgeTts':{synthesize:async(text,voice)=>{calls.edge++;assert.equal(voice,'edge:zh-CN-XiaoxiaoNeural');return {audio:Buffer.from('edge-audio'),srt:'1\n00:00:00,100 --> 00:00:01,000\n测试字幕\n',usedKey:null};}},
 './settings':{loadTranscriptionProviders:()=>{throw Error('Edge must not request transcription credentials');}},
 './ffmpeg':{},'./gladia':{},'./cloudTranscription':{},
 }[name]||require(name)),module:{exports:{}},console,Buffer};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../electron/services/workflow.js'),'utf8'),context);
 return {run:context.module.exports.ttsWorkflow,calls};
}
test('Edge voice prefix is validated; arbitrary or empty voice IDs are rejected',()=>{
 assert.equal(parseVoice('edge:zh-CN-XiaoxiaoNeural'),'zh-CN-XiaoxiaoNeural');
 assert.throws(()=>parseVoice(''));assert.throws(()=>parseVoice('voice; command'));assert.throws(()=>parseVoice('abcElevenId'));
});
test('Edge workflow generates audio and native subtitles without any API credentials',async()=>{
 const {run,calls}=workflow();const result=await run({text:'测试字幕',voice_id:'edge:zh-CN-XiaoxiaoNeural',tts_provider:'edge',subtitle_text:'这是另一段字幕',need_split:false,output_dir:path.join(temp,'edge')});
 assert.deepEqual(calls,{edge:1,eleven:0,keys:0});assert.equal(result.tts_provider,'edge');assert.equal(fs.readFileSync(result.audio_path,'utf8'),'edge-audio');assert.match(fs.readFileSync(result.srt_path,'utf8'),/测试字幕/);assert.equal(result.partial_success,false);
});
test('Existing ElevenLabs tasks still use their original adapter',async()=>{
 const {run,calls}=workflow();const result=await run({text:'old task',voice_id:'oldVoiceId',need_split:false,output_dir:path.join(temp,'eleven')});
 assert.deepEqual(calls,{edge:0,eleven:1,keys:1});assert.equal(result.tts_provider,'elevenlabs');
});
test('Provider mismatch fails before any synthesis',async()=>{
 const {run,calls}=workflow();await assert.rejects(run({text:'test',voice_id:'oldVoiceId',tts_provider:'edge'}),/edge:/);assert.equal(calls.edge+calls.eleven,0);
});
