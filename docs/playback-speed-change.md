# 视频倍速功能变更记录

日期：2026-10-12（Asia/Shanghai）

## 修改范围与行为

基于 Git 版本 `8176b3d` 实现讨论中的方案一。开始修改时工作区干净。

- `backend/static/index.html`：视频区域增加统一的 Playback speed 下拉框。
- `backend/static/styles.css`：增加控件布局样式。
- `backend/static/app.js`：管理播放速度，应用到单视频及全部摄像头。
- 默认 1x，可选 0.25x、0.5x、1x、2x、3x、4x、5x。
- 单视频保留原生 controls；通过原生菜单修改速度时，下拉框同步实际速度。
- 切换 episode、主摄像头、单/多摄像头模式保持速度；成功加载新数据集或刷新页面后恢复 1x。
- 未选择 episode 或数据集无视频时隐藏倍速控件。
- 倍速只影响播放速度，标注秒数、帧数继续使用原始媒体时间及数据集 FPS。
- 不修改后端、API、视频文件、标注存储或导出流程。

## 正在运行的服务

启动参数为 `uvicorn backend.app:app --reload --host 0.0.0.0 --port 7860`。
确认当前安装的 Uvicorn WatchFilesReload 默认只将 `*.py` 变化视为重启条件。
本次修改仅涉及静态文件及 Markdown，未执行启动脚本或重启服务。
修改前后服务监控进程 PID 为 `147509`，工作进程 PID 为 `147512`，启动时间均为 2026-10-12 09:51:08。

已有页面继续使用之前加载的代码。先保存当前 episode，再刷新页面加载新功能。
如果浏览器缓存导致新控件未出现，保存后执行强制刷新。

## 原始文件备份与恢复

修改前，三个静态文件完整复制到项目外目录：

```text
/home/jszn/.local/state/lerobot-annotate/backups/20261012-113533-playback-speed/
```

目录内包含 `index.html`、`app.js`、`styles.css` 和记录 SHA-256 的 `manifest.json`。
保留该备份目录即可直接恢复，不依赖 Git 提交或远程仓库。

恢复前先保存正在标注的 episode。在终端执行：

```bash
cp /home/jszn/.local/state/lerobot-annotate/backups/20261012-113533-playback-speed/index.html /data/4T-1/hewu/alg-product/lerobot-annotate/backend/static/index.html
cp /home/jszn/.local/state/lerobot-annotate/backups/20261012-113533-playback-speed/app.js /data/4T-1/hewu/alg-product/lerobot-annotate/backend/static/app.js
cp /home/jszn/.local/state/lerobot-annotate/backups/20261012-113533-playback-speed/styles.css /data/4T-1/hewu/alg-product/lerobot-annotate/backend/static/styles.css
```

然后刷新浏览器即可，无需重启后端。这三条命令恢复本次修改前的静态文件；如果之后继续修改这些文件，请先备份后续改动再恢复。标注数据不会被这些命令覆盖。

## 验证结果

- `git diff --check` 通过，Node.js `--check` JavaScript 语法检查通过。
- 在独立无头 Chromium 中使用模拟 API 和 12 秒、30 FPS 合成视频验证：
  - 全部七个倍速档位同步到所有摄像头。
  - 多摄像头播放、暂停、拖动进度同步正常。
  - 2x 播放后取第 3 秒的任务起点，结果为 3 秒、90 帧。
  - 切换 episode、主摄像头、单/多模式保持速度。
  - 单视频保留原生 controls，原生速度改为 1.75x 时下拉框正确同步；重新选预设档位后清除临时选项。
  - 成功重新加载数据集恢复 1x；无视频数据集隐藏控件。
  - 未捕获到 JavaScript 页面异常。
- 浏览器验证的全部网络请求均被拦截，没有调用运行中服务的数据集加载或保存接口。
- 临时验证脚本和工具位于 `/tmp/lerobot-speed-check/`，未加入项目依赖。
- 实际数据集的视频性能及长期多摄像头漂移未在用户当前标注会话中测试；沿用已有的播放、暂停和 seek 同步机制。

## 后续档位调整（2026-10-12）

按用户要求将预设档位调整为 0.25x、0.5x、1x、2x、3x、4x、5x，仅修改 HTML 选项。
调整前的 HTML 另存于上述备份目录的 `index.before-speed-presets.html`；原始三个文件备份继续保留。
调整后重新运行独立 Chromium 模拟验证，七个新档位及既有切换、标注行为全部通过；`git diff --check` 通过，服务进程 PID 与启动时间保持不变。
恢复到调整前的倍速档位可执行：

```bash
cp /home/jszn/.local/state/lerobot-annotate/backups/20261012-113533-playback-speed/index.before-speed-presets.html /data/4T-1/hewu/alg-product/lerobot-annotate/backend/static/index.html
```
