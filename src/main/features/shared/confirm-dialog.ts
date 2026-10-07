import { BrowserWindow, dialog, WebContents } from 'electron'

export interface ConfirmOptions {
  title: string
  message: string
  detail: string
  confirmLabel: string
}

/**
 * Native confirmation for destructive actions, shown by the main process so the
 * renderer cannot skip it. Cancel is the default and the Escape action, so an
 * accidental Enter never confirms.
 */
export async function confirmDestructive(
  sender: WebContents,
  { title, message, detail, confirmLabel }: ConfirmOptions
): Promise<boolean> {
  const options: Electron.MessageBoxOptions = {
    type: 'warning',
    buttons: ['Cancel', confirmLabel],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
    title,
    message,
    detail
  }
  const win = BrowserWindow.fromWebContents(sender)
  const { response } = win
    ? await dialog.showMessageBox(win, options)
    : await dialog.showMessageBox(options)
  return response === 1
}

/** "a.mp4, b.mp4 and 3 more" — keeps confirmation text readable for large batches. */
export function summarizePaths(names: string[], max = 5): string {
  if (names.length <= max) return names.join('\n')
  return `${names.slice(0, max).join('\n')}\n…and ${names.length - max} more`
}
