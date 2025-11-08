/**
 * Centralized error message utility that maps technical error codes and messages
 * to user-friendly versions with recovery suggestions.
 * 
 * This utility helps provide better user experience by:
 * - Converting technical errors into plain language
 * - Providing actionable recovery suggestions
 * - Handling various error sources (tRPC, network, validation, etc.)
 */

/**
 * Represents an error with a user-friendly message and optional recovery suggestions
 */
export interface ErrorWithRecovery {
  message: string;
  recoveryTitle?: string;
  recoverySuggestions?: string[];
}

/**
 * Maps error patterns to user-friendly messages with recovery suggestions
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp | string;
  getMessage: (match?: RegExpMatchArray) => ErrorWithRecovery;
}> = [
  // Authentication errors
  {
    pattern: /invalid email or password/i,
    getMessage: () => ({
      message: "The email or password you entered is incorrect.",
      recoveryTitle: "What you can do:",
      recoverySuggestions: [
        "Double-check your email address for typos",
        "Make sure Caps Lock is off when entering your password",
        "Try resetting your password if you've forgotten it",
      ],
    }),
  },
  {
    pattern: /invalid or expired token/i,
    getMessage: () => ({
      message: "Your session has expired. Please log in again.",
      recoveryTitle: "What you can do:",
      recoverySuggestions: [
        "You'll be redirected to the login page automatically",
        "Log in with your credentials to continue",
      ],
    }),
  },
  {
    pattern: /account is inactive/i,
    getMessage: () => ({
      message: "Your account has been deactivated.",
      recoveryTitle: "What you can do:",
      recoverySuggestions: [
        "Contact your company administrator to reactivate your account",
        "If you believe this is an error, reach out to support",
      ],
    }),
  },
  {
    pattern: /pending approval/i,
    getMessage: () => ({
      message: "Your account is waiting for administrator approval.",
      recoveryTitle: "What you can do:",
      recoverySuggestions: [
        "Check your email for updates on your account status",
        "Contact your company administrator to expedite approval",
        "You'll receive an email once your account is approved",
      ],
    }),
  },
  {
    pattern: /current password is incorrect/i,
    getMessage: () => ({
      message: "The current password you entered doesn't match our records.",
      recoveryTitle: "What you can do:",
      recoverySuggestions: [
        "Double-check that you're entering your current password correctly",
        "Make sure Caps Lock is off",
        "If you've forgotten your password, log out and use the password reset option",
      ],
    }),
  },
  {
    pattern: /new password must be different/i,
    getMessage: () => ({
      message: "Your new password must be different from your current password.",
      recoveryTitle: "What you can do:",
      recoverySuggestions: [
        "Choose a new password that you haven't used before",
        "Consider using a password manager to generate a strong, unique password",
      ],
    }),
  },

  // Duplicate/Conflict errors
  {
    pattern: /user with this email already exists/i,
    getMessage: () => ({
      message: "An account with this email address already exists.",
      recoveryTitle: "What you can do:",
      recoverySuggestions: [
        "Try logging in instead of creating a new account",
        "Use a different email address to register",
        "If you forgot your password, use the password reset option",
      ],
    }),
  },
  {
    pattern: /email already exists/i,
    getMessage: () => ({
      message: "This email address is already in use by another account.",
      recoveryTitle: "What you can do:",
      recoverySuggestions: [
        "Use a different email address",
        "If this is your email, you may already have an account - try logging in",
      ],
    }),
  },

  // Scheduling conflict errors
  {
    pattern: /scheduling conflict|scene conflict/i,
    getMessage: () => ({
      message: "This scene conflicts with another scheduled scene.",
      recoveryTitle: "What you can do:",
      recoverySuggestions: [
        "Choose a different time slot",
        "Adjust the scene duration",
        "Reassign actors or crew to avoid overlaps",
        "Review the conflict details to see which scenes overlap",
      ],
    }),
  },
  {
    pattern: /resource conflict|actor.*conflict|crew.*conflict/i,
    getMessage: () => ({
      message: "The same person is assigned to multiple scenes at the same time.",
      recoveryTitle: "What you can do:",
      recoverySuggestions: [
        "Reschedule one of the conflicting scenes",
        "Reassign actors or crew members",
        "Adjust scene durations to avoid overlap",
      ],
    }),
  },

  // Permission errors
  {
    pattern: /insufficient permissions/i,
    getMessage: () => ({
      message: "You don't have permission to perform this action.",
      recoveryTitle: "What you can do:",
      recoverySuggestions: [
        "Contact your administrator to request the necessary permissions",
        "Check if you're logged in with the correct account",
      ],
    }),
  },
  {
    pattern: /unauthorized/i,
    getMessage: () => ({
      message: "You're not authorized to access this resource.",
      recoveryTitle: "What you can do:",
      recoverySuggestions: [
        "Make sure you're logged in",
        "Contact your administrator if you believe you should have access",
      ],
    }),
  },

  // Not found errors
  {
    pattern: /not found/i,
    getMessage: () => ({
      message: "The requested resource could not be found.",
      recoveryTitle: "What you can do:",
      recoverySuggestions: [
        "Check that the item hasn't been deleted",
        "Refresh the page to see the latest data",
        "Go back and try again",
      ],
    }),
  },

  // Validation errors
  {
    pattern: /invalid email/i,
    getMessage: () => ({
      message: "Please enter a valid email address.",
      recoveryTitle: "What you can do:",
      recoverySuggestions: [
        "Make sure the email is in the format: name@example.com",
        "Check for typos in the email address",
      ],
    }),
  },
  {
    pattern: /password must be at least (\d+) characters/i,
    getMessage: (match) => ({
      message: `Password must be at least ${match?.[1] || "8"} characters long.`,
      recoveryTitle: "What you can do:",
      recoverySuggestions: [
        "Choose a longer password for better security",
        "Consider using a password manager to generate a strong password",
      ],
    }),
  },
  {
    pattern: /password must contain/i,
    getMessage: () => ({
      message: "Password doesn't meet security requirements.",
      recoveryTitle: "Your password must include:",
      recoverySuggestions: [
        "At least one uppercase letter (A-Z)",
        "At least one lowercase letter (a-z)",
        "At least one number (0-9)",
        "At least one special character (@$!%*?&)",
      ],
    }),
  },

  // Network/Connection errors
  {
    pattern: /network error|failed to fetch/i,
    getMessage: () => ({
      message: "Unable to connect to the server.",
      recoveryTitle: "What you can do:",
      recoverySuggestions: [
        "Check your internet connection",
        "Refresh the page and try again",
        "If the problem persists, the server may be temporarily unavailable",
      ],
    }),
  },

  // File upload errors
  {
    pattern: /file size|too large/i,
    getMessage: () => ({
      message: "The file you're trying to upload is too large.",
      recoveryTitle: "What you can do:",
      recoverySuggestions: [
        "Compress the file to reduce its size",
        "Choose a smaller file",
        "Maximum file size is typically 5MB",
      ],
    }),
  },
  {
    pattern: /invalid file type|unsupported format/i,
    getMessage: () => ({
      message: "This file type is not supported.",
      recoveryTitle: "What you can do:",
      recoverySuggestions: [
        "Use a supported file format (JPG, PNG, GIF, or WebP for images)",
        "Convert your file to a supported format",
      ],
    }),
  },

  // Generic database/server errors
  {
    pattern: /database error|internal server error/i,
    getMessage: () => ({
      message: "Something went wrong on our end.",
      recoveryTitle: "What you can do:",
      recoverySuggestions: [
        "Try again in a few moments",
        "If the problem continues, contact support",
        "Your data has been preserved and no changes were made",
      ],
    }),
  },
];

/**
 * Maps tRPC error codes to user-friendly messages
 */
