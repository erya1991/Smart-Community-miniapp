import { computed, readonly, ref } from 'vue'
import type { ProjectSummary } from '../types/app'

const DEFAULT_PROJECT: ProjectSummary = {
  id: 'project-daguanglu',
  name: '大光路智慧社区',
  shortName: '大光路',
}

export function createProjectContext(defaultProject: ProjectSummary = DEFAULT_PROJECT) {
  const currentProject = ref<ProjectSummary | null>(null)
  const hasProject = computed(() => Boolean(currentProject.value?.id))

  const initializeProjectContext = () => {
    if (!currentProject.value) {
      currentProject.value = { ...defaultProject }
    }
  }

  const setCurrentProject = (project: ProjectSummary) => {
    currentProject.value = { ...project }
  }

  return {
    initializeProjectContext,
    useProjectStore: () => ({
      currentProject: readonly(currentProject),
      hasProject,
      setCurrentProject,
    }),
  }
}
