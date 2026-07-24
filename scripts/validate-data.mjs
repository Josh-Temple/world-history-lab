import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const ALLOWED_STATUS = new Set(["draft", "reviewed", "approved"]);
const ALLOWED_SKILLS = new Set([
  "timeline",
  "causality",
  "comparison",
  "geography",
  "people",
  "recognition",
]);

const ALLOWED_CAUSAL_CATEGORIES = new Set([
  "political",
  "economic",
  "social",
  "military",
  "intellectual",
  "technological",
  "cultural",
  "diplomatic",
  "environmental",
]);
const ALLOWED_THEMES = new Set([
  "revolution",
  "imperialism",
  "industrialization",
  "religion",
  "trade",
  "war",
  "colonialism",
  "migration",
  "nationalism",
  "state_power",
  "technology",
  "economic_change",
]);
const ALLOWED_EVIDENCE_STRENGTH = new Set(["weak", "moderate", "strong"]);
const ALLOWED_CONFIDENCE_LEVEL = new Set(["low", "medium", "high"]);

async function readJson(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  const raw = await readFile(absolutePath, "utf8");
  return JSON.parse(raw);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : null;
}

function describeRecordId(record, fallback) {
  return typeof record?.id === "string" && record.id.trim() !== "" ? record.id : fallback;
}

function validateCausalLinks(event, fieldName, eventIdSet, errors, warnings) {
  const links = event[fieldName];
  if (links === undefined) {
    return;
  }

  if (!Array.isArray(links)) {
    errors.push(`Event ${event.id} has invalid ${fieldName}; expected an array.`);
    return;
  }

  for (const [index, link] of links.entries()) {
    if (typeof link === "string") {
      if (!eventIdSet.has(link)) {
        errors.push(`Event ${event.id} has invalid ${fieldName} reference at index ${index}: ${link}`);
      }
      continue;
    }

    if (!isObject(link)) {
      errors.push(`Event ${event.id} has invalid ${fieldName} entry at index ${index}; expected a string id or object.`);
      continue;
    }

    if (typeof link.event_id === "string" && !eventIdSet.has(link.event_id)) {
      errors.push(`Event ${event.id} has invalid ${fieldName}.event_id at index ${index}: ${link.event_id}`);
    }

    if (typeof link.label !== "string" || link.label.trim() === "") {
      warnings.push(`Event ${event.id} has ${fieldName} entry ${index} without a usable label.`);
    }

    if (link.category !== undefined) {
      if (typeof link.category !== "string" || link.category.trim() === "") {
        warnings.push(`Event ${event.id} has ${fieldName} entry ${index} with an invalid category.`);
      } else if (!ALLOWED_CAUSAL_CATEGORIES.has(link.category)) {
        warnings.push(`Event ${event.id} has ${fieldName} entry ${index} with unexpected category: ${link.category}`);
      }
    }
  }
}

