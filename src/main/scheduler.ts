import { app, powerMonitor } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execFile } from 'child_process'

const AGENT_LABEL = 'com.pringsearch.wake'
const PLIST_PATH = path.join(os.homedir(), 'Library', 'LaunchAgents', `${AGENT_LABEL}.plist`)

export class Scheduler {
  private interval: ReturnType<typeof setInterval> | null = null
  private hour = 0
  private minute = 0
  private callback: (() => void) | null = null
  private lastRunDate: string | null = null
  private running = false

  start(hour: number, minute: number, callback: () => void, openAtLogin = false): void {
    this.stop()
    this.hour = hour
    this.minute = minute
    this.callback = callback

    // 1분마다 체크 — sleep에서 깨어나면 밀린 스케줄 즉시 실행
    this.interval = setInterval(() => this.check(), 60_000)

    // Mac이 잠자기에서 깨어났을 때 즉시 체크
    powerMonitor.on('resume', this.onResume)

    // macOS LaunchAgent — 사용자가 자동 시작을 켰을 때만
    if (app.isPackaged) {
      if (openAtLogin) {
        this.installLaunchAgent()
      } else {
        this.uninstallLaunchAgent()
      }
    }

    // 시작 시 즉시 한 번 체크
    this.check()
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    powerMonitor.removeListener('resume', this.onResume)
  }

  reschedule(hour: number, minute: number, callback: () => void, openAtLogin = false): void {
    this.start(hour, minute, callback, openAtLogin)
  }

  private onResume = (): void => {
    // resume 직후 시계가 아직 동기화 안 됐을 수 있으므로 약간 지연
    setTimeout(() => this.check(), 3_000)
  }

  private todayKey(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }

  private check(): void {
    if (!this.callback || this.running) return

    const now = new Date()
    const today = this.todayKey()

    // 오늘 이미 실행했으면 스킵
    if (this.lastRunDate === today) return

    // 아직 스케줄 시간이 안 됐으면 스킵
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const scheduledMinutes = this.hour * 60 + this.minute
    if (currentMinutes < scheduledMinutes) return

    // 실행 (async callback 대응)
    this.running = true
    this.lastRunDate = today
    Promise.resolve(this.callback()).finally(() => {
      this.running = false
    })
  }

  private installLaunchAgent(): void {
    // 스케줄 시간 1분 전에 Mac을 깨워서 앱을 열어줌
    const wakeMinute = this.minute === 0 ? 59 : this.minute - 1
    const wakeHour = this.minute === 0 ? (this.hour === 0 ? 23 : this.hour - 1) : this.hour

    const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${AGENT_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>open</string>
    <string>-a</string>
    <string>Pringsearch</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>${wakeHour}</integer>
    <key>Minute</key>
    <integer>${wakeMinute}</integer>
  </dict>
</dict>
</plist>
`

    try {
      // 기존 agent 언로드
      execFile('launchctl', ['unload', PLIST_PATH], () => {
        fs.writeFileSync(PLIST_PATH, plist, 'utf-8')
        execFile('launchctl', ['load', PLIST_PATH])
      })
    } catch {
      // 무시
    }
  }

  private uninstallLaunchAgent(): void {
    try {
      execFile('launchctl', ['unload', PLIST_PATH], () => {
        if (fs.existsSync(PLIST_PATH)) {
          fs.unlinkSync(PLIST_PATH)
        }
      })
    } catch {
      // 무시
    }
  }
}
