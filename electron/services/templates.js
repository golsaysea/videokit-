/**
 * templates.js — 视频模板预设 CRUD 服务
 * 
 * 存储位置: userData/videokit-templates/
 *   - index.json          模板索引（轻量，含缩略图 base64）
 *   - tpl_<id>.json       模板完整数据（项目工程数据）
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function getTemplatesDir() {
    const dir = path.join(app.getPath('userData'), 'videokit-templates');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

function getIndexPath() {
    return path.join(getTemplatesDir(), 'index.json');
}

function readIndex() {
    const p = getIndexPath();
    if (!fs.existsSync(p)) return [];
    try {
        return JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch {
        return [];
    }
}

function writeIndex(index) {
    fs.writeFileSync(getIndexPath(), JSON.stringify(index, null, 2), 'utf-8');
}

/**
 * 列出所有模板（返回索引信息，不含完整工程数据）
 */
function listTemplates() {
    return readIndex();
}

/**
 * 获取单个模板的完整数据
 */
function getTemplate(id) {
    const filePath = path.join(getTemplatesDir(), `${id}.json`);
    if (!fs.existsSync(filePath)) {
        throw new Error(`模板不存在: ${id}`);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * 保存模板
 * @param {object} params
 * @param {string} params.name - 模板名称
 * @param {string} [params.description] - 描述
 * @param {string} [params.thumbnail] - 缩略图 base64
 * @param {string[]} [params.tags] - 标签
 * @param {object} params.projectData - 完整工程数据 (collectProjectData 的输出)
 * @param {string} [params.id] - 已有 ID（更新时传入）
 */
function saveTemplate({ id, name, description, thumbnail, tags, projectData }) {
    const now = new Date().toISOString();
    const templateId = id || `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // 完整数据写入独立文件
    const fullData = {
        id: templateId,
        name,
        description: description || '',
        thumbnail: thumbnail || '',
        tags: tags || [],
        createdAt: now,
        updatedAt: now,
        projectData,
    };

    const filePath = path.join(getTemplatesDir(), `${templateId}.json`);

    // 如果是更新，保留原始创建时间
    if (id && fs.existsSync(filePath)) {
        try {
            const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            fullData.createdAt = existing.createdAt || now;
        } catch { /* use now */ }
    }

    fs.writeFileSync(filePath, JSON.stringify(fullData, null, 2), 'utf-8');

    // 更新索引
    const index = readIndex();
    const existingIdx = index.findIndex(t => t.id === templateId);
    const indexEntry = {
        id: templateId,
        name,
        description: description || '',
        thumbnail: thumbnail || '',
        tags: tags || [],
        createdAt: fullData.createdAt,
        updatedAt: now,
        // 摘要信息
        taskCount: projectData?.tasks?.length || 0,
    };

    if (existingIdx >= 0) {
        index[existingIdx] = indexEntry;
    } else {
        index.unshift(indexEntry); // 新模板排在最前面
    }

    writeIndex(index);
    return { id: templateId, success: true };
}

/**
 * 删除模板
 */
function deleteTemplate(id) {
    // 删除数据文件
    const filePath = path.join(getTemplatesDir(), `${id}.json`);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    // 更新索引
    const index = readIndex();
    const filtered = index.filter(t => t.id !== id);
    writeIndex(filtered);

    return { success: true };
}

/**
 * 重命名模板
 */
function renameTemplate(id, newName) {
    const filePath = path.join(getTemplatesDir(), `${id}.json`);
    if (!fs.existsSync(filePath)) {
        throw new Error(`模板不存在: ${id}`);
    }

    // 更新数据文件
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    data.name = newName;
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    // 更新索引
    const index = readIndex();
    const entry = index.find(t => t.id === id);
    if (entry) {
        entry.name = newName;
        entry.updatedAt = data.updatedAt;
    }
    writeIndex(index);

    return { success: true };
}

module.exports = {
    listTemplates,
    getTemplate,
    saveTemplate,
    deleteTemplate,
    renameTemplate,
};
