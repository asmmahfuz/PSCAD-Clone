import React from 'react';
import { WorkspaceTree, type WorkspaceTreeProps } from './WorkspaceTree';

export const ProjectTree: React.FC<WorkspaceTreeProps> = (props) => {
  return <WorkspaceTree {...props} />;
};

export { WorkspaceTree };
export type { WorkspaceTreeProps };
