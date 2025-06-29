import type { Editor } from '@tiptap/vue-3'

// refer - https://stackoverflow.com/a/11752084
export const isMac = () => /Mac/i.test(navigator.platform)
export const isDrawerExist = () => document.querySelector('.ant-drawer-open')
export const isLinkDropdownExist = () => document.querySelector('.nc-links-dropdown.active')
export const isDrawerOrModalExist = () => document.querySelector('.ant-modal.active, .ant-drawer-open')
export const isExpandedFormOpenExist = () => document.querySelector('.nc-drawer-expanded-form.active')
export const isNestedExpandedFormOpenExist = () => document.querySelectorAll('.nc-drawer-expanded-form.active')?.length > 1
export const isExpandedCellInputExist = () => document.querySelector('.expanded-cell-input')
export const isExtensionPaneActive = () => document.querySelector('.nc-extension-pane')
export const isGeneralOverlayActive = () => document.querySelector('.nc-general-overlay')
export const isSelectActive = () => document.querySelector('.ant-select-dropdown')
export const isViewSearchActive = () => document.querySelector('.nc-view-search-data') === document.activeElement
export const isCreateViewActive = () => document.querySelector('.nc-view-create-modal')
export const isActiveElementInsideExtension = () =>
  ['.extension-modal', '.nc-extension-pane', '.nc-modal-extension-market', '.nc-modal-share-collaborate'].some((selector) =>
    document.querySelector(selector)?.contains(document.activeElement),
  )
export const isTiptapDropdownExistInsideEditor = () => {
  return document.querySelector('.tippy-box')
}

export const isSidebarNodeRenameActive = () => document.querySelector('input.animate-sidebar-node-input-padding')
export function hasAncestorWithClass(element: HTMLElement, className: string | Array<string>): boolean {
  const classNames = ncIsArray(className) ? className : [className]

  return classNames.some((c) => !!element.closest(`.${c}`))
}
export const cmdKActive = () => document.querySelector('.cmdk-modal-active')
export const isCmdJActive = () => document.querySelector('.DocSearch--active')
export const isActiveInputElementExist = (e?: Event) => {
  const activeElement = document.activeElement
  const target = e?.target

  // A rich text editor is a div with the contenteditable attribute set to true.
  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    (activeElement instanceof HTMLElement && activeElement.isContentEditable) ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}
export const isActiveButtonOrLinkElementExist = (e?: Event) => {
  const activeElement = document.activeElement
  const target = e?.target

  // A rich text editor is a div with the contenteditable attribute set to true.
  return (
    activeElement instanceof HTMLButtonElement ||
    activeElement instanceof HTMLAnchorElement ||
    target instanceof HTMLButtonElement ||
    target instanceof HTMLAnchorElement
  )
}

export const isNcDropdownOpen = () => document.querySelector('.nc-dropdown.active')
export const isDropdownActive = () => document.querySelector('.nc-dropdown')

export const isFieldEditOrAddDropdownOpen = () => document.querySelector('.nc-dropdown-edit-column.active')
export const getScrollbarWidth = () => {
  const outer = document.createElement('div')
  outer.style.visibility = 'hidden'
  outer.style.width = '100px'
  document.body.appendChild(outer)

  const widthNoScroll = outer.offsetWidth
  outer.style.overflow = 'scroll'

  const inner = document.createElement('div')
  inner.style.width = '100%'
  outer.appendChild(inner)

  const widthWithScroll = inner.offsetWidth
  outer?.parentNode?.removeChild(outer)
  return widthNoScroll - widthWithScroll
}

export function getElementAtMouse<T>(cssSelector: string, { clientX, clientY }: { clientX: number; clientY: number }) {
  return document.elementsFromPoint(clientX, clientY).find((el) => el.matches(cssSelector)) as T | undefined
}

export function forcedNextTick(cb: () => void) {
  // See https://github.com/vuejs/vue/issues/9200
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      cb()
    })
  })
}

export function isSinglePrintableKey(key: string) {
  // handles other languages as well which key.length === 1 might not
  return [...key].length === 1
}

export const isMousePointerType = (event: Event) => {
  return event instanceof PointerEvent && event?.pointerType === 'mouse'
}

export const isTouchEvent = (event: Event | TouchEvent) => !isMousePointerType(event)

export const focusInputEl = (querySelector: string, target?: HTMLElement) => {
  if (typeof window === 'undefined') return

  querySelector = querySelector ? `${querySelector} ` : ''

  const targetEl = target || document
  const inputEl =
    (targetEl.querySelector(`${querySelector}input`) as HTMLInputElement) ||
    (targetEl.querySelector(`${querySelector}textarea`) as HTMLTextAreaElement) ||
    (targetEl.querySelector(`${querySelector}[contenteditable="true"]`) as HTMLElement) ||
    (targetEl.querySelector(`${querySelector}[tabindex="0"]`) as HTMLElement)

  if (inputEl) {
    inputEl?.select?.()
    inputEl?.focus?.()
  }

  return inputEl
}

export const isExpandCellKey = (event: Event) => {
  if (event instanceof KeyboardEvent) {
    return event.key === ' ' && event.shiftKey
  }

  return false
}

/**
 * Check if an element is line-clamped
 *
 * **Note:**
 * The `Range#getBoundingClientRect()` technique works best when text is not deeply nested.
 * This technique has performance overhead — avoid using it on large lists.
 *
 * @param el - The element to check
 * @returns True if the element is line-clamped, false otherwise
 */
export const isLineClamped = (el: HTMLElement): boolean => {
  if (!el) return false

  const range = document.createRange()
  range.selectNodeContents(el)

  const fullHeight = range.getBoundingClientRect().height
  const actualHeight = el.getBoundingClientRect().height

  return fullHeight > actualHeight
}

export const handleOnEscRichTextEditor = (event: KeyboardEvent, editor?: Editor) => {
  if (isTiptapDropdownExistInsideEditor()) {
    event.stopPropagation()

    if (editor && !editor.state.selection.empty) {
      const pos = editor.state.selection.to
      editor.commands.setTextSelection(pos)
      editor.commands.focus()
    }
  }
}

export const estimateTagWidth = ({
  text,
  fontSize = 14,
  fontWeight = 600,
  paddingX = 16, // left + right padding
  iconWidth = 0, // icon width (if you have icon)
  border = 2,
}: {
  text: string
  fontSize?: number
  fontWeight?: number
  paddingX?: number
  iconWidth?: number
  border?: number
}) => {
  // Dummy average char width per font-weight/font-size
  const avgCharWidth = fontWeight >= 600 ? fontSize * 0.6 : fontSize * 0.5

  const textWidth = text.length * avgCharWidth

  const totalWidth = textWidth + paddingX + iconWidth + border

  return totalWidth
}
