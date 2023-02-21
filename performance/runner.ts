/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { format } from 'util';

import { run as simple } from './simple';

export class Profiler {
  started: Map<string, number>;
  ended: Map<string, number>;
  prefix?: string;

  constructor(opts?: { prefix?: string, started?: Map<string, number>, ended?: Map<string, number> }) {
    this.prefix = opts?.prefix || '';
    this.started = opts?.started ?? new Map();
    this.ended = opts?.ended ?? new Map();
  }

  start(key: string) {
    this.started.set(`${this.prefix}${key}`, Date.now());
  }
  end(key: string) {
    this.ended.set(`${this.prefix}${key}`, Date.now());
  }

  child(prefix: string) {
    return new Profiler({
      prefix: `${this.prefix}${prefix}`,
      started: this.started,
      ended: this.ended,
    });
  }

  async wrap(key: string, fn: (child: Profiler) => void | Promise<void>) {
    try {
      this.start(`${this.prefix}${key}`);
      await fn(this.child(`  ${this.prefix}${key}:`));
    } finally {
      this.end(`${this.prefix}${key}`);
    }
  }

  [Symbol.for('nodejs.util.inspect.custom')]() {
    const messages = [];

    for (const [key, startedAt] of this.started[Symbol.iterator]()) {
      if (this.ended.has(key)) {
        const endedAt = this.ended.get(key)!;
        messages.push(format('%dms', endedAt - startedAt, key));
        this.started.delete(key);
        this.ended.delete(key);
      }
    }

    if (Array.from(this.started.keys()).length) {
      messages.push(format('Floating start keys:', this.started));
    }
    if (Array.from(this.ended.keys()).length) {
      messages.push(format('Floating start keys:', this.ended));
    }

    return messages.join('\n');
  }
}

(async function performance() {
  console.log('Performance testing for jsonapi-resolvers\n');

  const profiler = new Profiler();

  try {

    await profiler.wrap('simple-10-2', child => simple(child, { postsCount: 10, usersCount: 2 }));
    await profiler.wrap('simple-10-10', child => simple(child, { postsCount: 10, usersCount: 10 }));
    await profiler.wrap('simple-100-10', child => simple(child, { postsCount: 100, usersCount: 10 }));
    await profiler.wrap('simple-1000-10', child => simple(child, { postsCount: 1000, usersCount: 10 }));
    await profiler.wrap('simple-1000-100', child => simple(child, { postsCount: 1000, usersCount: 100 }));

    console.log(profiler);
  } catch (err) {
    console.log(profiler);
    console.error(err);

    process.exit(1); // eslint-disable-line no-process-exit
  }
}());