const ERROR_CODE_MESSAGES: Record<string, ErrorWithRecovery> = {
  BAD_REQUEST: {
    message: "The request couldn't be processed due to invalid data.",
    recoveryTitle: "What you can do:",
    recoverySuggestions: [
      "Check that all required fields are filled in correctly",
      "Make sure the data you entered is in the correct format",
    ],
  },
  UNAUTHORIZED: {
    message: "You need to be logged in to perform this action.",
    recoveryTitle: "What you can do:",
    recoverySuggestions: [
      "Log in to your account",
      "Your session may have expired - try logging in again",
    ],
  },
  FORBIDDEN: {
    message: "You don't have permission to perform this action.",
    recoveryTitle: "What you can do:",
    recoverySuggestions: [
      "Contact your administrator to request access",
      "Make sure you're using the correct account",
    ],
  },
  NOT_FOUND: {
    message: "The item you're looking for doesn't exist.",
    recoveryTitle: "What you can do:",
    recoverySuggestions: [
      "Check if the item was deleted",
      "Refresh the page to see the latest data",
      "Go back and try again",
    ],
  },
  TIMEOUT: {
    message: "The request took too long to complete.",
    recoveryTitle: "What you can do:",
    recoverySuggestions: [
      "Check your internet connection",
      "Try again in a moment",
      "If the problem persists, contact support",
    ],
  },
  CONFLICT: {
    message: "This action conflicts with existing data.",
    recoveryTitle: "What you can do:",
    recoverySuggestions: [
      "Check if a similar item already exists",
      "Refresh the page to see the latest data",
      "Try using a different name or identifier",
    ],
  },
  PRECONDITION_FAILED: {
    message: "The action couldn't be completed due to unmet requirements.",
    recoveryTitle: "What you can do:",
    recoverySuggestions: [
      "Make sure all prerequisites are met",
      "Check that related items exist and are accessible",
    ],
  },
  PAYLOAD_TOO_LARGE: {
    message: "The data you're trying to send is too large.",
    recoveryTitle: "What you can do:",
    recoverySuggestions: [
      "Reduce the size of files you're uploading",
      "Split large operations into smaller chunks",
    ],
  },
  TOO_MANY_REQUESTS: {
    message: "You've made too many requests. Please slow down.",
    recoveryTitle: "What you can do:",
    recoverySuggestions: [
      "Wait a moment before trying again",
      "Avoid clicking buttons multiple times",
    ],
  },
  INTERNAL_SERVER_ERROR: {
    message: "An unexpected error occurred on the server.",
    recoveryTitle: "What you can do:",
    recoverySuggestions: [
      "Try again in a few moments",
      "If the problem persists, contact support",
      "No changes were made to your data",
    ],
  },
};

