#!/usr/bin/env node
/**
 * 移动频道后隐藏的回归测试（issue #42）
 *
 * 不变量：隐藏 key 必须用频道「真实原始分组」(originalGroup)，即 `${originalGroup}::${id}`，
 * 与服务端 applyConfig 的隐藏判定一致。移动过的频道其显示分组 ≠ 原始分组，
 * 若按显示分组算 key（旧 bug），隐藏对它不生效。
 *
 * 运行： node scripts/test-move-hide.mjs   （或 npm test）
 */
import assert from 'node:assert/strict'
import { applyConfig } from '../utils/playlistConfig.js'

for (const k of ['log', 'info', 'warn']) {
  const orig = console[k]
  console[k] = (...a) => { if (a.some(x => typeof x === 'string' && /应用播放列表配置|配置应用完成/.test(x))) return; orig.apply(console, a) }
}

const groups = () => ([
  { name: 'A', channels: [{ id: 'x1', name: 'X' }] },
  { name: 'C', channels: [{ id: 'y1', name: 'Y' }] },
])
const base = () => ({ channelGroupMap: {}, channelRenameMap: {}, channelOrder: {}, hiddenChannels: [],
  customGroups: [{ name: 'B' }], groupOrder: [], deletedGroups: [], groupRenameMap: {}, groupSortMode: {} })
const shows = (cfg, name) => applyConfig(groups(), cfg).some(g => g.channels.some(c => c.name === name))

let passed = 0
const check = (name, fn) => { fn(); passed++; console.log(`  ✅ ${name}`) }

console.log('移动后隐藏回归测试 (issue #42)')

check('移动 A→B 后，X 显示在 B', () => {
  const cfg = base(); cfg.channelGroupMap = { 'A::x1': 'B' }
  assert.equal(shows(cfg, 'X'), true)
})

check('用「原始分组」key (A::x1) 隐藏 → 生效（X 不再显示）', () => {
  const cfg = base(); cfg.channelGroupMap = { 'A::x1': 'B' }; cfg.hiddenChannels = ['A::x1']
  assert.equal(shows(cfg, 'X'), false)
})

check('用「显示分组」key (B::x1) 隐藏 → 不生效（复现旧 bug，前端不可这样算）', () => {
  const cfg = base(); cfg.channelGroupMap = { 'A::x1': 'B' }; cfg.hiddenChannels = ['B::x1']
  assert.equal(shows(cfg, 'X'), true)
})

check('原分组 A 被搬空后，仍能用 A::x1 正确隐藏 X', () => {
  // A 只有 x1，移走后 A 在显示层为空；隐藏仍按原始分组 A 算 key
  const cfg = base(); cfg.channelGroupMap = { 'A::x1': 'B' }; cfg.hiddenChannels = ['A::x1']
  assert.equal(shows(cfg, 'X'), false)
})

console.log(`\n全部通过：${passed}/4 ✅`)
