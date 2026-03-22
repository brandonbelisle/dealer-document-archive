// scheduler/dmsScheduler.js
// Background scheduler for DMS tasks
const db = require('../config/db');

let schedulerInterval = null;
const runningTasks = new Set();

async function runSchedule(schedule) {
  if (runningTasks.has(schedule.id)) {
    return;
  }
  
  runningTasks.add(schedule.id);
  console.log(`[Scheduler] Running scheduled task: ${schedule.name}`);
  
  try {
    const { runDmsTask } = require('./dmsRunner');
    const result = await runDmsTask(schedule.task_type, schedule.query_config);
    
    await db.execute(
      'UPDATE dms_schedules SET last_run_at = NOW(), last_run_status = ?, last_run_message = ?, last_run_count = ? WHERE id = ?',
      [result.success ? 'success' : 'failed', result.message.substring(0, 500), result.count, schedule.id]
    );
    
    console.log(`[Scheduler] Task "${schedule.name}" completed: ${result.message}`);
  } catch (err) {
    console.error(`[Scheduler] Task "${schedule.name}" failed:`, err.message);
    try {
      await db.execute(
        'UPDATE dms_schedules SET last_run_at = NOW(), last_run_status = ?, last_run_message = ? WHERE id = ?',
        ['failed', err.message.substring(0, 500), schedule.id]
      );
    } catch (dbErr) {
      console.error('[Scheduler] Failed to update schedule status:', dbErr.message);
    }
  } finally {
    runningTasks.delete(schedule.id);
  }
}

async function checkAndRunSchedules() {
  try {
    const [schedules] = await db.execute(
      'SELECT id, name, task_type, query_config, enabled, interval_minutes, last_run_at FROM dms_schedules WHERE enabled = 1 AND interval_minutes > 0'
    );
    
    const now = new Date();
    
    for (const schedule of schedules) {
      const lastRun = schedule.last_run_at ? new Date(schedule.last_run_at) : null;
      const intervalMs = (schedule.interval_minutes || 0) * 60 * 1000;
      
      if (!lastRun || (now - lastRun) >= intervalMs) {
        await runSchedule(schedule);
      }
    }
  } catch (err) {
    console.error('[Scheduler] Error checking schedules:', err.message);
  }
}

function startScheduler(intervalSeconds = 60) {
  if (schedulerInterval) {
    console.log('[Scheduler] Already running');
    return;
  }
  
  console.log(`[Scheduler] Starting with ${intervalSeconds}s check interval`);
  
  // Run immediately on start
  setTimeout(checkAndRunSchedules, 5000);
  
  // Then run periodically
  schedulerInterval = setInterval(checkAndRunSchedules, intervalSeconds * 1000);
}

function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Scheduler] Stopped');
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  runSchedule,
};