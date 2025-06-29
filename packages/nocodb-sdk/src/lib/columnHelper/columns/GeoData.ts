import { SilentTypeConversionError } from '~/lib/error';
import { convertGeoNumberToString } from '~/lib/geoDataUtils';
import { ncIsNaN, ncIsString } from '~/lib/is';
import AbstractColumnHelper, {
  SerializerOrParserFnProps,
} from '../column.interface';

export class GeoDataHelper extends AbstractColumnHelper {
  columnDefaultMeta = {};

  serializeValue(
    value: any,
    params: SerializerOrParserFnProps['params']
  ): string | null {
    value = this.parseValue(value);

    if (!params.serializeSearchQuery && value === null) {
      throw new SilentTypeConversionError();
    }

    return value;
  }

  parseValue(value: any): string | null {
    if (!ncIsString(value)) return null;

    const geoValue = value
      .replace(',', ';')
      .split(';')
      .map((k) => k.trim());

    if (geoValue.length === 2) {
      if (!ncIsNaN(geoValue[0]) && !ncIsNaN(geoValue[1])) {
        return geoValue
          .map((k) => convertGeoNumberToString(Number(k)))
          .join(';');
      }
    }

    return null;
  }

  parsePlainCellValue(value: any): string {
    return this.parseValue(value) ?? '';
  }
}
