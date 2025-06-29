import { type AuditType, type UserType, type WorkspaceUserType } from 'nocodb-sdk'

const defaultAuditLogsQuery = {
  type: [],
  workspaceId: undefined,
  baseId: undefined,
  sourceId: undefined,
  user: undefined,
  startDate: undefined,
  endDate: undefined,
  dateRangeLabel: undefined,
  orderBy: {
    created_at: 'desc',
    user: undefined,
  },
} as AuditLogsQuery

export type CollaboratorType = (WorkspaceUserType & { id: string }) | User | UserType

export const useAuditsStore = defineStore('auditsStore', () => {
  const loadActionWorkspaceLogsOnly = ref<boolean>(false)

  const audits = ref<null | Array<AuditType>>(null)

  const isRowExpanded = ref(false)

  const selectedAudit = ref<null | AuditType>(null)

  const auditLogsQuery = ref<AuditLogsQuery>(defaultAuditLogsQuery)

  const hasMoreAudits = ref(false)

  const basesList = computed<NcProject[]>(() => {
    return []
  })

  const bases = computed<Map<string, NcProject>>(() => {
    return new Map()
  })

  const collaboratorsMap = ref<Map<string, CollaboratorType>>(new Map())

  const auditCollaborators = computed<CollaboratorType[]>(() => {
    return Array.from(collaboratorsMap.value.values())
  })

  const isLoadingAudits = ref(false)

  const handleReset = () => {}

  const loadAudits = async (..._arg: any[]) => {}

  const isLoadingBases = ref(false)

  const loadBasesForWorkspace = async () => {}

  const isLoadingUsers = ref(false)

  const loadUsersForWorkspace = async (..._arg: any[]) => {}

  const onInit = async () => {}
  const getUserName = (..._arg: any[]) => {}

  return {
    bases,
    basesList,
    auditCollaborators,
    collaboratorsMap,
    audits,
    isRowExpanded,
    selectedAudit,
    auditLogsQuery,
    isLoadingAudits,
    handleReset,
    loadAudits,
    isLoadingBases,
    isLoadingUsers,
    loadBasesForWorkspace,
    loadUsersForWorkspace,
    onInit,
    getUserName,
    loadActionWorkspaceLogsOnly,
    hasMoreAudits,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuditsStore as any, import.meta.hot))
}
