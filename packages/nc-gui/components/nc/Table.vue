<script lang="ts" setup>
import type { CSSProperties } from '@vue/runtime-dom'

import { type PaginatedType } from 'nocodb-sdk'

interface Props {
  columns: NcTableColumnProps[]
  data: Record<string, any>[]
  headerRowHeight?: CSSProperties['height']
  rowHeight?: CSSProperties['height']
  orderBy?: Record<string, SordDirectionType>
  multiFieldOrderBy?: boolean
  bordered?: boolean
  isDataLoading?: boolean
  stickyHeader?: boolean
  forceStickyHeader?: boolean
  stickyFirstColumn?: boolean
  disableTableScroll?: boolean
  headerRowClassName?: string
  bodyRowClassName?: string
  headerCellClassName?: string
  bodyCellClassName?: string
  customHeaderRow?: (columns: NcTableColumnProps[]) => Record<string, any>
  customRow?: (record: Record<string, any>, recordIndex: number) => Record<string, any>
  pagination?: boolean
  paginationOffset?: number
  tableToolbarClassName?: string
}

const props = withDefaults(defineProps<Props>(), {
  columns: () => [] as NcTableColumnProps[],
  data: () => [] as Record<string, any>[],
  headerRowHeight: '54px',
  rowHeight: '54px',
  orderBy: () => ({} as Record<string, SordDirectionType>),
  multiFieldOrderBy: false,
  bordered: true,
  isDataLoading: false,
  stickyHeader: true,
  forceStickyHeader: false,
  disableTableScroll: false,
  headerRowClassName: '',
  bodyRowClassName: '',
  headerCellClassName: '',
  bodyCellClassName: '',
  customHeaderRow: () => ({}),
  customRow: () => ({}),
  pagination: false,
  paginationOffset: 10,
  tableToolbarClassName: '',
})

const emit = defineEmits(['update:orderBy', 'rowClick'])

const defaultPaginationData = { page: 1, pageSize: 25, totalRows: 0, isLoading: true }

const tableWrapper = ref<HTMLDivElement>()

const tableHeader = ref<HTMLTableElement>()

const tableFooterRef = ref<HTMLDivElement>()

const tableToolbarRef = ref<HTMLDivElement>()

const { height: _tableToolbarHeight } = useElementBounding(tableToolbarRef)

const { height: tableHeadHeight, width: tableHeadWidth } = useElementBounding(tableHeader)

const { height: _tableFooterHeight } = useElementBounding(tableFooterRef)

const orderBy = useVModel(props, 'orderBy', emit)

const { columns, data, isDataLoading, customHeaderRow, customRow } = toRefs(props)

const headerRowClassName = computed(() => `nc-table-header-row ${props.headerRowClassName}`)

const bodyRowClassName = computed(() => `nc-table-row ${props.bodyRowClassName}`)

const slots = useSlots()

const headerCellWidth = ref<(number | undefined)[]>([])

const paginationData = ref<PaginatedType>(defaultPaginationData)

const showPagination = computed(() => {
  return (
    props.pagination &&
    !isDataLoading.value &&
    paginationData.value.totalRows &&
    paginationData.value.totalRows > props.paginationOffset
  )
})

const paginatedData = computed(() => {
  if (!showPagination.value) return data.value

  const { page, pageSize } = paginationData.value
  const start = (page! - 1) * pageSize!
  const end = start + pageSize!

  return data.value.slice(start, end)
})

const tableToolbarHeight = computed(() => {
  return _tableToolbarHeight.value || 0
})

const tableFooterHeight = computed(() => {
  return showPagination.value ? Math.max(40, _tableFooterHeight.value) : _tableFooterHeight.value
})

const updateOrderBy = (field: string) => {
  if (!data.value.length || !field) return

  const orderCycle = { undefined: 'asc', asc: 'desc', desc: undefined }

  if (props.multiFieldOrderBy) {
    orderBy.value[field] = orderCycle[`${orderBy.value[field]}`] as SordDirectionType
  } else {
    orderBy.value = { [field]: orderCycle[`${orderBy.value[field]}`] as SordDirectionType }
  }
}

watch(
  () => data.value.length,
  () => {
    if (!props.pagination) return

    paginationData.value.totalRows = data.value.length
  },
  {
    immediate: true,
  },
)

/**
 * We are using 2 different table tag to make header sticky,
 * so it's imp to keep header cell and body cell width same
 */
const handleUpdateCellWidth = () => {
  if (!tableHeader.value || !tableHeadWidth.value) return

  ncDelay(500).then(() => [
    nextTick(() => {
      const headerCells = tableHeader.value?.querySelectorAll('th > div')

      if (headerCells && headerCells.length) {
        headerCells.forEach((el, i) => {
          headerCellWidth.value[i] = el.getBoundingClientRect().width || undefined
        })
      }
    }),
  ])
}

watch(
  [tableHeader, tableHeadWidth],
  () => {
    nextTick(() => {
      handleUpdateCellWidth()
    })
  },
  {
    immediate: true,
    flush: 'post',
  },
)

onMounted(() => {
  handleUpdateCellWidth()
})

