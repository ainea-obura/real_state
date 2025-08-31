"use server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL;

// --- Types ---
export interface TaskConfiguration {
  id: string;
  task_type: "invoice_generation" | "invoice_reminders";
  task_type_display: string;
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly";
  frequency_display: string;
  time: string;
  execution_frequency: "every_minute" | "every_hour" | "every_4_hours" | "every_6_hours" | "once_daily";
  day_of_week?: string;
  day_of_month?: number;
  before_due_days?: number;
  after_due_days?: number;
  status: "active" | "inactive" | "error";
  status_display: string;
  last_run?: string;
  last_run_formatted?: string;
  last_run_status?: "success" | "error" | "skipped";
  last_run_status_display?: string;
  execution_count: number;
  error_count: number;
  success_rate: number;
  notes?: string;
  cron_expression?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskConfigurationCreate {
  task_type: "invoice_generation" | "invoice_reminders";
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly";
  time: string;
  execution_frequency: "every_minute" | "every_hour" | "every_4_hours" | "every_6_hours" | "once_daily";
  day_of_week?: string;
  day_of_month?: number;
  before_due_days?: number;
  after_due_days?: number;
  status: "active" | "inactive" | "error";
  notes?: string;
}

export interface TaskConfigurationUpdate {
  enabled?: boolean;
  frequency?: "daily" | "weekly" | "monthly";
  time?: string;
  execution_frequency?: "every_minute" | "every_hour" | "every_4_hours" | "every_6_hours" | "once_daily";
  day_of_week?: string;
  day_of_month?: number;
  before_due_days?: number;
  after_due_days?: number;
  status?: "active" | "inactive" | "error";
  notes?: string;
}

export interface TaskTestParams {
  task_type: "invoice_generation" | "invoice_reminders";
  force_run?: boolean;
}

export interface TaskSettingsSummary {
  summary: {
    total_tasks: number;
    enabled_tasks: number;
    active_tasks: number;
    total_executions: number;
    total_errors: number;
    overall_success_rate: number;
    recent_executions: number;
  };
  task_stats: Record<string, {
    enabled: boolean;
    status: string;
    execution_count: number;
    error_count: number;
    last_run?: string;
    success_rate: number;
  }>;
}

// --- Actions ---

// Fetch all task configurations
export const fetchTaskConfigurations = async (): Promise<{success: boolean; data: TaskConfiguration[]; message?: string}> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    
    if (!token) {
      return { success: false, data: [], message: "Authentication required" };
    }

    const response = await fetch(
      `${API_BASE_URL}/finance/task-settings/list`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        data: [],
        message: errorData.message || "Failed to fetch task configurations",
      };
    }

    const data = await response.json();
    return { success: true, data: data.results || data };
  } catch (error) {
    return {
      success: false,
      data: [],
      message: "Network error while fetching task configurations",
    };
  }
};

// Fetch specific task configuration
export const fetchTaskConfiguration = async (id: string): Promise<{ success: boolean; data?: TaskConfiguration; message?: string }> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    
    if (!token) {
      return { success: false, message: "Authentication required" };
    }

    const response = await fetch(
      `${API_BASE_URL}/finance/task-settings/${id}/detail`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to fetch task configuration",
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: "Network error while fetching task configuration",
    };
  }
};

// Create new task configuration
export const createTaskConfiguration = async (
  payload: TaskConfigurationCreate
): Promise<{ success: boolean; data?: TaskConfiguration; message?: string }> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    
    if (!token) {
      return { success: false, message: "Authentication required" };
    }

    const response = await fetch(
      `${API_BASE_URL}/finance/task-settings/create`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to create task configuration",
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: "Network error while creating task configuration",
    };
  }
};

// Update task configuration
export const updateTaskConfiguration = async (
  id: string,
  payload: TaskConfigurationUpdate
): Promise<{ success: boolean; data?: TaskConfiguration; message?: string }> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    
    if (!token) {
      return { success: false, message: "Authentication required" };
    }

    const response = await fetch(
      `${API_BASE_URL}/finance/task-settings/${id}/update`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to update task configuration",
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: "Network error while updating task configuration",
    };
  }
};

