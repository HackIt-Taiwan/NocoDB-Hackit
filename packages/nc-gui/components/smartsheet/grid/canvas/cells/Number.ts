import { parseIntValue } from 'nocodb-sdk'
import { renderSingleLineText, renderTagLabel } from '../utils/canvas'

export const FloatCellRenderer: CellRenderer = {
  render: (ctx, props) => {
    const { value, x, y, width, height, pv, padding, textColor = '#4a5268', column } = props

    const numericValue = parseIntValue(value, column)
    if (!isValidValue(numericValue)) {
      return {
        x,
        y,
      }
    }
    const text = numericValue.toString()

    if (props.tag?.renderAsTag) {
      return renderTagLabel(ctx, { ...props, text })
    } else {
      const { x: xOffset, y: yOffset } = renderSingleLineText(ctx, {
        x: x + width - padding,
        y,
        textAlign: 'right',
        text,
        maxWidth: width - padding * 2,
        fontFamily: `${pv ? 600 : 500} 13px Inter`,
        fillStyle: pv ? '#3366FF' : textColor,
        height,
      })

      return {
        x: xOffset,
        y: yOffset,
      }
    }
  },
  async handleKeyDown(ctx) {
    const { e, row, column, makeCellEditable } = ctx
    if (column.readonly || column.columnObj?.readonly) return
    const columnObj = column.columnObj

    if (/^[0-9]$/.test(e.key) && columnObj.title) {
      row.row[columnObj.title] = ''
      makeCellEditable(row, column)
      return true
    }

    return false
  },
}
