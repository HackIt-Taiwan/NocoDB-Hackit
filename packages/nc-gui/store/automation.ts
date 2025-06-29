export const useAutomationStore = defineStore('automation', () => {
  // State
  const automations = ref<Map<string, any>>(new Map())
  const activeAutomation = ref<any | null>(null)
  const isUpdatingAutomation = ref(false)
  const isLoadingAutomation = ref(false)

  // Getters
  const activeBaseAutomations = computed(() => [])

  const activeAutomationId = computed(() => '')

  // Actions
  const loadAutomations = async (_parama: any) => {
    return []
  }

  const loadAutomation = async (_p1: any, _p2: any) => {}

  const createAutomation = async (_p1: any, _p2: any) => {}

  const updateAutomation = async (_p1: any, _p2: any, _p3: any) => {}

  const deleteAutomation = async (_p1: any, _p2: any) => {}

  const openScript = async (_p1: any) => {}

  async function openNewScriptModal(..._arg: any[]) {}

  return {
    // State
    automations,
    activeAutomation,
    isUpdatingAutomation,
    isLoadingAutomation,

    // Getters
    activeBaseAutomations,
    activeAutomationId,

    // Actions
    loadAutomations,
    loadAutomation,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    openScript,
    openNewScriptModal,
  }
})

// Enable HMR
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAutomationStore, import.meta.hot))
}