// Test task execution
export const testTaskExecution = async (
  params: TaskTestParams
): Promise<{ success: boolean; message: string; task_id?: string }> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    
    if (!token) {
      return { success: false, message: "Authentication required" };
    }

    const response = await fetch(
      `${API_BASE_URL}/finance/task-settings/test`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log(params.task_type, " : " ,errorData.message);

      return {
        success: false,
        message: errorData.message || "Failed to test task execution",
      };
    }

    const data = await response.json();
    console.log(params.task_type, " : " ,data.message);
    return { 
      success: true, 
      message: data.message,
      task_id: data.task_id 
    };
  } catch (error) {
    return {
      success: false,
      message: "Network error while testing task execution",
    };
  }
};

// Fetch task settings summary
export const fetchTaskSettingsSummary = async (): Promise<{ success: boolean; data?: TaskSettingsSummary; message?: string }> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    
    if (!token) {
      return { success: false, message: "Authentication required" };
    }

    const response = await fetch(
      `${API_BASE_URL}/finance/task-settings/summary`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || "Failed to fetch task settings summary",
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: "Network error while fetching task settings summary",
    };
  }
};

// Save all task configurations (for the UI save button)
export const saveAllTaskConfigurations = async (
  invoiceConfig: TaskConfigurationUpdate,
  reminderConfig: TaskConfigurationUpdate
): Promise<{ success: boolean; message: string }> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    
    if (!token) {
      return { success: false, message: "Authentication required" };
    }

    // First, get existing configurations
    const configsResponse = await fetch(
      `${API_BASE_URL}/finance/task-settings/list`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!configsResponse.ok) {
      return { success: false, message: "Failed to fetch existing configurations" };
    }

    const configsData = await configsResponse.json();
    const configs = configsData.results || configsData;

    // Find invoice and reminder configurations
    const invoiceConfigRecord = configs.find(
      (config: TaskConfiguration) => config.task_type === "invoice_generation"
    );
    const reminderConfigRecord = configs.find(
      (config: TaskConfiguration) => config.task_type === "invoice_reminders"
    );

    // Update or create configurations
    const updatePromises = [];

    if (invoiceConfigRecord) {
      updatePromises.push(
        updateTaskConfiguration(invoiceConfigRecord.id, invoiceConfig)
      );
    } else {
      updatePromises.push(
        createTaskConfiguration({
          task_type: "invoice_generation",
          enabled: invoiceConfig.enabled ?? true,
          frequency: invoiceConfig.frequency ?? "daily",
          time: invoiceConfig.time ?? "09:00",
          execution_frequency: invoiceConfig.execution_frequency ?? "once_daily",
          status: invoiceConfig.status ?? "active",
          ...invoiceConfig,
        })
      );
    }

    if (reminderConfigRecord) {
      updatePromises.push(
        updateTaskConfiguration(reminderConfigRecord.id, reminderConfig)
      );
    } else {
      updatePromises.push(
        createTaskConfiguration({
          task_type: "invoice_reminders",
          enabled: reminderConfig.enabled ?? true,
          frequency: reminderConfig.frequency ?? "daily",
          time: reminderConfig.time ?? "08:00",
          execution_frequency: reminderConfig.execution_frequency ?? "every_hour",
          status: reminderConfig.status ?? "active",
          ...reminderConfig,
        })
      );
    }

    const results = await Promise.all(updatePromises);
    const hasErrors = results.some(result => !result.success);

    if (hasErrors) {
      return { 
        success: false, 
        message: "Some configurations failed to save. Please try again." 
      };
    }

    return { 
      success: true, 
      message: "All task configurations saved successfully" 
    };
  } catch (error) {
    return {
      success: false,
      message: "Network error while saving task configurations",
    };
  }
}; 