useEventListener(tableWrapper, 'scroll', () => {
  const stickyHeaderCell = tableWrapper.value?.querySelector('th:nth-of-type(1)')
  const nonStickyHeaderFirstCell = tableWrapper.value?.querySelector('th:nth-of-type(2)')

  if (
    !stickyHeaderCell ||
    !nonStickyHeaderFirstCell ||
    !stickyHeaderCell?.getBoundingClientRect()?.right ||
    !nonStickyHeaderFirstCell?.getBoundingClientRect()?.left
  ) {
    return
  }

  if (nonStickyHeaderFirstCell?.getBoundingClientRect().left < stickyHeaderCell?.getBoundingClientRect().right) {
    tableWrapper.value?.classList.add('sticky-border')
  } else {
    tableWrapper.value?.classList.remove('sticky-border')
  }
})

const onRowClick = (record: Record<string, any>, recordIndex: number) => {
  emit('rowClick', record, recordIndex)
}

/**
 * We have to reset page if `page * pageSize` is greater than totalRows
 */
watch(
  () => paginationData.value.pageSize,
  () => {
    if (paginationData.value.page === 1) return

    if (paginationData.value.page! * paginationData.value.pageSize! > data.value.length) {
      paginationData.value.page = 1
    }
  },
)
</script>

