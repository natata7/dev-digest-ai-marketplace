# Making the dependency rule structural, not just reviewed

Everything in this skill is enforced by convention and review. A human can miss it as the codebase grows. If violations of the same shape keep slipping through, add a lint rule that fails CI on the offending import. This is **optional** — propose it after you see repeated violations; do not add it preemptively.

## Two tools for TypeScript/Node

**eslint-plugin-boundaries** classifies files into architectural elements by glob, then declares which element types may import which:

```js
// illustrative
settings: {
  'boundaries/elements': [
    { type: 'routes', pattern: 'src/modules/*/routes.ts' },
    { type: 'service', pattern: 'src/modules/*/service.ts' },
    { type: 'repository', pattern: 'src/modules/*/repository.ts' },
    { type: 'adapter', pattern: 'src/adapters/**' },
    { type: 'ports', pattern: 'src/shared/ports.ts' },
  ],
},
rules: {
  'boundaries/element-types': ['error', {
    default: 'disallow',
    rules: [
      { from: 'routes', allow: ['service', 'ports'] },
      { from: 'service', allow: ['repository', 'ports'] },
      { from: 'repository', allow: ['ports'] },
      { from: 'adapter', allow: ['ports'] },
    ],
  }],
},
```

Honest limitation: it checks file-to-file import edges, not whether a service calls the port type or the concrete class. Its value is catching the blunt violations — a route importing the DB schema, a service importing an adapter file directly instead of going through the container.

**dependency-cruiser** analyzes the dependency graph: circular dependencies, "may not import" rules in a config file, and a rendered graph — useful for a one-off audit ("show me every importer of the DB schema") even without wiring it into CI.

## Suggested rollout

1. Run dependency-cruiser once, ad hoc, to see how many violations already exist — a rule that fails on day one against dozens of old violations gets disabled instead of fixed.
2. Start with eslint-plugin-boundaries in `warn` mode, scoped to the two blunt rules above.
3. Promote to `error` once the codebase is clean and add it to the CI lint step.

Treat adding this as a deliberate, reviewed change (CI config, devDependencies, lint config), not something slipped into an unrelated feature PR.
