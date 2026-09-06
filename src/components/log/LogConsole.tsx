import React from 'react';
import type { LogEntry } from '../../types';
import { OutputDock, type OutputDockProps } from './OutputDock';

export interface LogProps extends Partial<OutputDockProps> {
  logs: LogEntry[];
  onClear: () => void;
}

/**
 * LogConsole - Backwards-compatible wrapper delegating to PSCAD's 4-Tab OutputDock
 */
export const LogConsole: React.FC<LogProps> = ({ logs, onClear, ...props }) => {
  return <OutputDock logs={logs} onClearLogs={onClear} {...props} />;
};

export { OutputDock };
export type { OutputDockProps };
