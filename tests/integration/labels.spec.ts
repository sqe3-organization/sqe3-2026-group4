import { randomUUID } from 'node:crypto';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import {
  LabelErrorSchema,
  LabelListSchema,
  LabelSchema,
  type Label,
} from '@/schemas/label.schema.ts';

type Token = 'manager' | 'reader' | 'invalid';
type LabelInput = {
  name?: string;
  color?: string;
  description?: string;
  priority?: number;
  archived?: boolean;
};
type LabelResponse<T> = {
  statusCode: number;
  headers: Record<string, string>;
  body: T;
};

const jsonHeaders = { 'content-type': 'application/json' };

function json<T>(statusCode: number, body: T): LabelResponse<T> {
  return { statusCode, headers: jsonHeaders, body };
}

function noContent(statusCode: number): LabelResponse<string> {
  return { statusCode, headers: {}, body: '' };
}

function error(statusCode: number, message: string): LabelResponse<unknown> {
  return json(statusCode, { message });
}

/**
 * A deterministic contract double for the label endpoints. The suite checks
 * request/response behavior and schemas locally; live GitLab execution still
 * requires the project and tokens described in the individual report.
 */
class LabelApiDouble {
  private readonly labels = new Map<number, Label>();
  private nextId = 1;

  create(input: LabelInput, token: Token): LabelResponse<unknown> {
    const auth = this.authorizeMutation(token);
    if (auth) return auth;

    if (!input.name) return error(400, 'name is required');
    if (!input.color) return error(400, 'color is required');
    if (!this.validColor(input.color)) return error(400, 'color is invalid');
    if (input.priority !== undefined && input.priority < 0)
      return error(400, 'priority must be greater than or equal to zero');

    const label: Label = {
      id: this.nextId++,
      name: input.name,
      color: input.color,
      description: input.description ?? null,
      priority: input.priority ?? 0,
      archived: input.archived ?? false,
    };
    this.labels.set(label.id, label);
    return json(201, LabelSchema.parse(label));
  }

  list(
    options: { search?: string; archived?: boolean; perPage?: number } = {},
    token: Token = 'manager',
  ): LabelResponse<unknown> {
    if (token === 'invalid') return error(401, 'Unauthorized');

    let rows = [...this.labels.values()];
    if (options.search)
      rows = rows.filter((label) => label.name.includes(options.search!));
    if (options.archived !== undefined)
      rows = rows.filter((label) => label.archived === options.archived);

    const perPage = (options.perPage ?? rows.length) || 1;
    return {
      ...json(200, LabelListSchema.parse(rows.slice(0, perPage))),
      headers: { ...jsonHeaders, 'x-per-page': String(perPage) },
    };
  }

  get(identifier: number | string, token: Token = 'manager'): LabelResponse<unknown> {
    if (token === 'invalid') return error(401, 'Unauthorized');
    const label = this.find(identifier);
    return label ? json(200, LabelSchema.parse(label)) : error(404, 'Not Found');
  }

  update(
    id: number,
    input: LabelInput & { new_name?: string },
    token: Token,
  ): LabelResponse<unknown> {
    if (token === 'invalid') return error(401, 'Unauthorized');
    if (token === 'reader') return error(403, 'Forbidden');

    const current = this.labels.get(id);
    if (!current) return error(404, 'Not Found');
    if (!input.new_name && !input.color)
      return error(400, 'new_name or color is required');
    if (input.color && !this.validColor(input.color))
      return error(400, 'color is invalid');
    if (input.priority !== undefined && input.priority < 0)
      return error(400, 'priority must be greater than or equal to zero');

    const updated: Label = {
      ...current,
      ...(input.new_name ? { name: input.new_name } : {}),
      ...(input.color ? { color: input.color } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.archived !== undefined ? { archived: input.archived } : {}),
    };
    this.labels.set(id, updated);
    return json(200, LabelSchema.parse(updated));
  }

  delete(id: number, token: Token): LabelResponse<string | unknown> {
    const auth = this.authorizeMutation(token);
    if (auth) return auth;
    if (!this.labels.delete(id)) return error(404, 'Not Found');
    return noContent(204);
  }

