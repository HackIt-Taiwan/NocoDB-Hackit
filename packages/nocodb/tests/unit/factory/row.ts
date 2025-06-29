import {
  convertMS2Duration,
  isCreatedOrLastModifiedByCol,
  isCreatedOrLastModifiedTimeCol,
  UITypes,
} from 'nocodb-sdk';
import request from 'supertest';
import { expect } from 'chai';
import Model from '../../../src/models/Model';
import NcConnectionMgrv2 from '../../../src/utils/common/NcConnectionMgrv2';
import type { ColumnType, NcApiVersion } from 'nocodb-sdk';
import type Column from '../../../src/models/Column';
import type Filter from '../../../src/models/Filter';
import type { Base, Sort, View } from '../../../src/models';

const rowValue = (column: ColumnType, index: number) => {
  switch (column.uidt) {
    case UITypes.Number:
      return index;
    case UITypes.SingleLineText:
      return `test-${index}`;
    case UITypes.Date:
      return '2020-01-01';
    case UITypes.DateTime:
      return '2020-01-01 00:00:00';
    case UITypes.Email:
      return `test-${index}@example.com`;
    default:
      return `test-${index}`;
  }
};

const _rowMixedValue = (column: ColumnType, index: number) => {
  // Array of country names
  const countries = [
    'Afghanistan',
    'Albania',
    '',
    'Andorra',
    'Angola',
    'Antigua and Barbuda',
    'Argentina',
    null,
    'Armenia',
    'Australia',
    'Austria',
    '',
    null,
  ];

  // Array of sample random paragraphs (comma separated list of cities and countries). Not more than 200 characters
  const longText = [
    'Aberdeen, United Kingdom',
    'Abidjan, Côte d’Ivoire',
    'Abuja, Nigeria',
    '',
    'Addis Ababa, Ethiopia',
    'Adelaide, Australia',
    'Ahmedabad, India',
    'Albuquerque, United States',
    null,
    'Alexandria, Egypt',
    'Algiers, Algeria',
    'Allahabad, India',
    '',
    null,
  ];

  // Array of random integers, not more than 10000
  const numbers = [33, null, 456, 333, 267, 34, 8754, 3234, 44, 33, null];
  const decimals = [
    33.3,
    456.34,
    333.3,
    null,
    267.5674,
    34.0,
    8754.0,
    3234.547,
    44.2647,
    33.98,
    null,
  ];
  const duration = [
    10 * 60,
    20 * 60,
    30 * 60,
    40 * 60,
    50 * 60,
    60 * 60,
    null,
    70 * 60,
    80 * 60,
    90 * 60,
    null,
  ];
  const rating = [0, 1, 2, 3, null, 0, 4, 5, 0, 1, null];
  const year = [
    1000,
    1500,
    2000,
    3000,
    null,
    2022,
    2024,
    2025,
    1980,
    1909,
    null,
  ];

  // Array of random sample email strings (not more than 100 characters)
  const emails = [
    'jbutt@gmail.com',
    'josephine_darakjy@darakjy.org',
    'art@venere.org',
    '',
    null,
    'donette.foller@cox.net',
    'simona@morasca.com',
    'mitsue_tollner@yahoo.com',
    'leota@hotmail.com',
    'sage_wieser@cox.net',
    '',
    null,
  ];

  // Array of random sample phone numbers
  const phoneNumbers = [
    '1-541-754-3010',
    '504-621-8927',
    '810-292-9388',
    '856-636-8749',
    '907-385-4412',
    '513-570-1893',
    '419-503-2484',
    '773-573-6914',
    '',
    null,
  ];

  // Array of random sample URLs
  const urls = [
    'https://www.google.com',
    'https://www.facebook.com',
    'https://www.youtube.com',
    'https://www.amazon.com',
    'https://www.wikipedia.org',
    'https://www.twitter.com',
    'https://www.instagram.com',
    'https://www.linkedin.com',
    'https://www.reddit.com',
    'https://www.tiktok.com',
    'https://www.pinterest.com',
    'https://www.netflix.com',
    'https://www.microsoft.com',
    'https://www.apple.com',
    '',
    null,
  ];

  const singleSelect = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
    null,
  ];

  const multiSelect = [
    'jan,feb,mar',
    'apr,may,jun',
    'jul,aug,sep',
    'oct,nov,dec',
    'jan,feb,mar',
    null,
  ];

  switch (column.uidt) {
    case UITypes.Number:
    case UITypes.Percent:
      return numbers[index % numbers.length];
    case UITypes.Decimal:
    case UITypes.Currency:
      return decimals[index % decimals.length];
    case UITypes.Duration:
      return duration[index % duration.length];
    case UITypes.Rating:
      return rating[index % rating.length];
    case UITypes.Year:
      return year[index % year.length];
    case UITypes.SingleLineText:
      return countries[index % countries.length];
    case UITypes.Email:
      return emails[index % emails.length];
    case UITypes.PhoneNumber:
      return phoneNumbers[index % phoneNumbers.length];
    case UITypes.LongText:
      return longText[index % longText.length];
    case UITypes.Date:
      // set startDate as 400 days before today
      // eslint-disable-next-line no-case-declarations
      const d1 = new Date();
      d1.setDate(d1.getDate() - 400 + index);
      return d1.toISOString().slice(0, 10);
    case UITypes.DateTime:
      // set startDate as 400 days before today
      // eslint-disable-next-line no-case-declarations
      const d2 = new Date();
      d2.setDate(d2.getDate() - 400 + index);
      // set time to 12:00:00
      d2.setHours(12, 0, 0, 0);
      return d2.toISOString();
    case UITypes.URL:
      return urls[index % urls.length];
    case UITypes.SingleSelect:
      return singleSelect[index % singleSelect.length];
    case UITypes.MultiSelect:
      return multiSelect[index % multiSelect.length];
    default:
      return `test-${index}`;
  }
};

