import { db } from '../../db';
import { scheduledJobs } from '../../db/schema';
import { eq, and, lte } from 'drizzle-orm';
import { workflowEngine } from './workflow-engine';

export class SchedulerService {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  start() {
    if (this.timer) return;
    
    // Check every minute
    this.timer = setInterval(() => {
      this.tick();
    }, 60 * 1000);
    
    // Initial check on startup (delayed slightly to let app settle)
    setTimeout(() => this.tick(), 5000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const now = Date.now();
      
      // Find jobs where nextRunAt <= now and status is idle
      const jobsToRun = db.select()
        .from(scheduledJobs)
        .where(
          and(
            lte(scheduledJobs.nextRunAt, now),
            eq(scheduledJobs.status, 'idle')
          )
        ).all();

      for (const job of jobsToRun) {
        // Mark as running
        db.update(scheduledJobs)
          .set({ status: 'running', lastRunAt: now })
          .where(eq(scheduledJobs.id, job.id))
          .run();

        // Execute
        await workflowEngine.execute(job.workflowId);

        // Compute next run time (simplistic 24 hours for now, 
        // to be replaced by full cron parsing in the future)
        const nextRun = now + (24 * 60 * 60 * 1000);

        db.update(scheduledJobs)
          .set({ status: 'idle', nextRunAt: nextRun })
          .where(eq(scheduledJobs.id, job.id))
          .run();
      }
    } catch (error) {
      console.error('Scheduler error:', error);
    } finally {
      this.isRunning = false;
    }
  }
}

export const schedulerService = new SchedulerService();