export async function validateData({ log = false } = {}) {
  const errors = [];
  const warnings = [];

  const [events, people, unitRegistry, metadata, regions, concepts, sources, perspectives] = await Promise.all([
    readJson("data/events.json"),
    readJson("data/people.json"),
    readJson("data/units/index.json"),
    readJson("data/metadata.json"),
    readJson("data/regions.json"),
    readJson("data/concepts.json"),
    readJson("data/sources.json").catch(() => []),
    readJson("data/perspectives.json").catch(() => []),
  ]);

  const eventList = asArray(events);
  const peopleList = asArray(people);
  const regionList = asArray(regions);
  const conceptList = asArray(concepts);
  const regionIdSet = new Set((regionList || []).map((region) => (isObject(region) ? region.id : null)).filter((id) => typeof id === "string"));
  const conceptIdSet = new Set((conceptList || []).map((concept) => (isObject(concept) ? concept.id : null)).filter((id) => typeof id === "string"));
  const sourceList = asArray(sources) || [];
  const perspectiveList = asArray(perspectives) || [];

  if (!isObject(metadata)) {
    errors.push("data/metadata.json must be an object.");
  }
  if (!eventList) {
    errors.push("data/events.json must be an array.");
  }
  if (!peopleList) {
    errors.push("data/people.json must be an array.");
  }
  if (!regionList) {
    errors.push("data/regions.json must be an array.");
  }
  if (!conceptList) {
    errors.push("data/concepts.json must be an array.");
  }
  if (!isObject(unitRegistry) || !Array.isArray(unitRegistry.units)) {
    errors.push("data/units/index.json must be an object with a units array.");
  }


  const ALLOWED_DIFFICULTY_LEVELS = new Set(["beginner", "intermediate", "advanced"]);
  const conceptGraph = new Map();
  if (conceptList) {
    for (const [index, concept] of conceptList.entries()) {
      if (!isObject(concept)) {
        errors.push(`concepts[${index}] must be an object.`);
        continue;
      }
      const conceptLabel = describeRecordId(concept, `[index ${index}]`);
      if (concept.difficulty !== undefined && !ALLOWED_DIFFICULTY_LEVELS.has(concept.difficulty)) {
        errors.push(`Concept ${conceptLabel} has invalid difficulty: ${String(concept.difficulty)}`);
      }
      if (concept.prerequisite_concept_ids !== undefined && !Array.isArray(concept.prerequisite_concept_ids)) {
        errors.push(`Concept ${conceptLabel} has invalid prerequisite_concept_ids; expected an array.`);
      }
      const prereqs = Array.isArray(concept.prerequisite_concept_ids) ? concept.prerequisite_concept_ids : [];
      conceptGraph.set(concept.id, prereqs);
      const seen = new Set();
      for (const prereqId of prereqs) {
        if (typeof prereqId !== 'string') {
          errors.push(`Concept ${conceptLabel} has non-string prerequisite_concept_ids entry.`);
          continue;
        }
        if (seen.has(prereqId)) errors.push(`Concept ${conceptLabel} has duplicate prerequisite concept id: ${prereqId}`);
        seen.add(prereqId);
        if (!conceptIdSet.has(prereqId)) errors.push(`Concept ${conceptLabel} references unknown prerequisite concept id: ${prereqId}`);
      }
    }

    const visiting = new Set();
    const visited = new Set();
    const dfs = (id, trail = []) => {
      if (visiting.has(id)) {
        errors.push(`Concept prerequisite cycle detected: ${[...trail, id].join(' -> ')}`);
        return;
      }
      if (visited.has(id)) return;
      visiting.add(id);
      const next = conceptGraph.get(id) || [];
      for (const depId of next) dfs(depId, [...trail, id]);
      visiting.delete(id);
      visited.add(id);
    };
    for (const id of conceptGraph.keys()) dfs(id);
  }


  let learningPaths = [];
  let thematicPathways = [];
  let migrationPathways = [];
  try {
    const lp = await readJson("data/learning-paths.json");
    if (!Array.isArray(lp)) {
      errors.push("data/learning-paths.json must be an array.");
    } else {
      learningPaths = lp;
    }
  } catch {
    warnings.push("data/learning-paths.json is missing; adaptive path recommendations will be limited.");
  }

  try {
    const tp = await readJson("data/thematic-pathways.json");
    if (!Array.isArray(tp)) errors.push("data/thematic-pathways.json must be an array.");
    else thematicPathways = tp;
  } catch {
    warnings.push("data/thematic-pathways.json is missing; thematic journeys disabled.");
  }

  try {
    const mp = await readJson("data/migration-diaspora-pathways.json");
    if (!Array.isArray(mp)) errors.push("data/migration-diaspora-pathways.json must be an array.");
    else migrationPathways = mp;
  } catch {
    warnings.push("data/migration-diaspora-pathways.json is missing; migration pathways disabled.");
  }

  for (const [index, record] of migrationPathways.entries()) {
    if (!isObject(record)) {
      errors.push(`migration-diaspora-pathways[${index}] must be an object.`);
      continue;
    }
    if (!Array.isArray(record.event_ids)) errors.push(`Migration pathway ${describeRecordId(record, `[index ${index}]`)} must include event_ids array.`);
    if (!Array.isArray(record.concept_ids)) errors.push(`Migration pathway ${describeRecordId(record, `[index ${index}]`)} must include concept_ids array.`);
  }

  for (const [index, pathRecord] of learningPaths.entries()) {
    if (!isObject(pathRecord)) {
      errors.push(`learning-paths[${index}] must be an object.`);
      continue;
    }
    if (pathRecord.recommended_level !== undefined && !ALLOWED_DIFFICULTY_LEVELS.has(pathRecord.recommended_level)) {
      errors.push(`Learning path ${describeRecordId(pathRecord, `[index ${index}]`)} has invalid recommended_level.`);
    }
    if (pathRecord.required_concept_ids !== undefined) {
      if (!Array.isArray(pathRecord.required_concept_ids)) {
        errors.push(`Learning path ${describeRecordId(pathRecord, `[index ${index}]`)} has invalid required_concept_ids.`);
      } else {
        for (const cid of pathRecord.required_concept_ids) {
          if (typeof cid !== 'string' || !conceptIdSet.has(cid)) errors.push(`Learning path ${describeRecordId(pathRecord, `[index ${index}]`)} references unknown required concept id: ${String(cid)}`);
        }
      }
    }
  }

  const personIdSet = new Set();
  const validateEvidenceMeta = (record, label) => {
    if (record.evidence_strength !== undefined && !ALLOWED_EVIDENCE_STRENGTH.has(record.evidence_strength)) {
      errors.push(`${label} has invalid evidence_strength: ${String(record.evidence_strength)}`);
    }
    if (record.confidence_level !== undefined && !ALLOWED_CONFIDENCE_LEVEL.has(record.confidence_level)) {
      errors.push(`${label} has invalid confidence_level: ${String(record.confidence_level)}`);
    }
  };
  if (peopleList) {
    for (const [index, person] of peopleList.entries()) {
      if (!isObject(person)) {
        errors.push(`people[${index}] must be an object.`);
        continue;
      }
      if (typeof person.id !== "string" || person.id.trim() === "") {
        errors.push(`people[${index}] must include a non-empty id.`);
        continue;
      }
      if (personIdSet.has(person.id)) {
        errors.push(`Duplicate person id found: ${person.id}`);
      }
      personIdSet.add(person.id);
      if (!person.id.startsWith("pe_")) {
        warnings.push(`Person id does not use pe_ prefix: ${person.id}`);
      }
    }
  }

  const eventIdSet = new Set();
  const eventSourcePath = "data/events.json";
  if (eventList) {
    for (const [index, event] of eventList.entries()) {
      if (!isObject(event)) {
        errors.push(`events[${index}] must be an object.`);
        continue;
      }

      const eventLabel = describeRecordId(event, `[index ${index}]`);
      validateEvidenceMeta(event, `Event ${eventLabel}`);
      if (typeof event.id !== "string" || event.id.trim() === "") {
        errors.push(`${eventSourcePath} events[${index}] must include a non-empty id.`);
      } else {
        if (eventIdSet.has(event.id)) {
          errors.push(`Duplicate event id found in ${eventSourcePath}: ${event.id}`);
        }
        eventIdSet.add(event.id);
        if (!event.id.startsWith("ev_")) {
          warnings.push(`Event id does not use ev_ prefix: ${event.id}`);
        }
      }

      if (typeof event.label !== "string" || event.label.trim() === "") {
        errors.push(`${eventSourcePath} event ${eventLabel} is missing a valid label.`);
      }
      if (!isObject(event.time) || typeof event.time.year_start !== "number") {
        errors.push(`${eventSourcePath} event ${eventLabel} must include time.year_start as a number.`);
      }
      if (typeof event.status !== "string" || !ALLOWED_STATUS.has(event.status)) {
        errors.push(`Event ${eventLabel} has invalid status: ${String(event.status)}`);
      }
      if (typeof event.summary_short !== "string" || event.summary_short.trim() === "") {
        warnings.push(`Event ${eventLabel} is missing summary_short.`);
      }

      if (event.people_ids !== undefined) {
        if (!Array.isArray(event.people_ids)) {
          errors.push(`Event ${eventLabel} has invalid people_ids; expected an array of person ids.`);
        } else {
          const peopleIdsSeen = new Set();
          for (const personId of event.people_ids) {
            if (typeof personId !== "string") {
              errors.push(`Event ${eventLabel} has a non-string people_ids entry.`);
              continue;
            }
            if (peopleIdsSeen.has(personId)) {
              errors.push(`Event ${eventLabel} includes duplicate people_ids entry: ${personId}`);
            }
            peopleIdsSeen.add(personId);
            if (!personIdSet.has(personId)) {
              errors.push(`Event ${eventLabel} references unknown person id in people_ids: ${personId}`);
            }
          }
        }
      }

      if (event.concept_ids !== undefined) {
        if (!Array.isArray(event.concept_ids)) {
          errors.push(`Event ${eventLabel} has invalid concept_ids; expected an array.`);
        } else {
          const conceptIdsSeen = new Set();
          for (const conceptId of event.concept_ids) {
            if (typeof conceptId !== "string") {
              errors.push(`Event ${eventLabel} has a non-string concept_ids entry.`);
              continue;
            }
            if (conceptIdsSeen.has(conceptId)) {
              errors.push(`Event ${eventLabel} includes duplicate concept_ids entry: ${conceptId}`);
            }
            conceptIdsSeen.add(conceptId);
            if (!conceptIdSet.has(conceptId)) {
              errors.push(`Event ${eventLabel} references unknown concept id in concept_ids: ${conceptId}`);
            }
          }
        }
      }
      if (event.skills !== undefined) {
        if (!Array.isArray(event.skills)) {
          errors.push(`Event ${eventLabel} has invalid skills; expected an array.`);
        } else {
          const skillsSeen = new Set();
          for (const skill of event.skills) {
            if (typeof skill !== "string") {
              errors.push(`Event ${eventLabel} has non-string skills entry.`);
              continue;
            }
            if (skillsSeen.has(skill)) {
              errors.push(`Event ${eventLabel} has duplicate skill entry: ${skill}`);
            }
            skillsSeen.add(skill);
            if (!ALLOWED_SKILLS.has(skill)) {
              errors.push(`Event ${eventLabel} has invalid skill: ${skill}`);
            }
          }
        }
      }

      if (event.primary_skill !== undefined) {
        if (typeof event.primary_skill !== "string" || !ALLOWED_SKILLS.has(event.primary_skill)) {
          errors.push(`Event ${eventLabel} has invalid primary_skill: ${String(event.primary_skill)}`);
        } else if (Array.isArray(event.skills) && !event.skills.includes(event.primary_skill)) {
          errors.push(`Event ${eventLabel} primary_skill is not included in skills array.`);
        }
      }

      if (event.themes !== undefined) {
        if (!Array.isArray(event.themes)) {
          errors.push(`Event ${eventLabel} has invalid themes; expected an array.`);
        } else {
          const themesSeen = new Set();
          for (const theme of event.themes) {
            if (typeof theme !== "string") {
              errors.push(`Event ${eventLabel} has non-string themes entry.`);
              continue;
            }
            if (themesSeen.has(theme)) {
              errors.push(`Event ${eventLabel} has duplicate theme entry: ${theme}`);
            }
            themesSeen.add(theme);
            if (!ALLOWED_THEMES.has(theme)) {
              errors.push(`Event ${eventLabel} has invalid theme: ${theme}`);
            }
          }
        }
      }
      if (event.region_ids !== undefined) {
        if (!Array.isArray(event.region_ids)) {
          errors.push(`Event ${eventLabel} has invalid region_ids; expected an array.`);
        } else {
          const seenRegionIds = new Set();
          for (const regionId of event.region_ids) {
            if (typeof regionId !== "string") {
              errors.push(`Event ${eventLabel} has non-string region_ids entry.`);
              continue;
            }
            if (seenRegionIds.has(regionId)) {
              errors.push(`Event ${eventLabel} has duplicate region_ids entry: ${regionId}`);
            }
            seenRegionIds.add(regionId);
            if (!regionIdSet.has(regionId)) {
              errors.push(`Event ${eventLabel} references unknown region id in region_ids: ${regionId}`);
            }
          }
        }
      }
      if (event.related_event_ids !== undefined) {
        if (!Array.isArray(event.related_event_ids)) {
          errors.push(`Event ${eventLabel} has invalid related_event_ids; expected an array.`);
        } else {
          const seenRelatedIds = new Set();
          for (const relatedId of event.related_event_ids) {
            if (typeof relatedId !== "string") {
              errors.push(`Event ${eventLabel} has non-string related_event_ids entry.`);
              continue;
            }
            if (seenRelatedIds.has(relatedId)) {
              errors.push(`Event ${eventLabel} has duplicate related_event_ids entry: ${relatedId}`);
            }
            seenRelatedIds.add(relatedId);
          }
        }
      }


      if (event.geo !== undefined) {
        if (!isObject(event.geo)) {
          errors.push(`Event ${eventLabel} has invalid geo; expected an object.`);
        } else {
          if (!Number.isFinite(event.geo.lat) || !Number.isFinite(event.geo.lon)) {
            errors.push(`Event ${eventLabel} has invalid geo coordinates; lat/lon must be numbers.`);
          }
          if (Number.isFinite(event.geo.lat) && (event.geo.lat < -90 || event.geo.lat > 90)) {
            errors.push(`Event ${eventLabel} has geo.lat out of range (-90..90).`);
          }
          if (Number.isFinite(event.geo.lon) && (event.geo.lon < -180 || event.geo.lon > 180)) {
            errors.push(`Event ${eventLabel} has geo.lon out of range (-180..180).`);
          }
        }
      }
    }

    if (eventIdSet.size !== eventList.length) {
      errors.push(`Duplicate event IDs detected in ${eventSourcePath}: expected ${eventList.length} unique ids but found ${eventIdSet.size}.`);
    }
  }

  for (const [index, source] of sourceList.entries()) {
    if (!isObject(source)) {
      errors.push(`sources[${index}] must be an object.`);
      continue;
    }
    validateEvidenceMeta(source, `Source ${describeRecordId(source, `[index ${index}]`)}`);
  }

  for (const [index, perspective] of perspectiveList.entries()) {
    if (!isObject(perspective)) {
      errors.push(`perspectives[${index}] must be an object.`);
      continue;
    }
    validateEvidenceMeta(perspective, `Perspective ${describeRecordId(perspective, `[index ${index}]`)}`);
  }

  if (eventList) {
    const eventById = new Map(eventList.filter((event) => isObject(event) && typeof event.id === "string").map((event) => [event.id, event]));
    for (const event of eventList) {
      if (!isObject(event) || typeof event.id !== "string" || event.id.trim() === "") {
        continue;
      }
      if (event.prerequisite_event_ids !== undefined && !Array.isArray(event.prerequisite_event_ids)) {
        errors.push(`Event ${event.id} has invalid prerequisite_event_ids; expected an array.`);
      }
      if (event.consequence_event_ids !== undefined && !Array.isArray(event.consequence_event_ids)) {
        errors.push(`Event ${event.id} has invalid consequence_event_ids; expected an array.`);
      }
      if (Array.isArray(event.related_event_ids)) {
        for (const relatedId of event.related_event_ids) {
          if (!eventIdSet.has(relatedId)) {
            errors.push(`Event ${event.id} invalid related_event_id: ${relatedId}`);
            continue;
          }
          const relatedEvent = eventById.get(relatedId);
          const reverse = Array.isArray(relatedEvent?.related_event_ids) ? relatedEvent.related_event_ids : [];
          if (!reverse.includes(event.id)) {
            warnings.push(`Event ${event.id} links related_event_id ${relatedId} but link is not reciprocal.`);
          }
        }
      }

      for (const prerequisiteId of event.prerequisite_event_ids || []) {
        if (!eventIdSet.has(prerequisiteId)) {
          errors.push(`Event ${event.id} invalid prerequisite_event_id: ${prerequisiteId}`);
        }
      }
      for (const consequenceId of event.consequence_event_ids || []) {
        if (!eventIdSet.has(consequenceId)) {
          errors.push(`Event ${event.id} invalid consequence_event_id: ${consequenceId}`);
        }
      }
      validateCausalLinks(event, "effects", eventIdSet, errors, warnings);
      validateCausalLinks(event, "causes", eventIdSet, errors, warnings);
      if (Array.isArray(event.consequence_event_ids)) {
        for (const consequenceId of event.consequence_event_ids) {
          const consequence = eventById.get(consequenceId);
          if (consequence && !(Array.isArray(consequence.prerequisite_event_ids) && consequence.prerequisite_event_ids.includes(event.id))) {
            warnings.push(`Event ${event.id} consequence link not reciprocated by prerequisite on ${consequenceId}.`);
          }
        }
      }

    }
  }

  for (const personId of personIdSet) {
    if (eventIdSet.has(personId)) {
      errors.push(`Duplicate ID found across events and people: ${personId}`);
    }
  }

  let unitsCount = 0;
  const usedEventIds = new Set();
  if (isObject(unitRegistry) && Array.isArray(unitRegistry.units)) {
    unitsCount = unitRegistry.units.length;
    for (const [index, unitEntry] of unitRegistry.units.entries()) {
      if (!isObject(unitEntry) || typeof unitEntry.path !== "string" || unitEntry.path.trim() === "") {
        errors.push(`units[${index}] in data/units/index.json must include a non-empty path.`);
        continue;
      }

      let unit;
      try {
        unit = await readJson(unitEntry.path);
      } catch (error) {
        errors.push(`Unable to read unit file ${unitEntry.path}: ${error.message}`);
        continue;
      }

      if (!isObject(unit)) {
        errors.push(`${unitEntry.path} must contain an object.`);
        continue;
      }
      if (!Array.isArray(unit.event_ids)) {
        errors.push(`${unitEntry.path} must include event_ids as an array.`);
        continue;
      }

      const unitId = describeRecordId(unit, unitEntry.path);
      const unitEventIdSet = new Set();
      for (const eventId of unit.event_ids) {
        if (typeof eventId !== "string") {
          errors.push(`${unitEntry.path} contains a non-string event id reference.`);
          continue;
        }
        if (unitEventIdSet.has(eventId)) {
          errors.push(`Unit ${unitId} includes duplicate event id: ${eventId}`);
        }
        unitEventIdSet.add(eventId);
        usedEventIds.add(eventId);
        if (!eventIdSet.has(eventId)) {
          errors.push(`Unit ${unitId} (${unitEntry.path}) references missing event ${eventId} in ${eventSourcePath}`);
        }
      }
    }
  }

  for (const eventId of eventIdSet) {
    if (!usedEventIds.has(eventId)) {
      warnings.push(`Unused event id in ${eventSourcePath}: ${eventId}`);
    }
  }

  if (isObject(metadata) && isObject(unitRegistry) && Array.isArray(unitRegistry.units)) {
    const scopeUnits = asArray(metadata?.scope?.included_units);
    if (!scopeUnits) {
      errors.push("data/metadata.json scope.included_units must be an array.");
    } else {
      const registryUnitIds = unitRegistry.units
        .map((unit) => (isObject(unit) ? unit.id : null))
        .filter((id) => typeof id === "string");

      const scopeSet = new Set(scopeUnits);
      for (const registryId of registryUnitIds) {
        if (!scopeSet.has(registryId)) {
          errors.push(`metadata scope missing registered unit: ${registryId}`);
        }
      }
      for (const scopeId of scopeUnits) {
        if (!registryUnitIds.includes(scopeId)) {
          errors.push(`metadata scope includes unknown unit id: ${scopeId}`);
        }
      }
    }
  }

  for (const [index, p] of thematicPathways.entries()) {
    if (!isObject(p)) {
      errors.push(`thematic-pathways[${index}] must be an object.`);
      continue;
    }
    if (!Array.isArray(p.event_ids)) {
      errors.push(`Thematic pathway ${describeRecordId(p, `[index ${index}]`)} must include event_ids array.`);
    }
  }

  const summary = {
    events: eventList ? eventList.length : 0,
    people: peopleList ? peopleList.length : 0,
    units: unitsCount,
    warnings,
    errors,
  };

  if (log) {
    for (const warning of warnings) {
      console.warn(`[validate-data] Warning: ${warning}`);
    }
    if (errors.length > 0) {
      for (const error of errors) {
        console.error(`[validate-data] Error: ${error}`);
      }
    }
    if (errors.length === 0) {
      console.log("Dataset validation passed");
      console.log(`events: ${summary.events}`);
      console.log(`people: ${summary.people}`);
      console.log(`units: ${summary.units}`);
      if (warnings.length > 0) {
        console.log(`warnings: ${warnings.length}`);
      }
    }
  }

  return summary;
}

async function runCli() {
  try {
    const summary = await validateData({ log: true });
    if (summary.errors.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`[validate-data] Failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}

