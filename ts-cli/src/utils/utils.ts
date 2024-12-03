import { LogType } from "../types/types.js";

export const handleLogType = (
  type: LogType,
): 'yellowBright' | 'blueBright' | 'greenBright' | 'redBright' | 'grey' => {
  switch (type) {
    case 'other':
      return 'grey';
    case 'warning':
      return 'yellowBright';
    case 'info':
      return 'blueBright';
    case 'success':
      return 'greenBright';
    case 'error':
      return 'redBright';
    default:
      return 'blueBright';
  }
};
