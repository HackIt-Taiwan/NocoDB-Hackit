<script setup lang="ts">
import { CURRENT_USER_TOKEN, type ColumnType, type FilterType } from 'nocodb-sdk'
import type ColumnFilter from './ColumnFilter.vue'

const isLocked = inject(IsLockedInj, ref(false))

const activeView = inject(ActiveViewInj, ref())

const isToolbarIconMode = inject(
  IsToolbarIconMode,
  computed(() => false),
)

const reloadViewDataEventHook = inject(ReloadViewDataHookInj, createEventHook())

const { isMobileMode } = useGlobal()

const filterComp = ref<typeof ColumnFilter>()

const {
  allFilters: smatsheetAllFilters,
  nestedFilters,
  eventBus,
  filtersFromUrlParams,
  whereQueryFromUrl,
} = useSmartsheetStoreOrThrow()

const { appearanceConfig: filteredOrSortedAppearanceConfig, userColumnIds } = useColumnFilteredOrSorted()

// todo: avoid duplicate api call by keeping a filter store
const { nonDeletedFilters, loadFilters } = useViewFilters(
  activeView!,
  undefined,
  computed(() => true),
  () => false,
  nestedFilters.value,
  true,
)

const filtersLength = ref(0)

watch(
  () => activeView?.value?.id,
  async (viewId) => {
    if (viewId) {
      await loadFilters({
        hookId: undefined,
        isWebhook: false,
        loadAllFilters: true,
      })
      filtersLength.value = nonDeletedFilters.value.length || 0
    }
  },
  { immediate: true },
)

const open = ref(false)

const allFilters = ref({})

provide(AllFiltersInj, allFilters)

useMenuCloseOnEsc(open)

const draftFilter = ref({})
const queryFilterOpen = ref(false)

eventBus.on(async (event, column: ColumnType) => {
  if (!column) return

  if (event === SmartsheetStoreEvents.FILTER_ADD) {
    draftFilter.value = { fk_column_id: column.id }
    open.value = true
  }
})

const combinedFilterLength = computed(() => {
  return filtersLength.value + (filtersFromUrlParams.value?.filters?.length || 0)
})

const isCurrentUserFilterPresent = ref(false)

const checkForCurrentUserFilter = (currentFilters: FilterType[] = []) => {
  let hasCurrentUserFilter = false

  const extractFilterArray = (filters: FilterType[]) => {
    if (hasCurrentUserFilter) return

    for (const eachFilter of filters) {
      if (eachFilter.is_group && eachFilter.children?.length) {
        extractFilterArray(eachFilter.children)
      } else if (
        eachFilter.fk_column_id &&
        userColumnIds.value.includes(eachFilter.fk_column_id) &&
        eachFilter.value?.includes(CURRENT_USER_TOKEN)
      ) {
        hasCurrentUserFilter = true
      }
    }
  }

  extractFilterArray([
    ...currentFilters,
    ...(filtersFromUrlParams.value?.errors?.length ? [] : filtersFromUrlParams.value?.filters || []),
  ])
  return hasCurrentUserFilter
}

if (isEeUI) {
  reloadViewDataEventHook.on(async (params) => {
    if (params?.isFormFieldFilters) return
    isCurrentUserFilterPresent.value = checkForCurrentUserFilter(Object.values(allFilters.value).flat(Infinity) as FilterType[])
  })

  watch(
    [smatsheetAllFilters, nestedFilters, allFilters, filtersFromUrlParams],
    () => {
      isCurrentUserFilterPresent.value = checkForCurrentUserFilter(
        !ncIsEmptyObject(allFilters.value)
          ? (Object.values(allFilters.value).flat(Infinity) as FilterType[])
          : [...smatsheetAllFilters.value, ...nestedFilters.value],
      )
    },
    {
      deep: true,
      immediate: true,
    },
  )
}
</script>

