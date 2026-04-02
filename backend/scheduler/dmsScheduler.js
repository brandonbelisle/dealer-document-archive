// scheduler/dmsScheduler.js
// Background scheduler for DMS tasks
const db = require('../config/db');

let schedulerInterval = null;
const runningTasks = new Set();

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function getServerTime() {
  return new Date();
}

function isScheduledDayTime(schedule, now) {
  if (!schedule.schedule_day || !schedule.schedule_time) {
    return { isTime: false, reason: 'not_scheduled' };
  }

  const currentDay = DAY_NAMES[now.getDay()];
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const scheduleDay = schedule.schedule_day.toLowerCase();
  const scheduleTime = schedule.schedule_time;

  if (currentDay !== scheduleDay) {
    return { isTime: false, reason: 'wrong_day', currentDay, scheduleDay };
  }

  if (currentTimeStr !== scheduleTime) {
    return { isTime: false, reason: 'wrong_time', currentTime: currentTimeStr, scheduleTime };
  }

  return { isTime: true, reason: 'matched' };
}

async function runSchedule(schedule) {
  if (runningTasks.has(schedule.id)) {
    console.log(`[Scheduler] Task "${schedule.name}" (ID: ${schedule.id}) is already running, skipping`);
    return;
  }
  
  runningTasks.add(schedule.id);
  console.log(`[Scheduler] Starting scheduled task: "${schedule.name}" (ID: ${schedule.id}, type: ${schedule.task_type})`);
  
  try {
    const { runDmsTask } = require('./dmsRunner');
    const result = await runDmsTask(schedule.task_type, schedule.query_config);
    
    await db.execute(
      'UPDATE dms_schedules SET last_run_at = NOW(), last_run_status = ?, last_run_message = ?, last_run_count = ? WHERE id = ?',
      [result.success ? 'success' : 'failed', result.message.substring(0, 500), result.count, schedule.id]
    );
    
    console.log(`[Scheduler] Task "${schedule.name}" completed successfully: ${result.message} (${result.count || 0} records)`);
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
    const now = getServerTime();
    const currentDay = DAY_NAMES[now.getDay()];
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    console.log(`[Scheduler] Checking schedules at ${now.toISOString()} (server time: ${currentDay} ${currentTimeStr})`);
    
    // Get interval-based schedules
    const [intervalSchedules] = await db.execute(
      'SELECT id, name, task_type, query_config, enabled, interval_minutes, schedule_day, schedule_time, last_run_at FROM dms_schedules WHERE enabled = 1 AND interval_minutes > 0 AND (schedule_day IS NULL OR schedule_day = "")'
    );
    
    // Get day/time-based schedules
    const [dayTimeSchedules] = await db.execute(
      'SELECT id, name, task_type, query_config, enabled, interval_minutes, schedule_day, schedule_time, last_run_at FROM dms_schedules WHERE enabled = 1 AND schedule_day IS NOT NULL AND schedule_day != "" AND schedule_time IS NOT NULL AND schedule_time != ""'
    );
    
    console.log(`[Scheduler] Found ${intervalSchedules.length} interval-based task(s), ${dayTimeSchedules.length} day/time-based task(s)`);
    
    // Process interval-based schedules
    for (const schedule of intervalSchedules) {
      const lastRun = schedule.last_run_at ? new Date(schedule.last_run_at) : null;
      const intervalMs = (schedule.interval_minutes || 0) * 60 * 1000;
      const timeSinceLastRun = lastRun ? Math.floor((now - lastRun) / 1000 / 60) : null;
      
      console.log(`[Scheduler] Interval task "${schedule.name}" (ID: ${schedule.id}): interval=${schedule.interval_minutes}min, lastRun=${lastRun ? lastRun.toISOString() : 'never'}, timeSinceLast=${timeSinceLastRun !== null ? timeSinceLastRun + 'min' : 'N/A'}`);
      
      if (!lastRun || (now - lastRun) >= intervalMs) {
        console.log(`[Scheduler] Interval task "${schedule.name}" is due to run`);
        await runSchedule(schedule);
      } else {
        constnextRunMinutes = Math.ceil((intervalMs - (now - lastRun)) / 1000 / 60);
        console.log(`[Scheduler] Interval task "${schedule.name}" will run in ~${nextRunMinutes} minutes`);
      }
    }
    
    // Process day/time-based schedules
    for (const schedule of dayTimeSchedules) {
      const lastRun = schedule.last_run_at ? new Date(schedule.last_run_at) : null;
      const timeSinceLastRun = lastRun ? Math.floor((now - lastRun) / 1000 / 60) : null;
      
      console.log(`[Scheduler] Day/Time task "${schedule.name}" (ID: ${schedule.id}): scheduled=${schedule.schedule_day} ${schedule.schedule_time}, lastRun=${lastRun ? lastRun.toISOString() : 'never'}`);
      
      const checkResult = isScheduledDayTime(schedule, now);
      
      if (checkResult.isTime) {
        // Check if already ran today
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const ranToday = lastRun && lastRun >= todayStart;
        
        if (ranToday) {
          console.log(`[Scheduler] Day/Time task "${schedule.name}" already ran today, skipping`);
        } else {
          console.log(`[Scheduler] Day/Time task "${schedule.name}" is due to run (matched ${schedule.schedule_day} ${schedule.schedule_time})`);
          await runSchedule(schedule);
        }
      } else if (checkResult.reason === 'wrong_day') {
        console.log(`[Scheduler] Day/Time task "${schedule.name}" waiting for ${schedule.schedule_day} (today is ${checkResult.currentDay})`);
      } else if (checkResult.reason === 'wrong_time') {
        console.log(`[Scheduler] Day/Time task "${schedule.name}" waiting for ${schedule.schedule_time} (current time is ${checkResult.currentTime})`);
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
  
  console.log(`[Scheduler] Starting scheduler with ${intervalSeconds}s check interval`);
  
  // Log all schedules in database on start
  db.execute('SELECT id, name, task_type, enabled, interval_minutes, schedule_day, schedule_time FROM dms_schedules ORDER BY id')
    .then(([rows]) => {
      console.log(`[Scheduler] Database has ${rows.length} total scheduled task(s):`);
      rows.forEach(row => {
        if (row.schedule_day && row.schedule_time) {
          console.log(`[Scheduler]   - ID ${row.id}: "${row.name}" (type: ${row.task_type}, enabled: ${row.enabled ? 'yes' : 'no'}, scheduled: ${row.schedule_day} ${row.schedule_time})`);
        } else {
          console.log(`[Scheduler]   - ID ${row.id}: "${row.name}" (type: ${row.task_type}, enabled: ${row.enabled ? 'yes' : 'no'}, interval: ${row.interval_minutes || 0}min)`);
        }
      });
    })
    .catch(err => console.error('[Scheduler] Failed to load schedules on start:', err.message));
  
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