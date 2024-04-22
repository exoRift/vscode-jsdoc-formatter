import * as vscode from 'vscode'

const extensionRegex = /\.(?:js|mjs|cjs|ts|mts|cts|jsx|tsx)$/
const commentRegex = /\/\*\* *\r?\n(.+?)\r?\n? *\*\//gs
const directiveRegex = /^ *\* *@/

export function activate (context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand('jsdoc-formatter.format', async () => {
    const editor = vscode.window.activeTextEditor
    if (editor?.document.fileName.match(extensionRegex)) {
      const text = editor.document.getText()

      const replaced = text.replace(commentRegex, (match) => {
        const lines = match.split(/\r?\n/)

        const largestSizes = new Map<number, number>()

        for (const line of lines) {
          if (!line.match(directiveRegex)) continue
          const sections = line.split(/ +/)

          for (let s = 0; s < sections.length; ++s) {
            if (s >= 5) break // Comment

            if (!largestSizes.has(s) || sections[s].length > largestSizes.get(s)!) largestSizes.set(s, sections[s].length)
          }
        }

        const newLines: string[] = []

        for (const line of lines) {
          if (!line.match(directiveRegex)) {
            newLines.push(line)
            continue
          }
          const sections = line.split(/ +/)

          let encounteredReturnDirective = false
          let encounteredType = false
          for (let s = 0; s < sections.length; ++s) {
            encounteredReturnDirective ||= Boolean(sections[s].match(/@returns?/))
            encounteredType ||= Boolean(sections[s].match(/{.+?}/))
            const nextIsType = sections[s + 1]?.match(/{.+?}/)

            if (s >= (encounteredType ? 5 : 4)) break // Comment

            sections[s] += ' '.repeat((encounteredReturnDirective && !nextIsType ? largestSizes.get(s + 1)! + largestSizes.get(s)! + 1 : largestSizes.get(s)!) - sections[s].length)
          }

          newLines.push(sections.join(' '))
        }

        return newLines.join('\n')
      })

      const success = await editor.edit((builder) => {
        builder.replace(new vscode.Range(editor.document.lineAt(0).range.start, editor.document.lineAt(editor.document.lineCount - 1).range.end), replaced)
      })

      if (success) void vscode.window.showInformationMessage('Formatted JSDoc comments in the current file')
      else void vscode.window.showErrorMessage('Something went wrong!')

    } else void vscode.window.showWarningMessage('Active file is not a JS file')
  })

  context.subscriptions.push(disposable)
}