<template>
  <NcDropdown
    v-model:visible="open"
    overlay-class-name="nc-dropdown-filter-menu nc-toolbar-dropdown overflow-hidden"
    class="!xs:hidden"
  >
    <NcTooltip :disabled="!isMobileMode && !isToolbarIconMode">
      <template #title>
        {{ $t('activity.filter') }}
      </template>

      <NcButton
        v-e="['c:filter']"
        class="nc-filter-menu-btn nc-toolbar-btn !border-0 !h-7 group"
        size="small"
        type="secondary"
        :show-as-disabled="isLocked"
        :class="{
          [filteredOrSortedAppearanceConfig.FILTERED.toolbarBgClass]: combinedFilterLength,
        }"
      >
        <div class="flex items-center gap-1 min-h-5">
          <div class="flex items-center gap-2">
            <component :is="iconMap.filter" class="h-4 w-4" />
            <!-- Filter -->
            <span v-if="!isMobileMode && !isToolbarIconMode" class="text-capitalize !text-[13px] font-medium">{{
              $t('activity.filter')
            }}</span>
          </div>

          <NcTooltip v-if="combinedFilterLength" :disabled="!isCurrentUserFilterPresent" class="flex">
            <template #title>
              {{ $t('tooltip.filteredByCurrentUser') }}
            </template>
            <span
              class="nc-toolbar-btn-chip inline-flex items-center"
              :class="{
                [filteredOrSortedAppearanceConfig.FILTERED.toolbarChipBgClass]: true,
                [filteredOrSortedAppearanceConfig.FILTERED.toolbarTextClass]: true,
              }"
            >
              {{ combinedFilterLength }}
              <span v-if="isCurrentUserFilterPresent" class="ml-1 pb-0.6">{{ '@' }}</span>
            </span>
          </NcTooltip>

          <!--    show a warning icon with tooltip if query filter error is there -->
          <template v-if="filtersFromUrlParams?.errors?.length">
            <NcTooltip :title="$t('msg.urlFilterError')" placement="top">
              <GeneralIcon icon="ncAlertCircle" class="nc-error-icon w-3.5" />
            </NcTooltip>
          </template>
        </div>
      </NcButton>
    </NcTooltip>

    <template #overlay>
      <div>
        <SmartsheetToolbarColumnFilter
          ref="filterComp"
          v-model:draft-filter="draftFilter"
          v-model:is-open="open"
          class="nc-table-toolbar-menu"
          :auto-save="true"
          data-testid="nc-filter-menu"
          :is-view-filter="true"
          @update:filters-length="filtersLength = $event"
        >
        </SmartsheetToolbarColumnFilter>
        <template v-if="filtersFromUrlParams">
          <a-divider class="!my-1" />
          <div class="px-2 pb-2">
            <div
              class="leading-5 font-semibold inline-flex w-full items-center cursor-pointer px-2"
              :class="{ 'pb-0': !queryFilterOpen }"
              @click="queryFilterOpen = !queryFilterOpen"
            >
              <div class="flex-grow gap-2 flex">
                {{ $t('title.urlFilters') }}
                <div
                  v-if="filtersFromUrlParams?.filters?.length"
                  class="bg-[#F0F3FF] px-1 rounded rounded-6px font-medium text-brand-500 h-5"
                >
                  {{ filtersFromUrlParams.filters.length }}
                </div>

                <div>
                  <NcTooltip :title="$t('msg.urlFilter')" placement="top">
                    <GeneralIcon icon="ncInfo" class="nc-info-icon !w-3.5 !h-3.5" />
                  </NcTooltip>
                </div>
              </div>
              <div class="p-2">
                <GeneralIcon
                  icon="ncChevronDown"
                  class="nc-chevron-icon transition-all cursor-pointer w-4 h-4"
                  :class="{ 'transform rotate-180': queryFilterOpen }"
                />
              </div>
            </div>
            <div
              class="overflow-hidden transition-all duration-300 mt-1"
              :class="{ 'max-h-0': !queryFilterOpen, 'max-h-[1000px] overflow-auto': queryFilterOpen }"
            >
              <SmartsheetToolbarColumnFilter
                v-if="filtersFromUrlParams.filters"
                :key="whereQueryFromUrl"
                ref="filterComp"
                v-model="filtersFromUrlParams.filters"
                v-model:is-open="open"
                class="nc-query-filter readonly px-2 pb-2"
                :auto-save="false"
                :is-view-filter="false"
                read-only
                query-filter
              >
              </SmartsheetToolbarColumnFilter>

              <div
                v-else-if="filtersFromUrlParams?.errors?.length"
                class="px-2 transition-margin duration-500"
                :class="{ 'mb-2': queryFilterOpen }"
              >
                <NcAlert type="error" message="Error" :description="$t('msg.urlFilterError')" />
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </NcDropdown>
</template>

<style lang="scss">
.nc-query-filter.readonly .nc-cell-field,
.nc-query-filter.readonly {
  input,
  .text-nc-content-gray-muted {
    @apply !text-gray-400;
  }
}
</style>

<style lang="scss" scoped>
.nc-error-icon {
  color: var(--nc-content-red-dark);
}

.nc-info-icon {
  color: var(--nc-content-grey-muted);
}

.nc-chevron-icon {
  color: var(--nc-content-grey-subtle);
}
</style>
