import { createProjectContext } from '../../../../packages/common/stores/project'

const projectContext = createProjectContext()

export const { initializeProjectContext, useProjectStore } = projectContext