/**
 * Converts a technical error into a user-friendly message with recovery suggestions
 * @param error - The error object from tRPC or other sources
 * @returns An object with a user-friendly message and optional recovery suggestions
 */
export function getUserFriendlyError(error: any): ErrorWithRecovery {
  // Extract the error message
  const errorMessage = error?.message || error?.toString() || "An unexpected error occurred";
  
  // Extract error code if available
  const errorCode = error?.data?.code || error?.code;

  // First, try to match against specific error message patterns
  for (const { pattern, getMessage } of ERROR_PATTERNS) {
    if (typeof pattern === "string") {
      if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
        return getMessage();
      }
    } else {
      const match = errorMessage.match(pattern);
      if (match) {
        return getMessage(match);
      }
    }
  }

  // If no pattern matches, try to use the error code
  if (errorCode && ERROR_CODE_MESSAGES[errorCode]) {
    return ERROR_CODE_MESSAGES[errorCode];
  }

  // If the error message is already fairly user-friendly (not too technical), use it
  const isTechnical = /prisma|sql|database|stack trace|undefined|null reference/i.test(errorMessage);
  
  if (!isTechnical && errorMessage.length < 200) {
    return {
      message: errorMessage,
      recoveryTitle: "What you can do:",
      recoverySuggestions: [
        "Try again in a moment",
        "If the problem continues, contact support",
      ],
    };
  }

  // Default fallback for technical or unknown errors
  return {
    message: "Something unexpected happened. We're sorry for the inconvenience.",
    recoveryTitle: "What you can do:",
    recoverySuggestions: [
      "Try refreshing the page",
      "If the problem persists, contact support with details about what you were doing",
      "Your data is safe and no changes were made",
    ],
  };
}

/**
 * Formats an error with recovery suggestions into a single string for display
 * @param errorInfo - The error information with message and recovery suggestions
 * @returns A formatted string suitable for display in toasts or alert boxes
 */
export function formatErrorMessage(errorInfo: ErrorWithRecovery): string {
  let message = errorInfo.message;
  
  if (errorInfo.recoveryTitle && errorInfo.recoverySuggestions && errorInfo.recoverySuggestions.length > 0) {
    message += `\n\n${errorInfo.recoveryTitle}\n`;
    message += errorInfo.recoverySuggestions.map((suggestion, index) => 
      `${index + 1}. ${suggestion}`
    ).join("\n");
  }
  
  return message;
}

/**
 * Shows a user-friendly error toast with recovery suggestions
 * @param error - The error object from tRPC or other sources
 * @param customMessage - Optional custom message to override the default
 */
export function showErrorToast(error: any, customMessage?: string) {
  const errorInfo = getUserFriendlyError(error);
  
  // If a custom message is provided, use it but keep the recovery suggestions
  if (customMessage) {
    errorInfo.message = customMessage;
  }
  
  // For now, just return the error info so it can be used with toast.error()
  // The caller will use toast.error(formatErrorMessage(errorInfo))
  return errorInfo;
}

/**
 * Handles an error by getting user-friendly message and showing it in a toast
 * This is a convenience function that combines getUserFriendlyError and toast display
 */
export function handleErrorWithToast(error: any, toast: any, customMessage?: string) {
  const errorInfo = showErrorToast(error, customMessage);
  toast.error(formatErrorMessage(errorInfo), {
    duration: 6000, // Longer duration for errors with recovery suggestions
  });
}
