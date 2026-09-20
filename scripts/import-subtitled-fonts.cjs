const fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib');
const root=path.resolve(__dirname,'../..'),src=path.join(root,'fonts'),dest=path.join(root,'VideoKit-main/assets/fonts');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
function info(file){
 const b=fs.readFileSync(file), tables={};const woff=b.toString('ascii',0,4)==='wOFF';
 const n=b.readUInt16BE(woff?12:4);
 for(let i=0;i<n;i++){const o=(woff?44:12)+i*(woff?20:16),tag=b.toString('ascii',o,o+4),off=b.readUInt32BE(o+(woff?4:8)),len=b.readUInt32BE(o+(woff?8:12));let data=b.subarray(off,off+len);if(woff&&len<b.readUInt32BE(o+12))data=zlib.inflateSync(data);tables[tag]=data;}
 const names=tables.name,records=[];for(let i=0;i<names.readUInt16BE(2);i++){const o=6+i*12,platform=names.readUInt16BE(o),lang=names.readUInt16BE(o+4),id=names.readUInt16BE(o+6),len=names.readUInt16BE(o+8),off=names.readUInt16BE(4)+names.readUInt16BE(o+10);let text;if(platform===0||platform===3){text=Buffer.from(names.subarray(off,off+len)).swap16().toString('utf16le');}else text=names.toString('latin1',off,off+len);records.push({id,text,rank:(lang===1033?4:0)+(platform===3?2:0)});}
 const name=id=>records.filter(r=>r.id===id).sort((a,b)=>b.rank-a.rank)[0]?.text;
 const family=name(16)||name(1),style=name(17)||name(2)||'Regular';let weight=tables['OS/2']?.readUInt16BE(4)||400,range=null;
 if(tables.fvar){const t=tables.fvar,o=t.readUInt16BE(4),count=t.readUInt16BE(8),size=t.readUInt16BE(10);for(let i=0;i<count;i++){const a=o+i*size;if(t.toString('ascii',a,a+4)==='wght')range=[t.readInt32BE(a+4)/65536,t.readInt32BE(a+12)/65536];}}
 return {file,family,style,weight,range,italic:/italic|oblique/i.test(style),hash:crypto.createHash('sha256').update(b).digest('hex')};
}
const fontFiles=dir=>files(dir).filter(f=>/\.(ttf|otf|woff)$/i.test(f));
const source=fontFiles(src).map(info),existing=fontFiles(dest).map(info),added=[],covered=[];
const norm=s=>s.toLowerCase().replace(/[\s_-]/g,'');
for(const f of source){const same=existing.filter(e=>norm(e.family)===norm(f.family)&&e.italic===f.italic);if(existing.some(e=>e.hash===f.hash)||same.some(e=>f.range?e.range&&e.range[0]<=f.range[0]&&e.range[1]>=f.range[1]:e.range?e.range[0]<=f.weight&&e.range[1]>=f.weight:e.weight===f.weight)){covered.push(f);continue;}
 const personal=f.file.includes(path.sep+'personal'+path.sep);
 const folder=path.join(personal?path.join(root,'VideoKit-main/fonts-local'):dest,f.family.replace(/[<>:"/\\|?*]/g,'').replace(/_/g,' '));
 const label=f.italic?'Italic':'Regular';const filename=`${f.family.replace(/[^a-zA-Z0-9]/g,'')||'Font'}-${f.range?'VariableFont-wght-'+label:({100:'Thin',200:'ExtraLight',300:'Light',400:'Regular',500:'Medium',600:'SemiBold',700:'Bold',800:'ExtraBold',900:'Black'}[f.weight]||String(f.weight))+(f.italic?'-Italic':'')}${path.extname(f.file)}`;
 let target=path.join(folder,filename);if(fs.existsSync(target))target=path.join(folder,f.hash.slice(0,8)+'-'+filename);
 added.push({...f,target});existing.push(f);
}
if(process.argv.includes('--apply'))for(const f of added){fs.mkdirSync(path.dirname(f.target),{recursive:true});fs.copyFileSync(f.file,f.target); const metaFile=path.join(path.dirname(f.target),'font-metadata.json'); const metadata=fs.existsSync(metaFile)?JSON.parse(fs.readFileSync(metaFile,'utf8')):{}; metadata[path.basename(f.target)]={family:f.family,weight:f.range?f.range.join(' '):String(f.weight),style:f.italic?'italic':'normal'};fs.writeFileSync(metaFile,JSON.stringify(metadata,null,2));for(const license of fs.readdirSync(path.dirname(f.file)).filter(n=>/ofl|license|licence|copyright|notice|readme/i.test(n))){const from=path.join(path.dirname(f.file),license);if(fs.statSync(from).isFile()){let to=path.join(path.dirname(f.target),license);if(fs.existsSync(to)&&!fs.readFileSync(to).equals(fs.readFileSync(from)))to=path.join(path.dirname(f.target),'Subtitled-'+license);fs.copyFileSync(from,to);}}}
const result={sourceFiles:source.length,coveredFiles:covered.length,addedFiles:added.length,families:[...new Set(added.map(f=>f.family))],added:added.map(f=>({family:f.family,style:f.style,weight:f.range?f.range.join(' '):String(f.weight),source:path.relative(root,f.file),target:path.relative(root,f.target),sha256:f.hash}))};
fs.writeFileSync(path.join(root,'VideoKit-main/subtitled-font-import.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,added:undefined},null,2));
