require('dotenv').config();
const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Initialize Neo4j driver for CognoDB ─────────────────────────────────────
const driver = neo4j.driver(
  process.env.COGNODB_URI,
  neo4j.auth.basic(process.env.COGNODB_USER, process.env.COGNODB_PASSWORD)
);

// ─── Helper: safely convert Neo4j Integer objects to plain JS numbers ────────
// Neo4j driver returns integers as { low, high } objects; we must
// convert them before sending JSON to the frontend.
function toNumber(val) {
  if (val == null) return 0;
  if (neo4j.isInt(val)) return val.toNumber();
  if (typeof val === 'object' && 'low' in val) return neo4j.int(val).toNumber();
  return Number(val);
}

// ─── Verify CognoDB connectivity on startup ──────────────────────────────────
(async () => {
  try {
    await driver.verifyConnectivity();
    console.log('✅ Connected to CognoDB');
  } catch (err) {
    console.error('⚠️  Could not connect to CognoDB:', err.message);
    console.error('   The server will start, but API calls will fail until the database is reachable.');
  }
})();

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINT 1 — GET /api/students
// Fetch all student profiles together with their skills, interests, and city.
// Multi-hop traversal: Student -> HAS_SKILL -> Skill
//                      Student -> INTERESTED_IN -> Domain
//                      Student -> LOCATED_IN -> City
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api/students', async (_req, res) => {
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (s:Student)
      OPTIONAL MATCH (s)-[hs:HAS_SKILL]->(sk:Skill)
      OPTIONAL MATCH (s)-[:INTERESTED_IN]->(d:Domain)
      OPTIONAL MATCH (s)-[:LOCATED_IN]->(c:City)
      WITH s, c,
           collect(DISTINCT {name: sk.name, proficiency: hs.proficiencyLevel, category: sk.category}) AS skills,
           collect(DISTINCT d.name) AS interests
      RETURN s.id       AS id,
             s.name     AS name,
             s.email    AS email,
             s.bio      AS bio,
             s.gpa      AS gpa,
             c.name     AS city,
             skills,
             interests
      ORDER BY s.name
    `);

    const students = result.records.map((r) => ({
      id: r.get('id'),
      name: r.get('name'),
      email: r.get('email'),
      bio: r.get('bio'),
      gpa: r.get('gpa'),
      city: r.get('city'),
      // Filter out any null skill entries produced by OPTIONAL MATCH
      skills: r.get('skills').filter((s) => s.name != null),
      interests: r.get('interests').filter(Boolean),
    }));

    res.json(students);
  } catch (error) {
    console.error('GET /api/students error:', error.message);
    res.status(500).json({ error: 'Failed to fetch students', code: 'DB_ERROR' });
  } finally {
    await session.close();
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINT 2 — POST /api/recommendations
// Core recommendation engine using a weighted, multi-hop Cypher traversal.
//
// Request body:
//   { studentId, locationPreference?, minStipend?, maxSkillGap? }
//
// Algorithm overview:
//   1. Traverse Student -[HAS_SKILL]-> Skill <-[REQUIRES_SKILL]- Internship
//      to find shared skills between the student and each internship.
//   2. Compute a weighted match score:
//      - Proficiency weight: Advanced=3, Intermediate=2, Beginner=1
//      - Importance multiplier: Required skills count 2×, Optional count 1×
//   3. Compute the maximum possible score for each internship (if a hypothetical
//      student had Advanced proficiency on every required skill).
//   4. matchPercentage = (actualScore / maxPossibleScore) × 100
//   5. Identify skill gaps: skills REQUIRED by the internship that the student
//      does NOT possess.
//   6. Apply optional filters and return results sorted by matchPercentage DESC.
// ═══════════════════════════════════════════════════════════════════════════════
app.post('/api/recommendations', async (req, res) => {
  const {
    studentId,
    locationPreference = null,
    minStipend = 0,
    maxSkillGap = 100,
  } = req.body;

  if (!studentId) {
    return res.status(400).json({ error: 'studentId is required', code: 'BAD_REQUEST' });
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `
      // ── Step 1: Collect the student's entire skill set into a list ─────────
      // We gather all skills upfront so we can do set-membership checks later
      // without OPTIONAL MATCH (which causes cartesian products on CognoDB).
      MATCH (student:Student {id: $studentId})-[has:HAS_SKILL]->(sk:Skill)
      WITH student,
           collect(sk.id) AS studentSkillIds,
           collect({id: sk.id, name: sk.name, proficiency: has.proficiencyLevel}) AS studentSkillInfos

      // ── Step 2: Find every internship and its required skills ──────────────
      // Multi-hop: Internship -[REQUIRES_SKILL]-> Skill
      MATCH (internship:Internship)-[req:REQUIRES_SKILL]->(reqSkill:Skill)
      MATCH (company:Company)-[:OFFERS]->(internship)
      OPTIONAL MATCH (internship)-[:IN_DOMAIN]->(domain:Domain)

      // ── Step 3: For each required skill, check if the student has it ───────
      // Uses list-membership check instead of OPTIONAL MATCH to avoid row explosion.
      WITH student, studentSkillIds, studentSkillInfos,
           internship, company, domain, reqSkill, req,
           reqSkill.id IN studentSkillIds AS isMatched,
           CASE req.importance WHEN 'Required' THEN 2 ELSE 1 END AS impMult,
           CASE req.importance WHEN 'Required' THEN 6 ELSE 3 END AS maxSkillScore

      // ── Step 4: Look up proficiency for matched skills via list comprehension
      WITH internship, company, domain, reqSkill, req, isMatched, impMult, maxSkillScore,
           CASE WHEN isMatched THEN
             [info IN studentSkillInfos WHERE info.id = reqSkill.id | info.proficiency][0]
           ELSE null END AS prof

      // ── Step 5: Compute per-skill weighted score ───────────────────────────
      // profWeight: Advanced=3, Intermediate=2, Beginner=1, missing=0
      // impMult: Required skills count 2×, Optional skills count 1×
      WITH internship, company, domain, reqSkill, req, isMatched, impMult, maxSkillScore, prof,
           CASE prof
             WHEN 'Advanced'     THEN 3
             WHEN 'Intermediate' THEN 2
             WHEN 'Beginner'     THEN 1
             ELSE 0
           END AS profWeight

      // ── Step 6: Aggregate across all skills per internship ─────────────────
      WITH internship, company, domain,
           sum(profWeight * impMult)  AS matchScore,
           sum(maxSkillScore)         AS maxPossibleScore,
           [x IN collect(
             CASE WHEN isMatched
               THEN {name: reqSkill.name, proficiency: prof}
               ELSE null END
           ) WHERE x IS NOT NULL]     AS matchedSkills,
           [x IN collect(
             CASE WHEN NOT isMatched
               THEN {name: reqSkill.name, importance: req.importance}
               ELSE null END
           ) WHERE x IS NOT NULL]     AS skillGaps

      // ── Step 7: Compute match percentage and apply filters ─────────────────
      WITH internship, company, domain,
           matchScore, maxPossibleScore, matchedSkills, skillGaps,
           CASE WHEN maxPossibleScore > 0
                THEN round(toFloat(matchScore) / maxPossibleScore * 100)
                ELSE 0
           END AS matchPercentage

      WHERE size(matchedSkills) > 0
        AND ($locationPreference IS NULL OR internship.mode = $locationPreference)
        AND internship.stipend >= $minStipend
        AND size(skillGaps) <= $maxSkillGap

      // ── Step 8: Return sorted results ──────────────────────────────────────
      RETURN internship.id          AS internshipId,
             internship.title       AS title,
             internship.description AS description,
             internship.mode        AS location,
             internship.stipend     AS stipend,
             internship.duration    AS duration,
             company.name           AS companyName,
             company.industry       AS companyIndustry,
             domain.name            AS domain,
             matchPercentage,
             matchScore,
             matchedSkills,
             skillGaps
      ORDER BY matchPercentage DESC, matchScore DESC
      `,
      {
        studentId,
        locationPreference: locationPreference || null,
        minStipend: neo4j.int(Number(minStipend) || 0),
        maxSkillGap: neo4j.int(Number(maxSkillGap) || 100),
      }
    );

    const recommendations = result.records.map((r) => ({
      id: r.get('internshipId'),
      title: r.get('title'),
      description: r.get('description'),
      location: r.get('location'),
      stipend: toNumber(r.get('stipend')),
      duration: r.get('duration'),
      company: r.get('companyName'),
      companyIndustry: r.get('companyIndustry'),
      domain: r.get('domain'),
      matchPercentage: toNumber(r.get('matchPercentage')),
      matchScore: toNumber(r.get('matchScore')),
      matchedSkills: r.get('matchedSkills'),
      skillGaps: r.get('skillGaps'),
    }));

    res.json(recommendations);
  } catch (error) {
    console.error('POST /api/recommendations error:', error.message);
    res.status(500).json({ error: 'Failed to compute recommendations', code: 'DB_ERROR' });
  } finally {
    await session.close();
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINT 3 — GET /api/students/:id/graph
// Returns the student's local subgraph as { nodes, edges } JSON
// for the frontend interactive graph visualizer.
//
// Multi-hop traversal:
//   Student -> HAS_SKILL -> Skill <- REQUIRES_SKILL <- Internship <- OFFERS <- Company
//   Student -> LOCATED_IN -> City
//   Student -> INTERESTED_IN -> Domain
//   Internship -> IN_DOMAIN -> Domain
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api/students/:id/graph', async (req, res) => {
  const { id } = req.params;
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (s:Student {id: $id})

      // Gather the student's skills
      OPTIONAL MATCH (s)-[hs:HAS_SKILL]->(sk:Skill)
      WITH s, collect({skill: sk, proficiency: hs.proficiencyLevel}) AS studentSkills

      // Gather internships that share at least one of those skills
      OPTIONAL MATCH (intern:Internship)-[req:REQUIRES_SKILL]->(sk2:Skill)<-[:HAS_SKILL]-(s)
      OPTIONAL MATCH (comp:Company)-[:OFFERS]->(intern)
      WITH s, studentSkills,
           collect(DISTINCT intern) AS matchedInternships,
           collect(DISTINCT comp) AS companies,
           collect(DISTINCT {internId: intern.id, skillName: sk2.name, importance: req.importance}) AS internSkillLinks

      // Gather student's location and interests
      OPTIONAL MATCH (s)-[:LOCATED_IN]->(city:City)
      OPTIONAL MATCH (s)-[:INTERESTED_IN]->(dom:Domain)
      OPTIONAL MATCH (intern2)-[:IN_DOMAIN]->(dom2:Domain)
           WHERE intern2 IN matchedInternships

      RETURN s, studentSkills, matchedInternships, companies,
             internSkillLinks,
             city, collect(DISTINCT dom) AS interests,
             collect(DISTINCT {internId: intern2.id, domain: dom2.name}) AS internDomains
      `,
      { id }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Student not found', code: 'NOT_FOUND' });
    }

    const record = result.records[0];
    const studentNode = record.get('s').properties;
    const studentSkills = record.get('studentSkills').filter((s) => s.skill != null);
    const matchedInternships = record.get('matchedInternships').filter(Boolean);
    const companies = record.get('companies').filter(Boolean);
    const internSkillLinks = record.get('internSkillLinks').filter((l) => l.internId != null);
    const city = record.get('city');
    const interests = record.get('interests').filter(Boolean);
    const internDomains = record.get('internDomains').filter((d) => d.internId != null);

    // Build nodes array
    const nodes = [];
    const edgesArr = [];
    const nodeIds = new Set();

    // Student node
    const addNode = (nodeId, label, type, extra = {}) => {
      if (!nodeIds.has(nodeId)) {
        nodeIds.add(nodeId);
        nodes.push({ id: nodeId, label, type, ...extra });
      }
    };

    addNode(studentNode.id, studentNode.name, 'Student');

    // Skill nodes + HAS_SKILL edges
    for (const { skill, proficiency } of studentSkills) {
      addNode(skill.properties.id, skill.properties.name, 'Skill', { category: skill.properties.category });
      edgesArr.push({
        source: studentNode.id,
        target: skill.properties.id,
        type: 'HAS_SKILL',
        label: proficiency,
      });
    }

    // Internship nodes + REQUIRES_SKILL edges
    for (const intern of matchedInternships) {
      addNode(intern.properties.id, intern.properties.title, 'Internship', {
        stipend: toNumber(intern.properties.stipend),
        mode: intern.properties.mode,
      });
    }

    for (const link of internSkillLinks) {
      edgesArr.push({
        source: link.internId,
        target: link.skillName,
        type: 'REQUIRES_SKILL',
        label: link.importance,
      });
    }

    // Resolve skill names to IDs in REQUIRES_SKILL edges
    const skillNameToId = {};
    for (const { skill } of studentSkills) {
      if (skill) skillNameToId[skill.properties.name] = skill.properties.id;
    }
    for (const edge of edgesArr) {
      if (edge.type === 'REQUIRES_SKILL' && skillNameToId[edge.target]) {
        edge.target = skillNameToId[edge.target];
      }
    }

    // Company nodes + OFFERS edges
    for (const comp of companies) {
      addNode(comp.properties.id, comp.properties.name, 'Company', {
        industry: comp.properties.industry,
      });
    }
    // Link companies to their internships
    for (const intern of matchedInternships) {
      const offeringComp = companies.find((c) => {
        // We need a second pass; for simplicity, we find the company edge
        return true;
      });
    }
    // Re-query OFFERS relationships cleanly
    // (Already have the data — just link company to internship via a simple lookup)
    // We'll do a lightweight second query for OFFERS links
    const offersResult = await session.run(
      `MATCH (c:Company)-[:OFFERS]->(i:Internship)
       WHERE i.id IN $internIds
       RETURN c.id AS compId, i.id AS internId`,
      { internIds: matchedInternships.map((i) => i.properties.id) }
    );
    for (const r of offersResult.records) {
      edgesArr.push({
        source: r.get('compId'),
        target: r.get('internId'),
        type: 'OFFERS',
        label: 'Offers',
      });
    }

    // City node + LOCATED_IN edge
    if (city) {
      addNode(city.properties.id, city.properties.name, 'City', { country: city.properties.country });
      edgesArr.push({
        source: studentNode.id,
        target: city.properties.id,
        type: 'LOCATED_IN',
        label: 'Located in',
      });
    }

    // Domain nodes + INTERESTED_IN edges
    for (const dom of interests) {
      addNode(dom.properties.id, dom.properties.name, 'Domain');
      edgesArr.push({
        source: studentNode.id,
        target: dom.properties.id,
        type: 'INTERESTED_IN',
        label: 'Interested in',
      });
    }

    // Internship -> Domain edges
    for (const link of internDomains) {
      const domNode = interests.find((d) => d.properties.name === link.domain);
      if (domNode) {
        edgesArr.push({
          source: link.internId,
          target: domNode.properties.id,
          type: 'IN_DOMAIN',
          label: 'In domain',
        });
      }
    }

    // Deduplicate edges
    const edgeSet = new Set();
    const edges = edgesArr.filter((e) => {
      const key = `${e.source}-${e.target}-${e.type}`;
      if (edgeSet.has(key)) return false;
      edgeSet.add(key);
      return true;
    });

    res.json({ nodes, edges });
  } catch (error) {
    console.error('GET /api/students/:id/graph error:', error.message);
    res.status(500).json({ error: 'Failed to fetch graph data', code: 'DB_ERROR' });
  } finally {
    await session.close();
  }
});

// ─── Start the server ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});