<template>
  <div
    class="nc-table-container relative"
    :class="{
      bordered,
      'nc-disable-table-scroll': disableTableScroll,
      'min-h-120': isDataLoading,
    }"
  >
    <template v-if="$slots.tableToolbar">
      <div
        ref="tableToolbarRef"
        class="nc-table-toolbar pb-4"
        :class="[
          tableToolbarClassName,
          {
            'sticky z-5 top-0 bg-white': forceStickyHeader,
          },
        ]"
      >
        <slot name="tableToolbar" />
      </div>
    </template>

    <div
      ref="tableWrapper"
      class="nc-table-wrapper relative"
      :class="{
        'sticky-first-column': stickyFirstColumn,
        'h-full': data.length && !disableTableScroll,
        'nc-scrollbar-thin !overflow-auto max-h-full': !disableTableScroll,
      }"
      :style="{
        maxHeight: disableTableScroll ? undefined : `calc(100% - ${tableToolbarHeight + tableFooterHeight}px)`,
      }"
    >
      <table
        ref="tableHeader"
        class="w-full max-w-full"
        :class="{
          '!sticky top-0 z-5': stickyHeader && !disableTableScroll,
          '!sticky z-5': forceStickyHeader,
        }"
        :style="{
          ...(forceStickyHeader ? { top: `${tableToolbarHeight}px` } : {}),
        }"
      >
        <thead>
          <tr
            :style="{
              height: headerRowHeight,
            }"
            :class="[`${headerRowClassName}`]"
            v-bind="customHeaderRow ? customHeaderRow(columns) : {}"
          >
            <th
              v-for="(col, index) in columns"
              :key="index"
              class="nc-table-header-cell"
              :class="[
                `${headerCellClassName}`,
                `nc-table-header-cell-${index}`,
                {
                  '!hover:bg-gray-100 select-none cursor-pointer': col.showOrderBy,
                  'cursor-not-allowed': col.showOrderBy && !data?.length,
                  '!text-gray-700': col.showOrderBy && col?.dataIndex && orderBy[col.dataIndex],
                  'flex-1': !col.width && !col.basis,
                },
              ]"
              :style="{
                width: col.width ? `${col.width}px` : undefined,
                flexBasis: !col.width ? col.basis : undefined,
                maxWidth: col.width ? `${col.width}px` : undefined,
              }"
              :data-test-id="`nc-table-header-cell-${col.name || col.key}`"
              @click="col.showOrderBy && col?.dataIndex ? updateOrderBy(col.dataIndex) : undefined"
            >
              <div
                class="gap-3"
                :class="[`${col.justify || ''}`]"
                :style="{
                  padding: col.padding || '0px 24px',
                  minWidth: `calc(${col.minWidth}px - 2px)`,
                }"
              >
                <slot name="headerCell" :column="col">
                  <div>{{ col.title || col.name || '' }}</div>
                </slot>

                <template v-if="col.showOrderBy && col?.dataIndex">
                  <GeneralIcon
                    v-if="orderBy[col.dataIndex]"
                    icon="chevronDown"
                    class="flex-none"
                    :class="{
                      'transform rotate-180': orderBy[col.dataIndex] === 'asc',
                    }"
                  />
                  <GeneralIcon v-else icon="chevronUpDown" class="flex-none" />
                </template>
              </div>
            </th>
          </tr>
        </thead>
      </table>

      <template v-if="data.length">
        <table
          class="w-full h-full"
          :style="{
            maxHeight: disableTableScroll ? undefined : `calc(100% - ${tableHeadHeight}px)`,
          }"
        >
          <tbody>
            <slot name="body-prepend" />
            <tr
              v-for="(record, recordIndex) of paginatedData"
              :key="recordIndex"
              :style="{
                height: rowHeight,
              }"
              :class="[`${bodyRowClassName}`, `nc-table-row-${recordIndex}`]"
              v-bind="customRow ? customRow(record, recordIndex) : {}"
              @click="onRowClick(record, recordIndex)"
            >
              <td
                v-for="(col, colIndex) of columns"
                :key="colIndex"
                class="nc-table-cell"
                :class="[
                  `${bodyCellClassName}`,
                  `nc-table-cell-${recordIndex}`,
                  {
                    'flex-1': !col.width && !col.basis,
                  },
                ]"
                :style="{
                  width: col.width ? `${col.width}px` : undefined,
                  flexBasis: !col.width ? col.basis : undefined,
                  maxWidth: col.width ? `${col.width}px` : undefined,
                }"
                :data-test-id="`nc-table-cell-${col.name || col.key}`"
              >
                <div
                  :class="[`${col.align || 'items-center'} ${col.justify || ''}`]"
                  :style="{
                    padding: col.padding || '0px 24px',
                    minWidth: `calc(${col.minWidth}px - 2px)`,
                    maxWidth: headerCellWidth[colIndex] ? `${headerCellWidth[colIndex]}px` : undefined,
                  }"
                >
                  <slot name="bodyCell" :column="col" :record="record" :record-index="recordIndex">
                    {{ col?.dataIndex && col.key !== 'action' ? record[col.dataIndex] : '' }}
                  </slot>
                </div>
              </td>
            </tr>

            <template v-if="slots.extraRow">
              <tr class="nc-table-extra-row">
                <slot name="extraRow" />
              </tr>
            </template>
          </tbody>
        </table>
      </template>
    </div>
    <div
      v-show="isDataLoading"
      class="flex items-center justify-center absolute left-0 top-0 w-full h-full z-10 pointer-events-none"
    >
      <div class="flex flex-col justify-center items-center gap-2">
        <GeneralLoader size="xlarge" />
        <span class="text-center">{{ $t('general.loading') }}</span>
      </div>
    </div>
    <div
      v-if="!isDataLoading && !data?.length"
      class="flex-none nc-table-empty flex items-center justify-center py-8 px-6 h-full"
      :style="{
        maxHeight: `calc(100% - ${headerRowHeight} - ${tableToolbarHeight + tableFooterHeight}px)`,
      }"
    >
      <div class="flex-none text-center flex flex-col items-center gap-3">
        <slot name="emptyText">
          <a-empty :image="Empty.PRESENTED_IMAGE_SIMPLE" :description="$t('labels.noData')" class="!my-0" />
        </slot>
      </div>
    </div>
    <!-- Not scrollable footer  -->
    <template v-if="slots.tableFooter || showPagination">
      <div ref="tableFooterRef">
        <slot name="tableFooter">
          <div v-if="showPagination" class="flex flex-row justify-center items-center bg-gray-50 min-h-10">
            <div class="flex justify-between items-center w-full px-6">
              <div>&nbsp;</div>
              <NcPagination
                v-model:current="paginationData.page"
                v-model:page-size="paginationData.pageSize"
                :total="+(paginationData.totalRows || 0)"
                show-size-changer
                :use-stored-page-size="false"
              />
              <div class="text-gray-500 text-xs">
                {{ paginationData.totalRows }} {{ paginationData.totalRows === 1 ? 'row' : 'rows' }}
              </div>
            </div>
          </div>
        </slot>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.nc-table-container {
  &.bordered {
    @apply border-1 border-gray-200 rounded-lg overflow-hidden w-full;
  }

  &:not(.bordered):not(.nc-disable-table-scroll) {
    @apply overflow-hidden w-full;
  }

  .nc-table-wrapper {
    @apply w-full;

    &.sticky-first-column {
      th {
        &:first-of-type {
          @apply bg-gray-50;
        }
      }
      td {
        &:first-of-type {
          @apply bg-white;
        }
      }

      th,
      td {
        &:first-of-type {
          @apply border-r-1 border-transparent sticky left-0 z-4;
        }
      }

      &.sticky-border {
        th,
        td {
          &:first-of-type {
            @apply !border-gray-200;
          }
        }
      }
    }

    thead {
      @apply w-full max-w-full;
      th {
        @apply bg-gray-50 text-sm text-gray-500 font-weight-500;
        &.cell-title {
          @apply sticky left-0 z-4 bg-gray-50;
        }
      }
    }
    tbody {
      @apply w-full max-w-full;

      tr {
        &:not(.nc-table-extra-row) {
          @apply cursor-pointer;
        }

        td {
          @apply text-sm text-gray-600;
        }
      }
    }
    tr {
      @apply flex w-full max-w-full;

      &:not(.nc-table-extra-row) {
        @apply border-b-1 border-gray-200;
      }

      &.no-border-last:not(.nc-table-extra-row):last-child {
        @apply border-b-0;
      }

      &.selected td {
        @apply !bg-[#F0F3FF];
      }

      &:not(.selected):hover td {
        @apply !bg-gray-50;
      }

      th,
      td {
        @apply h-full flex;

        & > div {
          @apply h-full flex-1 flex items-center;
        }
      }
    }
  }
}
</style>
