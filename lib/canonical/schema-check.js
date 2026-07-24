/**
 * lib/canonical/schema-check.js — a small, dependency-free structural
 * validator for schemas/name-entity.schema.json, shared by
 * scripts/build/build-canonical-entities.js (a fast inline check while
 * building) and scripts/build/validate-canonical.js (the full audit pass).
 *
 * Not a general-purpose JSON Schema engine — it implements exactly what
 * schemas/name-entity.schema.json actually uses (type unions with null,
 * nested objects, arrays of objects, enum, additionalProperties: false,
 * required), and nothing more. No new dependency was added to validate
 * against the schema; this is intentionally minimal.
 */

function typeMatches(value, typeSpec) {
  const types = Array.isArray(typeSpec) ? typeSpec : [typeSpec];
  return types.some((t) => {
    if (t === 'null') return value === null;
    if (t === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
    if (t === 'array') return Array.isArray(value);
    if (t === 'string') return typeof value === 'string';
    if (t === 'number') return typeof value === 'number';
    if (t === 'integer') return typeof value === 'number' && Number.isInteger(value);
    if (t === 'boolean') return typeof value === 'boolean';
    return false;
  });
}

/** Validates `value` against a schema node. Returns an array of error strings (empty = valid). Path is for error messages only. */
function validateNode(value, schemaNode, path) {
  const errors = [];
  if (!schemaNode) return errors;

  if (schemaNode.const !== undefined) {
    if (value !== schemaNode.const) errors.push(`${path}: expected const ${JSON.stringify(schemaNode.const)}, got ${JSON.stringify(value)}`);
    return errors;
  }

  // NOTE (Phase 3A finding, not corrected here — schemas/name-entity.schema.json
  // is out of scope for this phase): most leaf fields declare nullability via the
  // custom `x-nullable: true` annotation described in the schema's own field
  // documentation, but only SOME leaf fields also list "null" in their standard
  // `type` array. A strict standard-JSON-Schema reading would reject a null
  // value on every field that has x-nullable:true but omitted "null" from
  // `type` — which is most of them. This validator honors the schema's own
  // documented convention (x-nullable) as an additional, equally-valid way to
  // permit null, rather than silently failing entities that correctly encode
  // "no data" as null. See audit/canonical-validation.json for the count of
  // fields where this distinction applies.
  const nullAllowed = value === null && (schemaNode['x-nullable'] === true || (Array.isArray(schemaNode.type) && schemaNode.type.includes('null')));
  if (schemaNode.type && !nullAllowed && !typeMatches(value, schemaNode.type)) {
    errors.push(`${path}: expected type ${JSON.stringify(schemaNode.type)}, got ${value === null ? 'null' : typeof value}`);
    return errors; // type mismatch makes deeper checks meaningless
  }
  if (nullAllowed) return errors;

  if (schemaNode.enum && value !== null && !schemaNode.enum.includes(value)) {
    errors.push(`${path}: value ${JSON.stringify(value)} not in enum ${JSON.stringify(schemaNode.enum)}`);
  }

  if (value === null) return errors; // null is valid wherever the type union above allowed it

  if (schemaNode.type && (schemaNode.type === 'object' || (Array.isArray(schemaNode.type) && schemaNode.type.includes('object'))) && typeof value === 'object' && !Array.isArray(value)) {
    const props = schemaNode.properties || {};
    if (schemaNode.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in props)) errors.push(`${path}: unexpected property "${key}" (additionalProperties: false)`);
      }
    }
    for (const req of schemaNode.required || []) {
      if (!(req in value) || value[req] === undefined) errors.push(`${path}: missing required property "${req}"`);
    }
    for (const [key, subSchema] of Object.entries(props)) {
      if (key in value) errors.push(...validateNode(value[key], subSchema, `${path}.${key}`));
    }
  }

  if (Array.isArray(value) && schemaNode.items) {
    value.forEach((item, i) => errors.push(...validateNode(item, schemaNode.items, `${path}[${i}]`)));
  }

  return errors;
}

/** Validates one canonical entity object against schemas/name-entity.schema.json. Returns { valid, errors }. */
function validateEntity(entity, schema) {
  const errors = validateNode(entity, schema, '$');
  return { valid: errors.length === 0, errors };
}

module.exports = { validateEntity, validateNode, typeMatches };
