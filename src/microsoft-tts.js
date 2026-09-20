/* Standalone Edge speech batch page. */
(() => {
    const KEY = 'videokit_microsoft_tts_queue_v1';
    let rows = [], voices = [], running = false, stopping = false, lastOutput = '', requestNumber = 0;
    const $ = id => document.getElementById('ms-' + id);
    const status = text => { $('progress').textContent = text; };
    function save() {
        try { localStorage.setItem(KEY, JSON.stringify({ rows, language: $('language').value, voice: $('voice').value, rate: $('rate').value, output: $('output').value, draft: $('text').value, lastOutput })); }
        catch (error) { status('自动保存失败，请减少队列文案或检查存储空间：' + error.message); }
    }
    async function request(endpoint, data) {
        const response = await apiFetch(API_BASE + '/' + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const value = await response.json();
        if (!response.ok || value.error) throw new Error(value.error || '请求失败');
        return value;
    }
    const labels = { waiting: '待生成', running: '正在生成…', success: '已完成', error: '失败' };
    function render() {
        $('queue').replaceChildren(); updateTotal();
        rows.forEach((row, index) => {
            const section = document.createElement('section');
            section.className = 'ms-card';
            const head = document.createElement('div'); head.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:8px;gap:12px;';
            const name = document.createElement('strong'); name.textContent = `${index + 1}. ${row.name} · ${labels[row.state] || '待生成'}`;
            const remove = document.createElement('button'); remove.className = 'btn btn-small'; remove.textContent = '移除'; remove.disabled = running;
            remove.onclick = () => { rows = rows.filter(r => r !== row); save(); render(); };
            head.append(name, remove);
            const text = document.createElement('textarea'); text.className = 'textarea'; text.rows = Math.max(3, row.text.split('\n').length); text.dir = 'auto'; text.placeholder = '输入文案…'; text.value = row.text; text.disabled = running;
            const count = document.createElement('span'); count.className = 'hint'; count.textContent = `${Array.from(row.text).length} 字`;
            text.oninput = () => { row.text = text.value; row.state = 'waiting'; row.audio = ''; row.srt = ''; row.error = ''; count.textContent = `${Array.from(row.text).length} 字`; updateTotal(); save(); }; 
            text.onchange = render;
            section.append(head, text, count);
            if (row.error) { const error = document.createElement('p'); error.textContent = row.error; error.style.color = '#ff8888'; section.append(error); }
            if (row.audio) {
                const path = document.createElement('p'); path.textContent = row.audio; path.style.cssText = 'font-size:12px;word-break:break-all;';
                const play = document.createElement('button'); play.className = 'btn btn-small'; play.textContent = '播放音频'; play.onclick = () => window.electronAPI.openPath(row.audio).catch(e => status(e.message));
                section.append(path, play);
            }
            $('queue').append(section);
        });
        for (const id of ['language','new','add','import','clear','choose-output','voice','rate','search','refresh','split','text']) { const el = $(id); if (el) el.disabled = running; }
        $('voice-search').disabled = running;
        $('start').disabled = running || !rows.some(r => r.state !== 'success');
        $('stop').disabled = !running || stopping;
    }
    function updateTotal() { $('total').textContent = rows.length + ' 条文案 · 共 ' + rows.reduce((n,r) => n + Array.from(r.text).length, 0) + ' 字'; }
    function parseCells(text) {
        const cells = []; let cell = '', quoted = false;
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (c === '"' && (quoted || cell === '')) {
                if (quoted && text[i+1] === '"') { cell += '"'; i++; }
                else quoted = !quoted;
            } else if (!quoted && (c === '\t' || c === '\n')) { cells.push(cell); cell = ''; }
            else cell += c;
        }
        cells.push(cell); return cells;
    }
    function clipboardCells(data) {
        const html = data.getData('text/html');
        if (html) {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const table = doc.querySelector('table');
            if (table) return Array.from(table.rows).flatMap(row => Array.from(row.cells).map(cell => {
                cell.querySelectorAll('br').forEach(br => br.replaceWith('\n')); return cell.textContent;
            }));
        }
        const plain = data.getData('text/plain');
        return plain.includes('\t') || $('split').value === 'cells' ? parseCells(plain) : null;
    }
    function fillVoices(selected = $('voice').value) {
        const q = $('voice-search').value.trim().toLowerCase().replace('中文', 'zh-');
        const language = $('language').value;
        const filtered = voices.filter(v => (language === 'all' || v.locale.split('-')[0] === language) && `${v.voice_id} ${v.name} ${v.locale} ${v.gender}`.toLowerCase().includes(q));
        $('voice').replaceChildren();
        for (const voice of filtered) $('voice').add(new Option(`${voice.voice_id.replace(/^edge:/,'')} · ${voice.gender === 'Female' ? '女声' : voice.gender === 'Male' ? '男声' : voice.gender}`, voice.voice_id));
        if (filtered.some(v => v.voice_id === selected)) $('voice').value = selected;
        $('voice-status').textContent = `显示 ${filtered.length} / ${voices.length} 个微软音色`;
    }
    async function loadVoices() {
        const number = ++requestNumber;
        const selected = $('voice').value;
        $('voice-status').textContent = '正在加载微软音色…';
        try {
            const data = await request('edge-tts/voices', { refresh: true });
            if (number !== requestNumber) return;
            voices = data.voices.sort((a,b) => Number(b.locale.startsWith('zh')) - Number(a.locale.startsWith('zh')) || a.voice_id.localeCompare(b.voice_id));
            const language = $('language').value || 'en';
            const names = new Intl.DisplayNames(['zh-CN'], {type:'language'});
            $('language').replaceChildren(new Option('全部语言', 'all'));
            const languages = [...new Set(voices.map(v => v.locale.split('-')[0]))].sort((a,b) => a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b));
            for (const lang of languages) $('language').add(new Option((names.of(lang) || lang) + ' · ' + lang, lang));
            $('language').value = languages.includes(language) || language === 'all' ? language : 'en';
            fillVoices(selected); save();
        } catch (error) { if (number === requestNumber) $('voice-status').textContent = error.message; }
    }
    function add(text, name) { if (text.trim()) rows.push({ id: crypto.randomUUID(), text: text.trim(), name, state: 'waiting', audio: '', srt: '' }); }
    async function start() {
        if (running) return;
        const voice = $('voice').value, rate = $('rate').value;
        if (!voice.startsWith('edge:')) return status('请先选择一个微软音色');
        const pending = rows.filter(r => r.state !== 'success');
        if (!pending.length) return status('没有待生成任务');
        if (pending.some(r => !r.text.trim())) return status('请填写所有待生成任务的文案，或移除空任务');
        running = true; stopping = false; render();
        let completed = 0, failed = 0;
        try {
            const base = $('output').value || await window.electronAPI.getDownloadsPath();
            if (!base) throw new Error('请选择保存目录');
            lastOutput = base.replace(/[\\/]+$/, '') + '/Microsoft-TTS-' + new Date().toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomUUID().slice(0,8);
            save();
            for (const row of pending) {
                if (stopping) break;
                row.state = 'running'; row.error = ''; render(); status(`正在生成 ${completed + failed + 1}/${pending.length}：${row.name}`);
                try {
                    const result = await request('tts/workflow', { text: row.text, voice_id: voice, tts_provider: 'edge', edge_rate: rate, task_index: rows.indexOf(row), need_split: false, export_mp4: false, export_fcpxml: false, output_dir: lastOutput });
                    if (!result.audio_path) throw new Error('服务未返回音频路径');
                    row.audio = result.audio_path; row.srt = result.srt_path || ''; row.voice = voice; row.rate = rate; row.state = 'success'; row.error = result.subtitle_error || ''; completed++;
                } catch (error) { row.state = 'error'; row.error = error.message; failed++; }
                save(); render();
            }
            status(`${stopping ? '已停止' : '生成结束'}：成功 ${completed} 条，失败 ${failed} 条。${lastOutput}`);
        } catch (error) { status('无法开始：' + error.message); }
        finally { running = false; stopping = false; save(); render(); }
    }
    document.addEventListener('DOMContentLoaded', () => {
        try {
            const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
            rows = (Array.isArray(stored.rows) ? stored.rows : []).filter(r => r && typeof r.text === 'string').map(r => ({...r,state:r.state === 'running' ? 'waiting' : r.state}));
            if (stored.language) { $('language').add(new Option(stored.language, stored.language)); $('language').value = stored.language; }
            if (stored.language && stored.voice?.startsWith('edge:')) { $('voice').add(new Option(stored.voice,stored.voice)); $('voice').value = stored.voice; }
            $('rate').value = stored.rate || '+0%'; $('output').value = stored.output || ''; $('text').value = stored.draft || ''; lastOutput = stored.lastOutput || '';
        } catch (_) { status('无法恢复上次队列，请重新添加文案'); }
        $('add').onclick = () => {
            const text = $('text').value, mode = $('split').value;
            const parts = mode === 'cells' ? parseCells(text) : mode === 'whole' ? [text] : text.split(mode === 'line' ? /\r?\n/ : /\r?\n\s*\r?\n/);
            parts.forEach(t => add(t, `文案 ${rows.length + 1}`)); $('text').value = ''; save(); render();
        };
        $('new').onclick = () => { rows.push({id:crypto.randomUUID(), text:'', name:'文案 ' + (rows.length+1), state:'waiting'}); save(); render(); $('queue').lastElementChild.querySelector('textarea').focus(); };
        $('text').addEventListener('paste', event => {
            if (running || !event.clipboardData) return;
            const cells = clipboardCells(event.clipboardData);
            if (!cells) return;
            event.preventDefault(); const before = rows.length;
            cells.forEach(t => add(t, '文案 ' + (rows.length+1))); save(); render(); status('已从粘贴内容添加 ' + (rows.length-before) + ' 条文案');
        });
        $('language').onchange = () => { $('voice-search').value = ''; fillVoices(); save(); };
        $('import').onclick = () => $('files').click();
        $('files').onchange = async event => {
            try { for (const file of event.target.files) add(await file.text(), file.name.replace(/\.txt$/i,'')); save(); render(); }
            catch(error) { status('导入失败：'+error.message); }
            event.target.value = '';
        };
        $('clear').onclick = () => { if (rows.length && !confirm('清空此页面队列？已生成的音频文件会保留。')) return; rows = []; save(); render(); };
        $('choose-output').onclick = async () => { try { const dir = await window.electronAPI.selectDirectory(); if (dir) {$('output').value = dir; save();} } catch(e) {status(e.message);} };
        $('open-output').onclick = async () => { try {const dir = lastOutput || $('output').value || await window.electronAPI.getDownloadsPath(); if(dir) await window.electronAPI.openPath(dir);} catch(e){status(e.message);} };
        $('refresh').onclick = loadVoices; $('voice-search').oninput = () => fillVoices();
        $('voice').onchange = save; $('rate').onchange = save; $('text').oninput = save;
        $('start').onclick = start; $('stop').onclick = () => { stopping = true; status('将在当前任务完成后停止，剩余任务可稍后继续'); render(); };
        document.querySelector('[data-tab="microsoft-tts"]').addEventListener('click', () => {if (!voices.length) loadVoices();});
        render();
    });
})();
