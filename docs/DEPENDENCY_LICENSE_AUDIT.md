# Edge 配音依赖许可核对

核对日期：2026-09-20。本记录仅覆盖本次 VideoKit 新增功能；不改变父目录 Subtitled 的依赖统计或项目许可。

| 新增直接运行依赖 | 版本 | 许可 | 开源 | 核对依据 |
|---|---|---|---|---|
| edge-tts | 7.2.8 | LGPL-3.0（发布元数据标注 LGPLv3） | 是 | PyPI 发布元数据及安装包 LICENSE |

来源：
- https://pypi.org/project/edge-tts/7.2.8/
- https://github.com/rany2/edge-tts
- https://github.com/rany2/edge-tts/blob/master/LICENSE

原始许可证副本：third-party/edge-tts/LICENSE。上游代码未修改。requirements-edge.txt 固定直接依赖版本；安装在 .venv-edge 中，以独立 Python 进程调用，可替换或升级。虚拟环境不提交到 Git。

LGPL 依赖可与父项目的 GPL-3.0-only 使用方式兼容。VideoKit 自身原快照未提供项目级 LICENSE，本说明不为其新增授权。若将 Python 运行环境另行打包发布，需要同时保留依赖许可、版权、对应源代码获取方式及用户替换库的能力；本次仅验证本地源码启动版。

新增直接依赖数：1。aiohttp、certifi、tabulate、typing-extensions 等为传递依赖，未计入直接依赖数量。环境安装保留各包自带 dist-info 许可文件。
