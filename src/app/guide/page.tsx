'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">返回</span>
          </Link>
          <h1 className="text-sm font-semibold text-white">ToneMaster AI 使用指南</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-12">

        {/* Hero */}
        <section className="text-center space-y-4">
          <h2 className="text-2xl font-bold">ToneMaster AI</h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-xl mx-auto">
            练琴时手动切换音色，打断节奏、中断肌肉记忆。ToneMaster 让你在时间轴上编排音色切换点，
            播放时自动通过 MIDI Program Change 切换 Neural DSP 插件预设——专注弹琴，音色自动跟上。
          </p>
          <div className="flex items-center justify-center gap-3 text-xs">
            <span className="px-3 py-1 rounded-full bg-green-900/30 text-green-400 border border-green-800">自动切换音色</span>
            <span className="px-3 py-1 rounded-full bg-blue-900/30 text-blue-400 border border-blue-800">MIDI 精准控制</span>
            <span className="px-3 py-1 rounded-full bg-purple-900/30 text-purple-400 border border-purple-800">时间轴编排</span>
          </div>
        </section>

        {/* Step 1: 前置准备 */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-green-900/40 text-green-400 flex items-center justify-center text-sm font-bold">1</span>
            <h3 className="text-lg font-semibold">前置准备 — 安装虚拟 MIDI 端口</h3>
          </div>
          <div className="ml-11 space-y-4">
            <p className="text-sm text-zinc-400 leading-relaxed">
              ToneMaster 通过虚拟 MIDI 端口向 Neural DSP 发送 Program Change 信号。
              你需要先创建一个虚拟 MIDI 端口，让 ToneMaster 和插件之间能通信。
            </p>

            {/* macOS */}
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <h4 className="text-sm font-medium text-white mb-3">macOS — 使用 IAC Driver</h4>
              <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
                <li>打开「音频 MIDI 设置」（Audio MIDI Setup）— 在 Spotlight 搜索即可</li>
                <li>菜单栏 → 窗口 → 显示 MIDI 音乐工作室（Show MIDI Studio）</li>
                <li>双击「IAC Driver」图标</li>
                <li>勾选「设备已上线」（Device is online）</li>
                <li>在端口列表中添加一个端口，命名为 <code className="text-green-400 bg-zinc-800 px-1 rounded">ToneMaster</code></li>
              </ol>
            </div>

            {/* Windows */}
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <h4 className="text-sm font-medium text-white mb-3">Windows — 使用 loopMIDI</h4>
              <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
                <li>下载 <a href="https://www.tobias-erichsen.de/software/loopmidi.html" target="_blank" className="text-green-400 hover:underline">loopMIDI</a> 并安装</li>
                <li>打开 loopMIDI，在端口名称栏输入 <code className="text-green-400 bg-zinc-800 px-1 rounded">ToneMaster</code></li>
                <li>点击 "+" 创建端口</li>
                <li>确保 loopMIDI 保持运行状态</li>
              </ol>
            </div>
          </div>
        </section>

        {/* Step 2: 配置音色 Mapping */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-green-900/40 text-green-400 flex items-center justify-center text-sm font-bold">2</span>
            <h3 className="text-lg font-semibold">配置音色 Mapping</h3>
          </div>
          <div className="ml-11 space-y-4">
            <p className="text-sm text-zinc-400 leading-relaxed">
              Tone Mapping 就是一张"PC 编号 → 预设名称"的对照表。例如 PC#0 = Clean、PC#1 = Crunch、PC#2 = Lead。
              ToneMaster 在时间轴上触发时，就是发送对应的 PC 编号让插件切换到目标预设。
            </p>

            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 space-y-3">
              <h4 className="text-sm font-medium text-white">操作步骤：</h4>
              <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
                <li>进入 Settings 页面</li>
                <li>选择你的 Neural DSP 插件（如 Archetype Gojira、Petrucci 等）</li>
                <li>选择并排列你需要的预设（拖拽调整顺序）</li>
                <li>点击 <strong className="text-white">Auto Map</strong> — 自动生成 PC 编号映射</li>
                <li>点击 <strong className="text-white">Install</strong> — 将 XML mapping 文件安装到系统</li>
              </ol>
            </div>

            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <h4 className="text-sm font-medium text-white mb-2">验证：测试音色切换</h4>
              <p className="text-sm text-zinc-400">
                安装完成后，在 Settings 页面点击任一预设旁的 <strong className="text-white">Test</strong> 按钮，
                如果 Neural DSP 成功切换预设，说明 MIDI 链路通了！
              </p>
            </div>
          </div>
        </section>

        {/* Step 3: 开始一个 Project */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-green-900/40 text-green-400 flex items-center justify-center text-sm font-bold">3</span>
            <h3 className="text-lg font-semibold">开始一个 Project</h3>
          </div>
          <div className="ml-11 space-y-4">
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 space-y-3">
              <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
                <li>在主页点击 <strong className="text-white">+</strong> 创建新项目（或打开已有项目）</li>
                <li>上传你要练的歌曲音频（支持 mp3、wav、flac、ogg、m4a）</li>
                <li>选择对应的 Tone Mapping 文件（步骤 2 中创建的）</li>
                <li>在波形时间轴上点击 <strong className="text-white">+</strong> 添加 Tone Trigger，选择目标音色</li>
                <li>拖拽调整触发点位置，使其对齐乐曲中的音色切换时刻</li>
              </ol>
            </div>

            <div className="bg-zinc-900/60 rounded-xl p-4 border border-zinc-700/50">
              <p className="text-sm text-zinc-400">
                <strong className="text-green-400">💡 Tip：</strong>使用 A-B Loop 功能反复练习某段落——
                在 Transport 栏点击循环按钮后，进度条会高亮循环区间，播放到 B 点自动跳回 A 点。
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">常见问题</h3>
          <div className="space-y-3">
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <h4 className="text-sm font-medium text-white mb-1">Q: Neural DSP 没有响应 MIDI 信号？</h4>
              <p className="text-sm text-zinc-400">
                确认：① 插件设置中已开启 MIDI Program Change；② 插件的 MIDI 输入端口与 ToneMaster 的输出端口一致
                （都选 "ToneMaster" 或 "IAC Driver"）；③ macOS 用户确认 IAC Driver 已上线。
              </p>
            </div>
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <h4 className="text-sm font-medium text-white mb-1">Q: 支持哪些插件？</h4>
              <p className="text-sm text-zinc-400">
                目前重点支持 Neural DSP 全系列（Archetype、Quad Cortex 模拟等）。
                理论上任何接受 MIDI Program Change 的插件/硬件都可以使用，但预设扫描功能仅针对 Neural DSP。
              </p>
            </div>
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <h4 className="text-sm font-medium text-white mb-1">Q: 音频播放是在哪里处理的？</h4>
              <p className="text-sm text-zinc-400">
                音频通过后端 Python 处理，不经过浏览器 Web Audio API。
                这样可以获得更低的延迟和更稳定的时钟同步。
              </p>
            </div>
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <h4 className="text-sm font-medium text-white mb-1">Q: 支持什么音频格式？</h4>
              <p className="text-sm text-zinc-400">
                支持 mp3、wav、flac、ogg、m4a。上传后后端会自动解码为 PCM 用于播放和波形生成。
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center pt-4 pb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-medium transition-colors"
          >
            开始使用 ToneMaster
          </Link>
        </div>
      </main>
    </div>
  )
}
