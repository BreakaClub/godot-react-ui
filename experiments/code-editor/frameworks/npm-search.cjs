// Usage: node npm-search.cjs "<query>" [size]. Prints name, version, weekly-ish score data, description from the npm search API.
const [query, size = '12'] = process.argv.slice(2);
(async () => {
  const response = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${size}`);
  const body = await response.json();
  console.log(`## ${query}`);
  for (const entry of body.objects) {
    const p = entry.package;
    console.log(`${p.name}@${p.version} (${p.date?.slice(0, 10)}) ${String(p.description ?? '').slice(0, 110)}`);
  }
})();
