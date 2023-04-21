/**
 * Zero-dependency assertion
 *
 * @param {*} value Falsey check
 * @param {Error} err An error to throw
 * @param {Object<string, string | number | boolean>} add Optional object to merge with `err`
 */
function assert(value, err, add = undefined) {
  if (!value) {
    if (add) {
      Object.assign(err, add);
    }

    throw err;
  }
}

/**
 * Check if this is a plain object
 */
function isPlainObject(input) {
  return Object.prototype.toString.call(input) === '[object Object]';
}

async function promiseAllSettled(input) {
  const { values, errors } = (await Promise.allSettled(input)).reduce((list, result) => {
    list[result.status === 'fulfilled' ? 'values' : 'errors']
      .push(result.status === 'fulfilled' ? result.value : result.reason);
    return list;
  }, {
    values: [],
    errors: [],
  });

  assert(errors.length !== 1, errors.length ? errors[0] : 'A single error did not occur');
  assert(errors.length === 0, new Error('Some errors occurred when fetching nested data'), {
    code: 'RESOLVE_INCLUDE_FAILED',
    errors,
  });
  return values;
}

// const profilerNoop = {
//   start: () => null,
//   end: () => null,
// };

/**
 * Create a resolver function from a collection of functions named-by-type.
 */
function createResolver(fetchers, resolverOpts = undefined) {
  assert(isPlainObject(fetchers), new TypeError('Expected createResolver getters to be an object of functions'));
  assert(!resolverOpts || isPlainObject(resolverOpts), new TypeError('Expected createResolver opts to be an object'));

  const types = Object.keys(fetchers);
  const initOpts = {
    // profiler: profilerNoop,

    ...resolverOpts,

    links: {
      baseUrl: undefined,
      ...(resolverOpts || {}).links,
    },
  };

  types.forEach(schemaType => {
    assert(typeof fetchers[schemaType] === 'function',
      new TypeError('Expected each getter to be a function that resolves a type'), { schemaType });
  });

  /**
   * Resolve one-or-more entries of a given type.
   */
  async function resolve(type, ids, resolveOpts = undefined) {
    assert(types.includes(type),
      new TypeError('Expected type to be a valid schema type'), { resolveType: type });
    assert((Array.isArray(ids) && ids.length) || typeof ids === 'string',
      new TypeError('Expected ids to be a string or an array of strings'));
    assert(!resolveOpts || isPlainObject(resolveOpts),
      new TypeError('Expected resolve opts to be an object'));

    const opts = {
      include: [],
      fields: {},

      ...resolveOpts,

      links: {
        ...initOpts.links,
        ...(resolveOpts || {}).links,
      },
    };
    assert(Array.isArray(opts.include),
      new TypeError('Expected resolve opts.include to be an array'));
    assert(isPlainObject(opts.fields),
      new TypeError('Expected resolve opts.fields to be an object'));

    let entries = await fetchers[type].call(null, Array.isArray(ids) ? ids : [ids], {
      include: opts.include,
      fields: Array.isArray(opts.fields[type]) ? opts.fields[type] : undefined,
    });

    if (opts.links && opts.links.baseUrl) {
      entries = entries.map(entry => {
        /* istanbul ignore else */
        if (entry && entry.links) {
          entry.links = resolve.links(entry.links, opts.links);
        }

        return entry;
      });
    }

    // eslint-disable-next-line no-nested-ternary
    const included = (Array.isArray(opts.include) && opts.include.length)
      ? (entries.length ? (await resolve.included(entries, opts)) : [])
      : undefined;

    return {
      data: Array.isArray(ids) ? entries : entries.shift(),
      ...(Array.isArray(included) ? { included } : undefined),
    };
  }

  resolve.included = async function included(entries, resolveIncludedOpts) {
    const opts = {
      include: [],
      fields: {},

      ...resolveIncludedOpts,
    };
    assert(Array.isArray(entries) || (entries.type && entries.id),
      new TypeError('Expected resolve.included entries to be an array or a single entry'));
    assert(Array.isArray(opts.include) && opts.include.length,
      new TypeError('Expected resolve.included opts.include to be an array of strings'));
    assert(isPlainObject(opts.fields),
      new TypeError('Expected resolve.included opts.fields to be an object'));

    let fetchIncluded = false;

    const lookups = (Array.isArray(entries) ? entries : [entries]).reduce((lookup, entry) => {
      /* istanbul ignore else */
      if (entry && entry.relationships) {
        opts.include.forEach(relation => {
          /* istanbul ignore else */
          if (entry.relationships[relation] && entry.relationships[relation].data) {
            const { data } = entry.relationships[relation];
            /* istanbul ignore else */
            if (Array.isArray(data) && data.length) {
              data.forEach(row => {
                /* istanbul ignore else */
                if (row && row.type && row.id && types.includes(row.type)) {
                  lookup[row.type] = (lookup[row.type] || new Set()).add(row.id);
                  fetchIncluded = true;
                }
              });
            } else if (data && data.type && data.id && types.includes(data.type)) {
              lookup[data.type] = (lookup[data.type] || new Set()).add(data.id);
              fetchIncluded = true;
            }
          }
        });
      }

      return lookup;
    }, {});

    if (fetchIncluded) {
      let results = [];

      await promiseAllSettled(Object.entries(lookups).map(async ([nestedType, nestedIds]) => {
        const { data: nestedData, included: nestedIncluded } = await resolve(nestedType, Array.from(nestedIds), {
          ...resolveIncludedOpts,
          include: [],
        });

        // Append all nested data to our included list
        results = results.concat(nestedData, nestedIncluded || []);
      }));

      return results;
    } else {
      return undefined;
    }
  };

  resolve.links = function links(input, opts) {
    assert(isPlainObject(input), new TypeError('Expected resolve.links links to be an object'));
    assert(isPlainObject(opts) && typeof opts.baseUrl === 'string',
      new TypeError('Expected resolve.links opts.baseUrl to be a string'));

    const output = {};

    Object.entries(input).forEach(([key, value]) => {
      /* istanbul ignore else */
      if (value && typeof value.href === 'string' && value.href.startsWith('/')) {
        value.href = `${opts.baseUrl}${value.href}`;
      } else if (typeof value === 'string' && value.startsWith('/')) {
        value = `${opts.baseUrl}${value}`;
      }

      output[key] = value;
    });

    return output;
  };

  return resolve;
}

module.exports = {
  createResolver,
};
