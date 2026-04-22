import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const rl = readline.createInterface({ input, output })

export async function ask(q, def) {
  const suffix = def !== undefined && def !== '' ? ` [${def}]` : ''
  const a = (await rl.question(`${q}${suffix}: `)).trim()
  return a || def || ''
}

export async function askChoice(q, choices, def) {
  const list = choices.map((c, i) => `  ${i + 1}) ${c}`).join('\n')
  const defIdx = def !== undefined ? choices.indexOf(def) + 1 : 0
  while (true) {
    const a = (await rl.question(`${q}\n${list}\n  選択${defIdx ? ` [${defIdx}]` : ''}: `)).trim()
    if (!a && defIdx) return choices[defIdx - 1]
    const n = parseInt(a, 10)
    if (n >= 1 && n <= choices.length) return choices[n - 1]
    console.log('  無効な選択です。再入力してください。')
  }
}

export async function askBool(q, def = true) {
  const defStr = def ? 'Y/n' : 'y/N'
  const a = (await rl.question(`${q} [${defStr}]: `)).trim().toLowerCase()
  if (!a) return def
  return a === 'y' || a === 'yes'
}

export function close() {
  rl.close()
}
