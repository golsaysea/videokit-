const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function validate(snapshot) {
    if (snapshot?.version !== '2.0' || !Array.isArray(snapshot.tabs) || !snapshot.tabs.length ||
        snapshot.tabs.some(tab => !tab || !Array.isArray(tab.tasks) || tab.tasks.some(t => !t || typeof t !== 'object' || Array.isArray(t)))) {
        throw new Error('队列数据无效');
    }
}

function summarize(snapshot) {
    const audio = new Set(), video = new Set();
    let tasks = 0, subtitles = 0;
    const visit = (value, key = '') => {
        if (typeof value === 'string') {
            if (/\.(mp3|wav|m4a|aac|flac|ogg|opus|wma)$/i.test(value)) audio.add(value.toLowerCase().replace(/\\/g, '/'));
            if (/\.(mp4|mov|mkv|webm|avi|m4v|wmv|mpeg|mpg)$/i.test(value)) video.add(value.toLowerCase().replace(/\\/g, '/'));
        } else if (Array.isArray(value)) value.forEach(v => visit(v, key));
        else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => {
            if (/path|file|pool|clips|cover|overlays/i.test(k)) visit(v, k);
        });
    };
    for (const tab of snapshot.tabs) for (const task of tab.tasks) {
        tasks++;
        if (task.srtPath || task.segments?.length || task.srtContent) subtitles++;
        visit(task);
    }
    return { tasks, audio: audio.size, video: video.size, subtitles, tabs: snapshot.tabs.length };
}

function createQueueLibrary(root) {
    const filename = id => {
        if (!/^[a-f0-9-]{36}$/.test(String(id))) throw new Error('队列编号无效');
        return path.join(root, `${id}.json`);
    };
    return {
        save(name, snapshot) {
            validate(snapshot);
            name = String(name || '').trim().slice(0, 120);
            if (!name) throw new Error('请输入队列名称');
            const copy = JSON.parse(JSON.stringify(snapshot));
            for (const tab of copy.tabs) for (const task of tab.tasks) {
                if (task.srtPath && fs.existsSync(task.srtPath)) task.srtContent = fs.readFileSync(task.srtPath, 'utf8');
            }
            const entry = { id: crypto.randomUUID(), name, savedAt: new Date().toISOString(), counts: summarize(copy), snapshot: copy };
            fs.mkdirSync(root, { recursive: true });
            const target = filename(entry.id);
            const temporary = `${target}.tmp`;
            try {
                fs.writeFileSync(temporary, JSON.stringify(entry), { flag: 'wx' });
                fs.renameSync(temporary, target);
            } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
            const { snapshot: _, ...metadata } = entry;
            return metadata;
        },
        list() {
            if (!fs.existsSync(root)) return [];
            return fs.readdirSync(root).filter(f => /^[a-f0-9-]{36}\.json$/.test(f)).flatMap(f => {
                try {
                    const entry = JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
                    validate(entry.snapshot);
                    return [{ id: path.basename(f, '.json'), name: entry.name, savedAt: entry.savedAt, counts: summarize(entry.snapshot) }];
                } catch { return []; }
            }).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
        },
        load(id) {
            const entry = JSON.parse(fs.readFileSync(filename(id), 'utf8'));
            validate(entry.snapshot);
            const restoreDir = path.join(root, 'restored-subtitles', crypto.randomUUID());
            let index = 0;
            for (const tab of entry.snapshot.tabs) for (const task of tab.tasks) {
                if (typeof task.srtContent === 'string') {
                    fs.mkdirSync(restoreDir, { recursive: true });
                    task.srtPath = path.join(restoreDir, `${++index}.srt`);
                    fs.writeFileSync(task.srtPath, task.srtContent, 'utf8');
                }
            }
            return entry;
        },
    };
}

module.exports = { createQueueLibrary, summarize, validate };