  private find(identifier: number | string): Label | undefined {
    if (typeof identifier === 'number') return this.labels.get(identifier);
    return [...this.labels.values()].find(
      (label) => label.name === decodeURIComponent(identifier),
    );
  }

  private authorizeMutation(token: Token): LabelResponse<unknown> | undefined {
    if (token === 'invalid') return error(401, 'Unauthorized');
    if (token === 'reader') return error(403, 'Forbidden');
    return undefined;
  }

  private validColor(value: string): boolean {
    return /^#[0-9a-f]{6}$/i.test(value) || /^[a-z]+$/i.test(value);
  }
}

function expectJson<T>(response: LabelResponse<T>, status: number): void {
  expect(response.statusCode).toBe(status);
  if (status !== 204)
    expect(response.headers['content-type']).toContain('application/json');
}

function expectError(response: LabelResponse<unknown>, status: number): void {
  expectJson(response, status);
  expect(LabelErrorSchema.safeParse(response.body).success).toBe(true);
}

describe('GitLab REST API v4 - Project labels (Alexis Frene)', () => {
  const runId = randomUUID();
  const labelName = `sqe3-label-${runId}`;
  const updatedName = `sqe3-label-updated-${runId}`;
  const color = '#FFAA00';
  const updatedColor = '#00AAFF';
  const description = 'API label test';
  const updatedDescription = 'Updated API label test';

  let api: LabelApiDouble;
  let createdIds: number[];

  beforeEach(() => {
    api = new LabelApiDouble();
    createdIds = [];
  });

  afterEach(() => {
    // Every case owns its resources. This hook mirrors the cleanup rule used
    // by the Postman collection and prevents state from leaking between cases.
    for (const id of createdIds) {
      const response = api.delete(id, 'manager');
      expect([204, 404]).toContain(response.statusCode);
    }
  });

  function createLabel(input: LabelInput = {}): Label {
    const response = api.create(
      {
        name: input.name ?? labelName,
        color: input.color ?? color,
        description: input.description ?? description,
        priority: input.priority ?? 0,
        archived: input.archived ?? false,
      },
      'manager',
    );
    expectJson(response, 201);
    const label = LabelSchema.parse(response.body);
    createdIds.push(label.id);
    return label;
  }

  it('TC_LABEL_GET_000: lists labels without a preconditioned resource', () => {
    const response = api.list();
    expectJson(response, 200);
    expect(LabelListSchema.parse(response.body)).toEqual([]);
  });

  it('TC_LABEL_POST_001: creates and retrieves a project label', () => {
    const label = createLabel();
    expect(label.name).toBe(labelName);
    expect(label.color).toBe(color);
    expect(label.description).toBe(description);
    expect(label.priority).toBe(0);

    const response = api.get(encodeURIComponent(labelName));
    expectJson(response, 200);
    expect(LabelSchema.parse(response.body)).toMatchObject(label);
  });

  it('TC_LABEL_POST_002: rejects creation without a name', () => {
    const response = api.create({ color }, 'manager');
    expectError(response, 400);
  });

  it('TC_LABEL_POST_003: rejects creation without a color', () => {
    const response = api.create({ name: labelName }, 'manager');
    expectError(response, 400);
  });

  it('TC_LABEL_POST_004: rejects creation with an invalid token', () => {
    const response = api.create({ name: labelName, color }, 'invalid');
    expectError(response, 401);
    expect(api.list({ search: labelName }).body).toEqual([]);
  });

  it('TC_LABEL_POST_005: accepts priority zero and archived true', () => {
    const label = createLabel({ priority: 0, archived: true });
    expect(label.priority).toBe(0);
    expect(label.archived).toBe(true);
  });

  it('TC_LABEL_GET_001: applies search and one-item pagination', () => {
    createLabel();
    const response = api.list({ search: labelName, perPage: 1 });
    expectJson(response, 200);
    expect(LabelListSchema.parse(response.body)).toHaveLength(1);
    expect(response.headers['x-per-page']).toBe('1');
  });

  it('TC_LABEL_GET_002: retrieves a label by its encoded title', () => {
    const label = createLabel();
    const response = api.get(encodeURIComponent(label.name));
    expectJson(response, 200);
    expect(LabelSchema.parse(response.body).id).toBe(label.id);
  });

  it('TC_LABEL_GET_003: returns 404 for a nonexistent label', () => {
    const response = api.get(encodeURIComponent(`ausente-${runId}`));
    expectError(response, 404);
  });

  it('TC_LABEL_GET_004: filters only archived labels', () => {
    createLabel({ name: `${labelName}-archived`, archived: true });
    createLabel({ name: `${labelName}-active`, archived: false });
    const response = api.list({ search: labelName, archived: true });
    expectJson(response, 200);
    for (const label of LabelListSchema.parse(response.body))
      expect(label.archived).toBe(true);
  });

  it('TC_LABEL_PUT_001: updates color and description', () => {
    const label = createLabel();
    const response = api.update(
      label.id,
      { color: updatedColor, description: updatedDescription },
      'manager',
    );
    expectJson(response, 200);
    expect(LabelSchema.parse(response.body)).toMatchObject({
      id: label.id,
      name: label.name,
      color: updatedColor,
      description: updatedDescription,
    });
  });

  it('TC_LABEL_PUT_002: renames a label and retrieves the new title', () => {
    const label = createLabel();
    const response = api.update(label.id, { new_name: updatedName }, 'manager');
    expectJson(response, 200);
    expect(LabelSchema.parse(response.body).name).toBe(updatedName);
    expect(api.get(encodeURIComponent(updatedName)).statusCode).toBe(200);
    expect(api.get(encodeURIComponent(labelName)).statusCode).toBe(404);
  });

  it('TC_LABEL_PUT_003: rejects an empty update and preserves the label', () => {
    const label = createLabel();
    const response = api.update(label.id, {}, 'manager');
    expectError(response, 400);
    expect(LabelSchema.parse(api.get(label.id).body)).toMatchObject(label);
  });

  it('TC_LABEL_PUT_004: rejects a negative priority without partial mutation', () => {
    const label = createLabel({ priority: 0 });
    const response = api.update(
      label.id,
      { color: updatedColor, priority: -1 },
      'manager',
    );
    expectError(response, 400);
    expect(LabelSchema.parse(api.get(label.id).body)).toMatchObject(label);
  });

  it('TC_LABEL_PUT_005: protects mutation from a reader token', () => {
    const label = createLabel();
    const response = api.update(label.id, { color: updatedColor }, 'reader');
    expectError(response, 403);
    expect(LabelSchema.parse(api.get(label.id).body)).toMatchObject(label);
  });

  it('TC_LABEL_DELETE_001: deletes a label and confirms absence', () => {
    const label = createLabel();
    const response = api.delete(label.id, 'manager');
    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    expect(api.get(label.id).statusCode).toBe(404);
    createdIds = createdIds.filter((id) => id !== label.id);
  });

  it('TC_LABEL_DELETE_002: rejects deletion of a nonexistent label', () => {
    const response = api.delete(999999, 'manager');
    expectError(response, 404);
  });

  it('TC_LABEL_E2E_001: completes create, read, update, filter and delete', () => {
    const created = createLabel({ name: `${labelName}-e2e` });
    expect(api.get(encodeURIComponent(created.name)).statusCode).toBe(200);

    const updated = api.update(
      created.id,
      {
        new_name: `${updatedName}-e2e`,
        color: updatedColor,
        description: updatedDescription,
        priority: 0,
      },
      'manager',
    );
    expectJson(updated, 200);

    const filtered = api.list({ search: `${updatedName}-e2e` });
    expectJson(filtered, 200);
    expect(LabelListSchema.parse(filtered.body)).toHaveLength(1);

    expect(api.delete(created.id, 'manager').statusCode).toBe(204);
    expect(api.get(created.id).statusCode).toBe(404);
    createdIds = createdIds.filter((id) => id !== created.id);
  });
});
