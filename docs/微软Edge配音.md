# 微软 Edge 在线配音

## 使用

重启 VideoKit → 打开任务表 → 人声工具 → 配音服务选择“微软 Edge（无需 Key）”。
声音列表从 Edge 在线服务读取，可输入 zh-CN、en-US、Xiaoxiao 等名称筛选。默认中文声音为 edge:zh-CN-XiaoxiaoNeural。点击“应用全部”会填入没有音色的任务行；已有音色保留，可在各行“人声-配音音色”中重新选择。
填写“人声-配音文案”，选择仅批量生成配音或完整流水线执行。支持单行、选中行、当前标签及已有跨标签流程。

Edge 会生成 MP3 和按实际配音文案输出的句子级 SRT，无需 Azure、ElevenLabs、Groq 或 Gladia Key。若希望使用另外编写的断行文案，可以在生成后使用原来的字幕对齐功能。它是联网服务，不是离线配音。

每条任务的微软音色使用 edge: 前缀保存；旧 ElevenLabs Voice ID 仍使用 ElevenLabs。切换服务只改变默认音色列表，不重写已有任务音色。已生成任务/应用音色后的队列保存包含声音标识。

## 安装及维护

本机已安装 .venv-edge。其他 Windows 机器运行 setup-edge-tts.cmd（需要 Python 3.10+ 及网络）。依赖固定在 requirements-edge.txt。
可用 VIDEOKIT_EDGE_PYTHON 指定其他已经安装 edge-tts 的 Python。开发环境默认寻找本项目 .venv-edge；打包版需另行准备外部 Python 运行时及可直接读取的桥接脚本，本次未验证安装包发布。

后端：electron/services/edgeTts.js、edge_tts_bridge.py；共享配音后处理：electron/services/workflow.js；任务表：src/reels-batch-table.js。
声音或合成连接失败会显示错误，可刷新声音列表或稍后重试。Electron 主进程修改后需完整重启软件。

## 验证

- node --test scripts/check-edge-tts.cjs：声音 ID、Edge 无 Key 流程、ElevenLabs 兼容与服务不匹配保护。
- 在线读取 322 个声音（14 个中文），生成中文 MP3 与 SRT。
- scripts/check-edge-tts-ui.cjs：隔离桌面环境中的服务切换、真实批量配音及队列保存验证，需要 Vite 5184 端口和 PLAYWRIGHT_MODULE。

协议适配依据：https://github.com/rany2/edge-tts
许可记录：docs/DEPENDENCY_LICENSE_AUDIT.md。

## 独立微软语音页面

顶部 ElevenLabs 与字幕对齐之间的“微软语音”可独立批量生成配音：

1. 搜索并选择声音，设置语速。
2. 粘贴文案，按空行、逐行或整篇添加任务；也可一次导入多个 TXT，每个文件为一条任务。
3. 选择输出目录，点击“批量生成微软语音”。不选目录时使用系统下载目录。

每次运行创建独立的 Microsoft-TTS-时间-标识 文件夹，生成 MP3 和句子级 SRT。完成的任务可点击“播放音频”，也可打开输出目录。停止按钮在当前任务完成后停止；再次运行时跳过成功任务，重试未完成任务。

页面自动保存文案草稿、任务列表、音色、语速和生成文件路径，重新打开可继续使用。清空列表不会删除已经生成的文件。音频实际保存在磁盘输出目录，请保留文件以便后续播放。

页面实现：src/microsoft-tts.js。验证脚本 scripts/check-microsoft-page-ui.cjs 已通过独立 Electron 环境中的真实两条批量生成、中文声音筛选、MP3/SRT 文件及重载恢复检查。
