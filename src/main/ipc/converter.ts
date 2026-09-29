import { ipcMain } from 'electron'
import { getConversionPreset, listConversionPresets } from '../domain/converter/presets'
import type { ConverterQueue } from '../domain/converter/converter-queue'

export function registerConverterHandlers(): void {
  ipcMain.handle('converter:listPresets', () => ({ ok: true, data: listConversionPresets() }))

  let converterQueueInstance: ConverterQueue | null = null

  // The renderer names a preset by id; unknown ids are rejected, so FFmpeg only
  // ever receives the main process's own allow-listed arguments.
  ipcMain.handle(
    'converter:enqueueConversion',
    async (event, paths: string[], presetId: string) => {
      try {
        const preset = getConversionPreset(presetId)
        if (!preset) {
          return {
            ok: false,
            error: { code: 'UNKNOWN_PRESET', message: `Unknown preset: ${presetId}` }
          }
        }
        if (!Array.isArray(paths) || paths.some((p) => typeof p !== 'string')) {
          return {
            ok: false,
            error: { code: 'INVALID_INPUT', message: 'Expected a list of file paths' }
          }
        }
        if (!converterQueueInstance) {
          const { ConverterQueue } = await import('../domain/converter/converter-queue')
          converterQueueInstance = new ConverterQueue()
        }

        const jobId = converterQueueInstance.enqueue(
          paths,
          preset,
          (id: string, filePath: string, progress: number) => {
            event.sender.send('converter:progress', { jobId: id, file: filePath, progress })
          },
          (batchId: string) => {
            console.log(`[Converter] Batch ${batchId} complete.`)
          }
        )
        return { ok: true, data: { jobId } }
      } catch (err) {
        return { ok: false, error: { code: 'ENQUEUE_ERROR', message: (err as Error).message } }
      }
    }
  )

  ipcMain.handle('converter:cancelConversion', async (_, jobId: string) => {
    try {
      if (converterQueueInstance) {
        converterQueueInstance.cancelJob(jobId)
      }
      return { ok: true, data: undefined }
    } catch (err) {
      return { ok: false, error: { code: 'CANCEL_ERROR', message: (err as Error).message } }
    }
  })
}
