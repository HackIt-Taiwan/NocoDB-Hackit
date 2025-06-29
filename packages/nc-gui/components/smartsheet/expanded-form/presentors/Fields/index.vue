<script setup lang="ts">
import { type ColumnType, PermissionEntity, PermissionKey } from 'nocodb-sdk'

/* interface */

const props = defineProps<{
  rowId?: string
  fields: ColumnType[]
  hiddenFields: ColumnType[]
  isUnsavedDuplicatedRecordExist: boolean
  isUnsavedFormExist: boolean
  isLoading: boolean
  isSaving: boolean
  newRecordSubmitBtnText?: string
}>()

const emits = defineEmits(['copyRecordUrl', 'deleteRow', 'save'])

const rowId = toRef(props, 'rowId')
const fields = toRef(props, 'fields')
const hiddenFields = toRef(props, 'hiddenFields')
const isUnsavedDuplicatedRecordExist = toRef(props, 'isUnsavedDuplicatedRecordExist')
const isUnsavedFormExist = toRef(props, 'isUnsavedFormExist')
const isLoading = toRef(props, 'isLoading')
const isSaving = toRef(props, 'isSaving')
const newRecordSubmitBtnText = toRef(props, 'newRecordSubmitBtnText')

/* stores */

const {
  commentsDrawer,
  changedColumns,
  isNew,
  loadRow: _loadRow,
  row: _row,
  meta,
  isAllowedAddNewRecord,
} = useExpandedFormStoreOrThrow()

const { isSqlView } = useSmartsheetStoreOrThrow()

const { isUIAllowed } = useRoles()
const { isMobileMode } = useGlobal()

/* flags */
const showRightSections = computed(() => !isNew.value && commentsDrawer.value && isUIAllowed('commentList') && !isSqlView.value)

const canEdit = computed(() => isUIAllowed('dataEdit') && !isSqlView.value)
</script>

<script lang="ts">
export default {
  name: 'ExpandedFormPresentorsFields',
}
</script>

<template>
  <div class="h-full flex flex-row">
    <div
      class="h-full flex xs:w-full flex-col overflow-hidden"
      :class="{
        'w-full': !showRightSections,
        'flex-1': showRightSections,
      }"
    >
      <SmartsheetExpandedFormPresentorsFieldsColumns :fields="fields" :hidden-fields="hiddenFields" :is-loading="isLoading" />

      <div
        v-if="canEdit"
        class="w-full flex items-center justify-end px-2 xs:(p-0 gap-x-4 justify-between)"
        :class="{
          'xs(border-t-1 border-gray-200)': !isNew,
        }"
      >
        <div v-if="!isNew && isMobileMode" class="p-2">
          <NcDropdown placement="bottomRight" class="p-2">
            <NcButton :disabled="isLoading" class="nc-expand-form-more-actions" type="secondary" size="small">
              <GeneralIcon :class="isLoading ? 'text-gray-300' : 'text-gray-700'" class="text-md" icon="threeDotVertical" />
            </NcButton>

            <template #overlay>
              <NcMenu variant="small">
                <NcMenuItem @click="_loadRow()">
                  <div v-e="['c:row-expand:reload']" class="flex gap-2 items-center" data-testid="nc-expanded-form-reload">
                    <component :is="iconMap.reload" class="cursor-pointer" />
                    {{ $t('general.reload') }}
                  </div>
                </NcMenuItem>
                <NcMenuItem v-if="rowId" @click="!isNew ? emits('copyRecordUrl') : () => {}">
                  <div v-e="['c:row-expand:copy-url']" class="flex gap-2 items-center" data-testid="nc-expanded-form-copy-url">
                    <component :is="iconMap.copy" class="cursor-pointer nc-duplicate-row" />
                    {{ $t('labels.copyRecordURL') }}
                  </div>
                </NcMenuItem>
                <NcDivider />
                <PermissionsTooltip
                  v-if="isUIAllowed('dataEdit') && !isNew"
                  :entity="PermissionEntity.TABLE"
                  :entity-id="meta?.id"
                  :permission="PermissionKey.TABLE_RECORD_DELETE"
                >
                  <template #default="{ isAllowed }">
                    <NcMenuItem
                      v-e="['c:row-expand:delete']"
                      :class="{
                        '!text-red-500 !hover:bg-red-50': isAllowed,
                      }"
                      :disabled="!isAllowed"
                      @click="!isNew && emits('deleteRow')"
                    >
                      <div data-testid="nc-expanded-form-delete">
                        <component :is="iconMap.delete" class="cursor-pointer nc-delete-row" />
                        Delete record
                      </div>
                    </NcMenuItem>
                  </template>
                </PermissionsTooltip>
              </NcMenu>
            </template>
          </NcDropdown>
        </div>
        <div v-else>
          <!-- For spacing only -->
        </div>
        <div v-if="isMobileMode && !isSqlView" class="p-2">
          <NcButton
            v-e="['c:row-expand:save']"
            :disabled="(!isAllowedAddNewRecord && isNew) || (changedColumns.size === 0 && !isUnsavedFormExist)"
            :loading="isSaving"
            class="nc-expand-form-save-btn !xs:(text-sm) !px-2"
            :class="{
              '!h-7': !isMobileMode,
            }"
            data-testid="nc-expanded-form-save"
            type="primary"
            :size="isMobileMode ? 'small' : 'xsmall'"
            @click="emits('save')"
          >
            <div class="xs:px-1">{{ newRecordSubmitBtnText ?? isNew ? 'Create Record' : 'Save Record' }}</div>
          </NcButton>
        </div>
      </div>
      <div v-else class="p-2" />
    </div>
    <div
      v-if="showRightSections && !isUnsavedDuplicatedRecordExist"
      class="nc-comments-drawer border-l-1 relative border-gray-200 bg-gray-50 w-1/3 max-w-[400px] min-w-0 h-full xs:hidden rounded-br-2xl"
      :class="{
        active: commentsDrawer && isUIAllowed('commentList'),
      }"
    >
      <SmartsheetExpandedFormSidebar />
    </div>
  </div>
</template>
