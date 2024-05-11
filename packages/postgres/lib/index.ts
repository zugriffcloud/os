export type PostgresType =
  | string
  | number
  | boolean
  | Array<PostgresType>
  | NonNullable<unknown>;

type PostgresConfiguration = import('postgres').Options<NonNullable<unknown>>;

interface PostgresProxyConfiguration {
  token: string;
  proxy?: string;
}

type PostgresResultType<T> = { data: T[] } | { error: string };

type PostgresResult<T> = {
  anchor: string;
} & PostgresResultType<T>;

export class Postgres {
  #proxy = 'https://proxy.zugriff.eu/api/v1/postgres';
  #token: string;

  #options: PostgresConfiguration;
  #client: import('postgres').Sql;

  constructor(
    config: string | PostgresProxyConfiguration | PostgresConfiguration
  ) {
    if (config instanceof String && typeof config == 'string') {
      this.#token = config;
      return;
    } else if (typeof config == 'object' && 'host' in config) {
      this.#options = config;
    } else if (typeof config == 'object' && 'token' in config) {
      this.#proxy = config.proxy ?? this.#proxy;
      this.#token = config.token;
    }
  }

  async #init() {
    if (!this.#client) {
      const { default: postgres } = (await import('postgres')) as unknown as {
        default: typeof import('postgres');
      };
      this.#client = postgres(this.#options);
    }
  }

  async execute(
    query: TemplateStringsArray,
    ...parameters: PostgresType[]
  ): Promise<Exclude<PostgresResult<null>, { error: string }>> {
    if (this.#options) {
      await this.#init();
      try {
        await this.#client(
          query,
          ...(parameters as import('postgres').ParameterOrFragment<never>[])
        );
      } catch (error) {
        if (error instanceof Error) {
          throw { anchor: 'LOCAL', error: error.toString() };
        } else {
          throw error;
        }
      }

      return { anchor: 'LOCAL', data: [] };
    }

    const response = await fetch(this.#proxy, {
      body: JSON.stringify({ ...parseQuery(query, parameters), execute: true }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.#token,
      },
    });

    const body = await response.json();

    if ('error' in body) throw body;

    return { anchor: body.anchor, data: body.success };
  }

  async query<T>(
    query: TemplateStringsArray,
    ...parameters: PostgresType[]
  ): Promise<Exclude<PostgresResult<T>, { error: string }>> {
    if (this.#options) {
      await this.#init();
      const clonedQuery = query.map((part) => part);
      clonedQuery[0] = 'WITH result AS (' + clonedQuery[0];
      clonedQuery[clonedQuery.length - 1] =
        clonedQuery[clonedQuery.length - 1] +
        ') SELECT json_agg(result) AS result FROM result';

      const { query: parsedQuery, params: parsedParameters } = parseQuery(
        clonedQuery,
        parameters,
        true
      );

      try {
        const result = await this.#client.unsafe(
          parsedQuery,
          parsedParameters.map((e) =>
            toPgText(e)
          ) as import('postgres').ParameterOrJSON<never>[],
          { prepare: true }
        );

        return {
          anchor: 'LOCAL',
          data: result[0]['result'],
        };
      } catch (error) {
        if (error instanceof Error) {
          throw { anchor: 'LOCAL', error: error.toString() };
        } else {
          throw error;
        }
      }
    }

    const { query: parsedQuery, params: parsedParameters } = parseQuery(
      query,
      parameters
    );

    const response = await fetch(this.#proxy, {
      body: JSON.stringify({ query: parsedQuery, params: parsedParameters }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.#token,
      },
    });

    const body = await response.json();

    if ('error' in body) throw body;

    return { anchor: body.anchor, data: body.success };
  }
}

export function toPgText(
  value: unknown
): string | number | boolean | bigint | Date {
  if (Array.isArray(value)) {
    return '{' + value.map((e) => toPgText(e)).join(',') + '}';
  }

  if (typeof value == 'object') {
    return JSON.stringify(value);
  }

  return value.toString();
}

export function parseQuery(
  query: ArrayLike<string>,
  parameters: PostgresType[],
  coerce = false
): { query: string; params: PostgresType[] } {
  let temp: string = '';

  let i = 0;

  for (const part in query) {
    if (temp.length !== 0) temp += '$' + i + (coerce ? '::TEXT' : '');
    temp += query[part];
    i += 1;
  }

  return { query: temp, params: parameters };
}
