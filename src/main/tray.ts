import { Tray, Menu, nativeImage, BrowserWindow } from 'electron'

export class TrayManager {
  private tray: Tray | null = null

  create(window: BrowserWindow, onRunNow: () => void): void {
    // macOS menu bar Template icon (monochrome, 16x16 @1x)
    // Search/magnifying glass icon
    const icon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAHRSURBVFiF7ZY9TsMwGIafJC1qYWBgYGJgQEJC4gJwAo7ABTgCR+AIHIEjcASOAN0QE2JgYEAsDAyFAaRSQm0v5qsqx05sgdRKfaXI8ff5fb74J3G1s7sbW6wpSKULwPvnPtZCJnRHB9FBdJDqIJJApO//zUSi1xGCMrR6u+lOl4fXV7cA9bNL/88mLJ97Hwfw3Pzm4S2W8/b0KHlf34i6aHsb0zBdv6R+fu4P8L52gOfHeyNE9OVJiMiA4JlJJBwAgjNzGHBcwFcVBDhxARUQYJ4VEOCMAHxD1LsAsQDxZz8zVkCAgSjDehYQYJoVEKCfFRBgiBUQoIcVEKCHBHALoE0wlwK+tHIEf4kVEICJAJeBXwLQ4gFi7BIBHgv4EsAMkK8B3gLMAgL0BPwC8BsgX9G74AEi7RIEY+0SAWLtEgFi7RIBYu0SAWLtEgG0BFhlVwuA24B8JZEMCCYDoQ7gJcA3gJeAvwLUBxiqBrwESLVLEKTaJQhS7RIEqXYJglS7BEGqXYIg1S5BkGqXIEi1SxCk2iUIUu0SBKl2CYJUuwRBql2CINUuQZBqlyBItUsQpNolCFLtEgQJdgkCLVFI86+L4x4hAJz/AIKNLfyX9d8uAAAAAElFTkSuQmCC'
    )
    icon.setTemplateImage(true)

    this.tray = new Tray(icon.resize({ width: 16, height: 16 }))

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show Widget', click: () => window.show() },
      { label: 'Run Research Now', click: onRunNow },
      { type: 'separator' },
      { label: 'Quit', click: () => { window.destroy(); process.exit(0) } }
    ])

    this.tray.setToolTip('PRINGSEARCH')
    this.tray.setContextMenu(contextMenu)
    this.tray.on('click', () => {
      window.isVisible() ? window.hide() : window.show()
    })
  }
}
