// Empty stub for @wagmi/core's optional `import('accounts')` (Tempo wallet SDK,
// not installed). Aliased via next.config.ts → turbopack.resolveAlias so the
// bundler resolves the lazy optional import instead of failing. The connector
// only touches this if a Tempo account is actually used (never in this app).
module.exports = {};
