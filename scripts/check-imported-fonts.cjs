const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),appRoot=path.join(root,'VideoKit-main');
const source=fs.readFileSync(path.join(appRoot,'electron/main.js'),'utf8');let handler;
const begin=source.indexOf("    ipcMain.handle('scan-fonts'"),end=source.indexOf("    ipcMain.handle('get-cache-info'",begin);
vm.runInNewContext(source.slice(begin,end),{ipcMain:{handle:(name,fn)=>handler=fn},fs,path,require,process,app:{isPackaged:false},__dirname:path.join(appRoot,'electron'),log:()=>{}});
(async()=>{const scanned=await handler(),report=JSON.parse(fs.readFileSync(path.join(appRoot,'subtitled-font-import.json'),'utf8'));
for(const item of report.added){const target=path.join(root,item.target);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex'),item.sha256);const font=scanned.find(f=>f.path===target);assert.ok(font,'not scanned '+item.family);assert.equal(font.family,item.family);assert.equal(font.weight,item.weight);}
const rows=report.added.map(f=>`| ${f.family} | ${f.style} | ${f.weight} | ${f.source.includes('personal')?'本地个人字体':'公开字体'} |`).join('\n');
fs.writeFileSync(path.join(appRoot,'字体补充清单.md'),`# Subtitled → VideoKit 字体补充\n\n已扫描 ${report.sourceFiles} 个文件；现有字体覆盖 ${report.coveredFiles} 个，补充 ${report.addedFiles} 个文件、${report.families.length} 个字体家族（含新增字重）。\n\n33 个公开字体文件位于 assets/fonts，57 个个人字体文件位于 fonts-local；均保持原字体字节不变，并复制随附许可和说明。个人字体仅接入本地源码版，不进入发布资源。\n\n重启 VideoKit 后，在字幕、覆层等字体下拉框按名称搜索即可。\n\n| 字体 | 样式 | 字重 | 来源 |\n|---|---|---|---|\n${rows}\n`);
console.log(`PASS: all ${report.addedFiles} imported files match source hashes and are scanned with correct families and weights; ${scanned.length} total scanned files.`);
})().catch(e=>{console.error(e);process.exitCode=1});
