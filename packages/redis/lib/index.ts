type RedisConfiguration = import('ioredis').RedisOptions;

type RedisResultType<T> = { data: T | string | null } | { error: string };

type RedisResult<T> = {
  anchor: string;
} & RedisResultType<T>;

interface RedisProxyConfiguration {
  token: string;
  proxy?: string;
}

export class Redis {
  #proxy = 'https://proxy.zugriff.eu/api/v1/redis';
  #token: string;

  #options: RedisConfiguration;
  #client: import('ioredis').Redis;

  constructor(config: string | RedisProxyConfiguration | RedisConfiguration) {
    if (config instanceof String && typeof config == 'string') {
      this.#token = config;
      return;
    } else if (typeof config == 'object' && 'token' in config) {
      this.#proxy = config.proxy ?? this.#proxy;
      this.#token = config.token;
    } else if (typeof config == 'object' && !('token' in config)) {
      this.#options = config;
    }
  }

  async #init() {
    if (!this.#client) {
      const { Redis } = await import('ioredis');
      this.#client = new Redis(this.#options);
    }
  }

  async cmd<T>(
    cmd: string,
    ...args: Array<string | number | boolean | NonNullable<unknown>>
  ): Promise<Exclude<RedisResult<T>, { error: string }>> {
    if (this.#options) {
      await this.#init();

      try {
        const result = await this.#client.call(
          cmd,
          ...args.map((arg) => parseArgument(arg))
        );
        const parsedResult = parseResponse(result);

        return {
          anchor: 'LOCAL',
          data:
            parsedResult == undefined
              ? [
                  'mset',
                  'psetex',
                  'set',
                  'setex',
                  'json.set',
                  'json.merge',
                  'json.mset',
                  'lset',
                  'ltrim',
                  'ts.create',
                ].includes(cmd.toLowerCase())
                ? 'OK'
                : null
              : (parsedResult as T),
        };
      } catch (error) {
        if (error instanceof Error) {
          throw { anchor: 'LOCAL', error: error.toString() };
        } else {
          throw error;
        }
      }
    }

    const response = await fetch(this.#proxy, {
      method: 'POST',
      body: JSON.stringify({ cmd, args }),
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

export function parseArgument(
  arg: string | number | boolean | NonNullable<unknown>
): string | number {
  if (typeof arg == 'object' || typeof arg == 'boolean') {
    return JSON.stringify(arg);
  }

  return arg as string | number;
}

export function parseResponse(
  value: unknown
): string | number | NonNullable<unknown> | undefined {
  try {
    return JSON.parse(value as string);
  } catch (_) {
    return value;
  }
}