const rowMixedValue = (
  column: ColumnType,
  index: number,
  isV3: boolean = false,
) => {
  const val = _rowMixedValue(column, index);
  if (isV3) {
    if (column.uidt === UITypes.MultiSelect) {
      return val ? (val as string).split(',') : val;
    }
  }
  if (column.uidt === UITypes.Duration && !isV3) {
    return val ? convertMS2Duration(val, 0) : val;
  }
  return val;
};

const getRow = async (context, { base, table, id }) => {
  const response = await request(context.app)
    .get(`/api/v1/db/data/noco/${base.id}/${table.id}/${id}`)
    .set('xc-auth', context.token);

  if (response.status !== 200) {
    return undefined;
  }

  return response.body;
};

const listRow = async ({
  base,
  table,
  options,
  view,
}: {
  base: Base;
  table: Model;
  view?: View;
  options?: {
    limit?: any;
    offset?: any;
    filterArr?: Filter[];
    sortArr?: Sort[];
    apiVersion?: NcApiVersion;
  };
}) => {
  const ctx = {
    workspace_id: base.fk_workspace_id,
    base_id: base.id,
  };

  const sources = await base.getSources();
  const baseModel = await Model.getBaseModelSQL(ctx, {
    id: table.id,
    dbDriver: await NcConnectionMgrv2.get(sources[0]!),
    viewId: view?.id,
  });

  const ignorePagination = !options;

  return await baseModel.list(options, { ignorePagination });
};

const countRows = async ({
  base,
  table,
  options,
  view,
}: {
  base: Base;
  table: Model;
  view?: View;
  options?: {
    limit?: any;
    offset?: any;
    filterArr?: Filter[];
    sortArr?: Sort[];
    apiVersion?: NcApiVersion;
  };
}) => {
  const ctx = {
    workspace_id: base.fk_workspace_id,
    base_id: base.id,
  };

  const sources = await base.getSources();
  const baseModel = await Model.getBaseModelSQL(ctx, {
    id: table.id,
    dbDriver: await NcConnectionMgrv2.get(sources[0]!),
    viewId: view?.id,
  });

  return await baseModel.count(options);
};

const getOneRow = async (
  context,
  { base, table }: { base: Base; table: Model },
) => {
  const response = await request(context.app)
    .get(`/api/v1/db/data/noco/${base.id}/${table.id}/find-one`)
    .set('xc-auth', context.token);

  return response.body;
};

