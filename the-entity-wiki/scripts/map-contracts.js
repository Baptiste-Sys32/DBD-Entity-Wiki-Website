// Shared validation for canonical map identity and realm membership.
function mapContractIssues(database) {
  const issues = [];
  if (!Array.isArray(database.maps) || !Array.isArray(database.realms)) return ['maps and realms must be arrays'];
  const maps = new Map();
  const realms = new Map();
  for (const map of database.maps) {
    if (!map?.id || maps.has(map.id)) issues.push(`Missing or duplicate map ID: ${map?.id || '(empty)'}`);
    maps.set(map?.id, map);
  }
  for (const realm of database.realms) {
    if (!realm?.name || realms.has(realm.name)) issues.push(`Missing or duplicate realm name: ${realm?.name || '(empty)'}`);
    realms.set(realm?.name, realm);
    if (!Array.isArray(realm?.maps)) { issues.push(`Realm ${realm?.name} maps must be an array`); continue; }
    const seen = new Set();
    for (const id of realm.maps) {
      if (seen.has(id)) issues.push(`Duplicate map reference: ${realm.name} / ${id}`);
      seen.add(id);
      const map = maps.get(id);
      if (!map) issues.push(`Missing map: ${realm.name} / ${id}`);
      else if (map.realm !== realm.name) issues.push(`Wrong realm: ${map.name} belongs to ${map.realm}, referenced by ${realm.name}`);
    }
  }
  for (const map of database.maps) {
    const realm = realms.get(map?.realm);
    if (!realm || !Array.isArray(realm.maps) || !realm.maps.includes(map.id)) issues.push(`Orphan map: ${map?.name || map?.id}`);
  }
  return issues;
}
module.exports = { mapContractIssues };
