import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('electron', () => ({
  app: { isPackaged: false },
  powerMonitor: { on: vi.fn(), removeListener: vi.fn() }
}))

import { Scheduler } from './scheduler'

describe('Scheduler retry', () => {
  let scheduler: Scheduler
  let now: Date

  beforeEach(() => {
    vi.useFakeTimers()
    now = new Date('2026-04-24T10:30:00')
    vi.setSystemTime(now)
    scheduler = new Scheduler()
  })

  afterEach(() => {
    scheduler.stop()
    vi.useRealTimers()
  })

  async function flush() {
    await vi.advanceTimersByTimeAsync(0)
    await Promise.resolve()
    await Promise.resolve()
  }

  it('runs callback when scheduled time arrives', async () => {
    const cb = vi.fn().mockResolvedValue(undefined)
    vi.setSystemTime(new Date('2026-04-24T10:29:00'))
    scheduler.start(10, 30, cb)
    expect(cb).not.toHaveBeenCalled()

    vi.setSystemTime(new Date('2026-04-24T10:30:00'))
    await vi.advanceTimersByTimeAsync(60_000)
    await flush()
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('does not re-run after success on the same day', async () => {
    const cb = vi.fn().mockResolvedValue(undefined)
    scheduler.start(10, 30, cb)
    await flush()
    expect(cb).toHaveBeenCalledTimes(1)

    vi.setSystemTime(new Date('2026-04-24T11:00:00'))
    await vi.advanceTimersByTimeAsync(60_000)
    await flush()
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('retries when callback rejects, until MAX_RETRIES', async () => {
    const cb = vi.fn().mockRejectedValue(new Error('boom'))
    scheduler.start(10, 30, cb)
    await flush()
    expect(cb).toHaveBeenCalledTimes(1)

    // next interval tick: retry #1
    await vi.advanceTimersByTimeAsync(60_000)
    await flush()
    expect(cb).toHaveBeenCalledTimes(2)

    // retry #2 (3rd total call = MAX_RETRIES)
    await vi.advanceTimersByTimeAsync(60_000)
    await flush()
    expect(cb).toHaveBeenCalledTimes(3)

    // after MAX_RETRIES, no more retries today
    await vi.advanceTimersByTimeAsync(60_000)
    await flush()
    expect(cb).toHaveBeenCalledTimes(3)

    await vi.advanceTimersByTimeAsync(60_000 * 10)
    await flush()
    expect(cb).toHaveBeenCalledTimes(3)
  })

  it('success after a failure also prevents further runs that day', async () => {
    const cb = vi.fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue(undefined)
    scheduler.start(10, 30, cb)
    await flush()
    expect(cb).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(60_000)
    await flush()
    expect(cb).toHaveBeenCalledTimes(2)

    // no more runs today
    await vi.advanceTimersByTimeAsync(60_000 * 10)
    await flush()
    expect(cb).toHaveBeenCalledTimes(2)
  })

  it('calls onFailureExhausted once when MAX_RETRIES reached', async () => {
    const cb = vi.fn().mockRejectedValue(new Error('boom'))
    const onExhausted = vi.fn()
    scheduler.onFailureExhausted = onExhausted

    scheduler.start(10, 30, cb)
    await flush()
    await vi.advanceTimersByTimeAsync(60_000)
    await flush()
    await vi.advanceTimersByTimeAsync(60_000)
    await flush()

    expect(cb).toHaveBeenCalledTimes(3)
    expect(onExhausted).toHaveBeenCalledTimes(1)
  })
})
