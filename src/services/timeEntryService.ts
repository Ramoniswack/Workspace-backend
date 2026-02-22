const TimeEntry = require("../models/TimeEntry");
const Task = require("../models/Task");
const Workspace = require("../models/Workspace");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");
const { emitTaskEvent, emitWorkspaceEvent } = require("../socket/events");

interface StartTimerData {
  taskId: string;
  userId: string;
  description?: string;
}

interface StopTimerData {
  entryId: string;
  userId: string;
}

interface AddManualTimeData {
  taskId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  description?: string;
}

class TimeEntryService {
  /**
   * Start a timer for a task
   */
  async startTimer(data: StartTimerData) {
    const { taskId, userId, description } = data;

    // Verify task exists
    const task = await Task.findOne({
      _id: taskId,
      isDeleted: false
    });

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    // Verify user is workspace member
    const workspace = await Workspace.findOne({
      _id: task.workspace,
      isDeleted: false
    });

    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

    const isMember = workspace.members.some(
      (member: any) => member.user.toString() === userId
    );

    if (!isMember) {
      throw new AppError("You must be a workspace member to track time", 403);
    }

    // Check if user already has a running timer
    const runningTimer = await TimeEntry.findOne({
      user: userId,
      isRunning: true,
      isDeleted: false
    });

    if (runningTimer) {
      throw new AppError(
        "You already have a running timer. Please stop it before starting a new one.",
        400
      );
    }

    // Create time entry
    const timeEntry = await TimeEntry.create({
      task: taskId,
      user: userId,
      workspace: task.workspace,
      project: task.space,
      startTime: new Date(),
      description,
      isRunning: true
    });

    // Populate for response
    await timeEntry.populate([
      { path: "task", select: "title status" },
      { path: "user", select: "name email" }
    ]);

    // Log activity
    try {
      await logger.logActivity({
        userId,
        workspaceId: task.workspace.toString(),
        action: "CREATE",
        resourceType: "TimeEntry",
        resourceId: timeEntry._id.toString(),
        metadata: {
          taskId,
          taskTitle: task.title,
          action: "timer_started"
        }
      });
    } catch (error) {
      // Silent fail - activity logging is non-critical
    }

    // Emit real-time event
    try {
      emitTaskEvent(
        taskId,
        "timer_started",
        {
          timeEntry: {
            _id: timeEntry._id,
            user: timeEntry.user,
            startTime: timeEntry.startTime
          }
        },
        userId
      );
    } catch (error) {
      // Silent fail - real-time events are non-critical
    }

    return timeEntry;
  }

  /**
   * Stop a running timer
   */
  async stopTimer(data: StopTimerData) {
    const { entryId, userId } = data;

    const timeEntry = await TimeEntry.findOne({
      _id: entryId,
      isDeleted: false
    });

    if (!timeEntry) {
      throw new AppError("Time entry not found", 404);
    }

    // Verify ownership
    if (timeEntry.user.toString() !== userId) {
      throw new AppError("You can only stop your own timers", 403);
    }

    // Verify timer is running
    if (!timeEntry.isRunning) {
      throw new AppError("This timer is not running", 400);
    }

    // Stop timer
    timeEntry.endTime = new Date();
    timeEntry.isRunning = false;
    
    // Duration will be calculated by pre-save hook
    await timeEntry.save();

    // Populate for response
    await timeEntry.populate([
      { path: "task", select: "title status" },
      { path: "user", select: "name email" }
    ]);

    // Log activity
    try {
      await logger.logActivity({
        userId,
        workspaceId: timeEntry.workspace.toString(),
        action: "UPDATE",
        resourceType: "TimeEntry",
        resourceId: timeEntry._id.toString(),
        metadata: {
          taskId: timeEntry.task.toString(),
          action: "timer_stopped",
          duration: timeEntry.duration
        }
      });
    } catch (error) {
      // Silent fail - activity logging is non-critical
    }

    // Emit real-time event
    try {
      emitTaskEvent(
        timeEntry.task.toString(),
        "timer_stopped",
        {
          timeEntry: {
            _id: timeEntry._id,
            user: timeEntry.user,
            startTime: timeEntry.startTime,
            endTime: timeEntry.endTime,
            duration: timeEntry.duration
          }
        },
        userId
      );
    } catch (error) {
      // Silent fail - real-time events are non-critical
    }

    return timeEntry;
  }