const generateDefaultRowAttributes = ({
  columns,
  index = 0,
}: {
  columns: ColumnType[];
  index?: number;
}) =>
  columns.reduce((acc, column) => {
    if (
      column.uidt === UITypes.LinkToAnotherRecord ||
      column.uidt === UITypes.ForeignKey ||
      column.uidt === UITypes.ID ||
      column.uidt === UITypes.Order ||
      isCreatedOrLastModifiedTimeCol(column) ||
      isCreatedOrLastModifiedByCol(column)
    ) {
      return acc;
    }
    acc[column.title!] = rowValue(column, index);
    return acc;
  }, {});

const createRow = async (
  context,
  {
    base,
    table,
    index = 0,
  }: {
    base: Base;
    table: Model;
    index?: number;
  },
) => {
  const ctx = {
    workspace_id: base.fk_workspace_id,
    base_id: base.id,
  };

  const columns = await table.getColumns(ctx);
  const rowData = generateDefaultRowAttributes({ columns, index });

  const response = await request(context.app)
    .post(`/api/v1/db/data/noco/${base.id}/${table.id}`)
    .set('xc-auth', context.token)
    .send(rowData);

  return response.body;
};

const createBulkRows = async (
  context,
  {
    base,
    table,
    values,
  }: {
    base: Base;
    table: Model;
    values: any[];
  },
) => {
  const res = await request(context.app)
    .post(`/api/v1/db/data/bulk/noco/${base.id}/${table.id}`)
    .set('xc-auth', context.token)
    .send(values)
    .expect(200);
};

const createBulkRowsV3 = async (
  context,
  {
    base,
    table,
    values,
  }: {
    base: Base;
    table: Model;
    values: any[];
  },
) => {
  // Transform values to v3 format with fields wrapper
  const v3Values = values.map((value) => ({ fields: value }));

  // V3 API has a limit of 10 records per insert, so chunk the data
  const chunkSize = 10;
  const chunks: Array<Array<{ fields: any }>> = [];
  for (let i = 0; i < v3Values.length; i += chunkSize) {
    chunks.push(v3Values.slice(i, i + chunkSize));
  }

  // Insert chunks sequentially
  for (const chunk of chunks) {
    const res = await request(context.app)
      .post(`/api/v3/data/${base.id}/${table.id}/records`)
      .set('xc-auth', context.token)
      .send(chunk);
    
    expect(res.status).to.equal(200);
  }
};

// Links 2 table rows together. Will create rows if ids are not provided
const createChildRow = async (
  context,
  {
    base,
    table,
    childTable,
    column,
    rowId,
    childRowId,
    type,
  }: {
    base: Base;
    table: Model;
    childTable: Model;
    column: Column;
    rowId?: string;
    childRowId?: string;
    type: string;
  },
) => {
  if (!rowId) {
    const row = await createRow(context, { base, table });
    rowId = row['Id'];
  }

  if (!childRowId) {
    const row = await createRow(context, { table: childTable, base });
    childRowId = row['Id'];
  }

  await request(context.app)
    .post(
      `/api/v1/db/data/noco/${base.id}/${table.id}/${rowId}/${type}/${column.title}/${childRowId}`,
    )
    .set('xc-auth', context.token);

  const row = await getRow(context, { base, table, id: rowId });

  return row;
};

// Mixed row attributes
const generateMixedRowAttributes = ({
  columns,
  index = 0,
  isV3 = false,
}: {
  columns: ColumnType[];
  index?: number;
  isV3?: boolean;
}) =>
  columns.reduce((acc, column) => {
    if (
      column.uidt === UITypes.LinkToAnotherRecord ||
      column.uidt === UITypes.ForeignKey ||
      column.uidt === UITypes.ID
    ) {
      return acc;
    }
    acc[column.title!] = rowMixedValue(column, index);
    return acc;
  }, {});

export {
  createRow,
  getRow,
  createChildRow,
  getOneRow,
  listRow,
  generateDefaultRowAttributes,
  generateMixedRowAttributes,
  createBulkRows,
  createBulkRowsV3,
  rowMixedValue,
  countRows,
};