  /**
   * Add manual time entry
   */
  async addManualTime(data: AddManualTimeData) {
    const { taskId, userId, startTime, endTime, description } = data;

    // Verify task exists
    const task = await Task.findOne({
      _id: taskId,
      isDeleted: false
    });

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    // Verify user is workspace member
    const workspace = await Workspace.findOne({
      _id: task.workspace,
      isDeleted: false
    });

    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

    const isMember = workspace.members.some(
      (member: any) => member.user.toString() === userId
    );

    if (!isMember) {
      throw new AppError("You must be a workspace member to track time", 403);
    }

    // Validate dates
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime())) {
      throw new AppError("Invalid start time", 400);
    }

    if (isNaN(end.getTime())) {
      throw new AppError("Invalid end time", 400);
    }

    if (end <= start) {
      throw new AppError("End time must be after start time", 400);
    }

    // Calculate duration
    const durationMs = end.getTime() - start.getTime();
    const duration = Math.floor(durationMs / 1000);

    // Create time entry
    const timeEntry = await TimeEntry.create({
      task: taskId,
      user: userId,
      workspace: task.workspace,
      project: task.space,
      startTime: start,
      endTime: end,
      duration,
      description,
      isRunning: false
    });

    // Populate for response
    await timeEntry.populate([
      { path: "task", select: "title status" },
      { path: "user", select: "name email" }
    ]);

    // Log activity
    try {
      await logger.logActivity({
        userId,
        workspaceId: task.workspace.toString(),
        action: "CREATE",
        resourceType: "TimeEntry",
        resourceId: timeEntry._id.toString(),
        metadata: {
          taskId,
          taskTitle: task.title,
          action: "manual_entry_added",
          duration
        }
      });
    } catch (error) {
      // Silent fail - activity logging is non-critical
    }

    // Emit real-time event
    try {
      emitTaskEvent(
        taskId,
        "time_entry_added",
        {
          timeEntry: {
            _id: timeEntry._id,
            user: timeEntry.user,
            startTime: timeEntry.startTime,
            endTime: timeEntry.endTime,
            duration: timeEntry.duration
          }
        },
        userId
      );
    } catch (error) {
      // Silent fail - real-time events are non-critical
    }

    return timeEntry;
  }

  /**
   * Get time summary for a task
   */
  async getTaskTimeSummary(taskId: string, userId: string) {
    // Verify task exists and user has access
    const task = await Task.findOne({
      _id: taskId,
      isDeleted: false
    });

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    // Verify user is workspace member
    const workspace = await Workspace.findOne({
      _id: task.workspace,
      isDeleted: false
    });

    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

    const isMember = workspace.members.some(
      (member: any) => member.user.toString() === userId
    );

    if (!isMember) {
      throw new AppError("You do not have access to this task", 403);
    }

    // Get all time entries for task
    const timeEntries = await TimeEntry.find({
      task: taskId,
      isDeleted: false
    })
      .populate("user", "name email")
      .sort("-startTime")
      .lean();

    // Calculate total duration
    let totalDuration = 0;
    let runningEntry = null;

    for (const entry of timeEntries) {
      if (entry.isRunning) {
        runningEntry = entry;
        // Calculate current duration for running timer
        const currentDuration = Math.floor(
          (Date.now() - new Date(entry.startTime).getTime()) / 1000
        );
        totalDuration += currentDuration;
      } else {
        totalDuration += entry.duration || 0;
      }
    }

    return {
      task: {
        _id: task._id,
        title: task.title
      },
      totalDuration, // in seconds
      totalDurationFormatted: this.formatDuration(totalDuration),
      entryCount: timeEntries.length,
      runningEntry,
      entries: timeEntries
    };
  }

  /**
   * Get time summary for a project
   */
  async getProjectTimeSummary(projectId: string, userId: string) {
    // Verify project exists
    const project = await require("../models/Space").findOne({
      _id: projectId,
      isDeleted: false
    });

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    // Verify user is workspace member
    const workspace = await Workspace.findOne({
      _id: project.workspace,
      isDeleted: false
    });

    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

    const isMember = workspace.members.some(
      (member: any) => member.user.toString() === userId
    );

    if (!isMember) {
      throw new AppError("You do not have access to this project", 403);
    }

    // Aggregate time entries by task
    const summary = await TimeEntry.aggregate([
      {
        $match: {
          project: project._id,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: "$task",
          totalDuration: { $sum: "$duration" },
          entryCount: { $sum: 1 },
          users: { $addToSet: "$user" }
        }
      },
      {
        $lookup: {
          from: "tasks",
          localField: "_id",
          foreignField: "_id",
          as: "taskInfo"
        }
      },
      {
        $unwind: "$taskInfo"
      },
      {
        $project: {
          task: {
            _id: "$taskInfo._id",
            title: "$taskInfo.title",
            status: "$taskInfo.status"
          },
          totalDuration: 1,
          totalDurationFormatted: 1,
          entryCount: 1,
          userCount: { $size: "$users" }
        }
      },
      {
        $sort: { totalDuration: -1 }
      }
    ]);

    // Calculate project total
    const projectTotal = summary.reduce(
      (sum: number, item: any) => sum + item.totalDuration,
      0
    );

    // Format durations
    summary.forEach((item: any) => {
      item.totalDurationFormatted = this.formatDuration(item.totalDuration);
    });

    return {
      project: {
        _id: project._id,
        name: project.name
      },
      totalDuration: projectTotal,
      totalDurationFormatted: this.formatDuration(projectTotal),
      taskCount: summary.length,
      tasks: summary
    };
  }

  /**
   * Get user's running timer
   */
  async getRunningTimer(userId: string) {
    const runningTimer = await TimeEntry.findOne({
      user: userId,
      isRunning: true,
      isDeleted: false
    })
      .populate("task", "title status")
      .populate("user", "name email")
      .lean();

    if (!runningTimer) {
      return null;
    }

    // Calculate current duration
    const currentDuration = Math.floor(
      (Date.now() - new Date(runningTimer.startTime).getTime()) / 1000
    );

    return {
      ...runningTimer,
      currentDuration,
      currentDurationFormatted: this.formatDuration(currentDuration)
    };
  }

  /**
   * Delete time entry
   */
  async deleteTimeEntry(entryId: string, userId: string) {
    const timeEntry = await TimeEntry.findOne({
      _id: entryId,
      isDeleted: false
    });

    if (!timeEntry) {
      throw new AppError("Time entry not found", 404);
    }

    // Verify ownership
    if (timeEntry.user.toString() !== userId) {
      throw new AppError("You can only delete your own time entries", 403);
    }

    // Soft delete
    timeEntry.isDeleted = true;
    timeEntry.deletedAt = new Date();
    await timeEntry.save();

    // Log activity
    try {
      await logger.logActivity({
        userId,
        workspaceId: timeEntry.workspace.toString(),
        action: "DELETE",
        resourceType: "TimeEntry",
        resourceId: timeEntry._id.toString()
      });
    } catch (error) {
      // Silent fail - activity logging is non-critical
    }

    return { message: "Time entry deleted successfully" };
  }

  /**
   * Format duration in seconds to human-readable format
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}

module.exports = new TimeEntryService();

export {};
