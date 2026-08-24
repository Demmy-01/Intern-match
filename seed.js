require('dotenv').config();
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.COGNODB_URI,
  neo4j.auth.basic(process.env.COGNODB_USER, process.env.COGNODB_PASSWORD)
);

const int = (n) => neo4j.int(n);

async function seedDatabase() {
  const session = driver.session();
  try {
    // STEP 1 — Clear existing data
    console.log('🗑️  Clearing existing data...');
    await session.run('MATCH (n) DETACH DELETE n');

    // STEP 2 — Create uniqueness constraints (idempotent with IF NOT EXISTS)
    console.log('🔑 Creating constraints...');
    const constraints = [
      'CREATE CONSTRAINT IF NOT EXISTS FOR (s:Student)    REQUIRE s.id IS UNIQUE',
      'CREATE CONSTRAINT IF NOT EXISTS FOR (sk:Skill)     REQUIRE sk.id IS UNIQUE',
      'CREATE CONSTRAINT IF NOT EXISTS FOR (d:Domain)     REQUIRE d.id IS UNIQUE',
      'CREATE CONSTRAINT IF NOT EXISTS FOR (c:Company)    REQUIRE c.id IS UNIQUE',
      'CREATE CONSTRAINT IF NOT EXISTS FOR (ci:City)      REQUIRE ci.id IS UNIQUE',
      'CREATE CONSTRAINT IF NOT EXISTS FOR (i:Internship) REQUIRE i.id IS UNIQUE',
    ];
    for (const cql of constraints) {
      await session.run(cql);
    }

    // STEP 3 — Seed Skills (14 skills across 5 categories)
    console.log('⚙️  Seeding Skills...');
    const skills = [
      { id: 'sk_1',  name: 'React.js',       category: 'Frontend' },
      { id: 'sk_2',  name: 'Node.js',        category: 'Backend' },
      { id: 'sk_3',  name: 'Python',         category: 'Backend' },
      { id: 'sk_4',  name: 'Figma',          category: 'Design' },
      { id: 'sk_5',  name: 'SQL',            category: 'Database' },
      { id: 'sk_6',  name: 'TypeScript',     category: 'Frontend' },
      { id: 'sk_7',  name: 'Docker',         category: 'DevOps' },
      { id: 'sk_8',  name: 'GraphQL',        category: 'Backend' },
      { id: 'sk_9',  name: 'AWS',            category: 'DevOps' },
      { id: 'sk_10', name: 'TensorFlow',     category: 'Data Science' },
      { id: 'sk_11', name: 'Pandas',         category: 'Data Science' },
      { id: 'sk_12', name: 'CSS/Tailwind',   category: 'Frontend' },
      { id: 'sk_13', name: 'MongoDB',        category: 'Database' },
      { id: 'sk_14', name: 'Git',            category: 'DevOps' },
    ];
    await session.run(
      `UNWIND $skills AS s
       CREATE (:Skill {id: s.id, name: s.name, category: s.category})`,
      { skills }
    );

    // STEP 4 — Seed Domains (4 industry verticals)
    console.log('🏷️  Seeding Domains...');
    const domains = [
      { id: 'dom_1', name: 'Web Development',  description: 'Full-stack web application development' },
      { id: 'dom_2', name: 'Data Science',      description: 'Machine learning, analytics & AI' },
      { id: 'dom_3', name: 'UI/UX Design',      description: 'User interface and experience design' },
      { id: 'dom_4', name: 'Cloud Engineering', description: 'Cloud infrastructure and DevOps' },
    ];
    await session.run(
      `UNWIND $domains AS d
       CREATE (:Domain {id: d.id, name: d.name, description: d.description})`,
      { domains }
    );

    // STEP 5 — Seed Cities (3 cities)
    console.log('🌆 Seeding Cities...');
    const cities = [
      { id: 'city_1', name: 'San Francisco', country: 'USA' },
      { id: 'city_2', name: 'Lagos',         country: 'Nigeria' },
      { id: 'city_3', name: 'London',        country: 'UK' },
    ];
    await session.run(
      `UNWIND $cities AS c
       CREATE (:City {id: c.id, name: c.name, country: c.country})`,
      { cities }
    );

    // STEP 6 - Seed Companies (5 companies) + BASED_IN relationships
    console.log('🏢 Seeding Companies...');
    const companies = [
      { id: 'comp_1', name: 'TechCorp',      industry: 'Software',       website: 'https://techcorp.io',    size: 'Large',  cityId: 'city_1' },
      { id: 'comp_2', name: 'DesignHub',     industry: 'UI/UX Design',   website: 'https://designhub.co',   size: 'Medium', cityId: 'city_3' },
      { id: 'comp_3', name: 'DataMinds',     industry: 'Data Analytics', website: 'https://dataminds.ai',   size: 'Medium', cityId: 'city_1' },
      { id: 'comp_4', name: 'CloudNova',     industry: 'Cloud Services', website: 'https://cloudnova.dev',  size: 'Large',  cityId: 'city_3' },
      { id: 'comp_5', name: 'AfroTech Labs', industry: 'Software',       website: 'https://afrotechlabs.ng', size: 'Startup', cityId: 'city_2' },
    ];
    await session.run(
      `UNWIND $companies AS c
       CREATE (comp:Company {id: c.id, name: c.name, industry: c.industry, website: c.website, size: c.size})
       WITH comp, c
       MATCH (city:City {id: c.cityId})
       CREATE (comp)-[:BASED_IN]->(city)`,
      { companies }
    );

   // STEP 7 - Seed Internships (8 roles) + OFFERS, IN_DOMAIN, REQUIRES_SKILL
    console.log('💼 Seeding Internships...');
    const internships = [
      {
        id: 'int_1', title: 'Full Stack Engineering Intern', description: 'Build and ship production web features.',
        stipend: 1500, duration: '3 months', mode: 'Remote',
        companyId: 'comp_1', domainId: 'dom_1',
        requiredSkills: [
          { skillId: 'sk_1',  importance: 'Required' },   
          { skillId: 'sk_2',  importance: 'Required' },   
          { skillId: 'sk_5',  importance: 'Required' },   
          { skillId: 'sk_6',  importance: 'Optional' },   
          { skillId: 'sk_14', importance: 'Optional' },   
        ],
      },
      {
        id: 'int_2', title: 'Frontend Developer Intern', description: 'Craft beautiful, accessible user interfaces.',
        stipend: 1200, duration: '3 months', mode: 'Hybrid',
        companyId: 'comp_1', domainId: 'dom_1',
        requiredSkills: [
          { skillId: 'sk_1',  importance: 'Required' },   
          { skillId: 'sk_6',  importance: 'Required' },  
          { skillId: 'sk_12', importance: 'Required' },   
          { skillId: 'sk_4',  importance: 'Optional' },   
        ],
      },
      {
        id: 'int_3', title: 'UI/UX Design Intern', description: 'Design intuitive interfaces for web products.',
        stipend: 1000, duration: '2 months', mode: 'Remote',
        companyId: 'comp_2', domainId: 'dom_3',
        requiredSkills: [
          { skillId: 'sk_4',  importance: 'Required' },   
          { skillId: 'sk_12', importance: 'Optional' },   
          { skillId: 'sk_1',  importance: 'Optional' },   
        ],
      },
      {
        id: 'int_4', title: 'Data Science Intern', description: 'Analyze datasets and build predictive ML models.',
        stipend: 1800, duration: '4 months', mode: 'Remote',
        companyId: 'comp_3', domainId: 'dom_2',
        requiredSkills: [
          { skillId: 'sk_3',  importance: 'Required' },   
          { skillId: 'sk_10', importance: 'Required' },  
          { skillId: 'sk_11', importance: 'Required' },   
          { skillId: 'sk_5',  importance: 'Optional' },   
        ],
      },
      {
        id: 'int_5', title: 'Cloud DevOps Intern', description: 'Manage CI/CD pipelines and cloud infrastructure.',
        stipend: 1600, duration: '3 months', mode: 'Hybrid',
        companyId: 'comp_4', domainId: 'dom_4',
        requiredSkills: [
          { skillId: 'sk_7',  importance: 'Required' },   
          { skillId: 'sk_9',  importance: 'Required' },  
          { skillId: 'sk_14', importance: 'Required' },   
          { skillId: 'sk_2',  importance: 'Optional' },   
        ],
      },
      {
        id: 'int_6', title: 'Backend API Intern', description: 'Design and implement scalable REST & GraphQL APIs.',
        stipend: 1400, duration: '3 months', mode: 'On-site',
        companyId: 'comp_5', domainId: 'dom_1',
        requiredSkills: [
          { skillId: 'sk_2',  importance: 'Required' },   
          { skillId: 'sk_8',  importance: 'Required' },   
          { skillId: 'sk_13', importance: 'Required' },  
          { skillId: 'sk_7',  importance: 'Optional' },   
        ],
      },
      {
        id: 'int_7', title: 'Machine Learning Intern', description: 'Research and prototype ML solutions.',
        stipend: 2000, duration: '6 months', mode: 'Remote',
        companyId: 'comp_3', domainId: 'dom_2',
        requiredSkills: [
          { skillId: 'sk_3',  importance: 'Required' },   
          { skillId: 'sk_10', importance: 'Required' },  
          { skillId: 'sk_11', importance: 'Required' },   
          { skillId: 'sk_9',  importance: 'Optional' },   
          { skillId: 'sk_7',  importance: 'Optional' },   
        ],
      },
      {
        id: 'int_8', title: 'Product Design Intern', description: 'Own design sprints from research to high-fidelity mocks.',
        stipend: 1100, duration: '3 months', mode: 'Hybrid',
        companyId: 'comp_2', domainId: 'dom_3',
        requiredSkills: [
          { skillId: 'sk_4',  importance: 'Required' },  
          { skillId: 'sk_12', importance: 'Required' },   
        ],
      },
    ];

    // Create each internship, link to company, domain, and required skills
    for (const intern of internships) {
      // Create the Internship node and connect to Company and Domain
      await session.run(
        `MATCH (comp:Company {id: $companyId})
         MATCH (dom:Domain {id: $domainId})
         CREATE (i:Internship {
           id: $id, title: $title, description: $description,
           stipend: $stipend, duration: $duration, mode: $mode
         })
         CREATE (comp)-[:OFFERS]->(i)
         CREATE (i)-[:IN_DOMAIN]->(dom)`,
        {
          id: intern.id,
          title: intern.title,
          description: intern.description,
          stipend: int(intern.stipend),
          duration: intern.duration,
          mode: intern.mode,
          companyId: intern.companyId,
          domainId: intern.domainId,
        }
      );

      // Connect required skills with importance weight
      // Uses UNWIND to batch-create REQUIRES_SKILL relationships
      await session.run(
        `UNWIND $skills AS s
         MATCH (i:Internship {id: $internId})
         MATCH (sk:Skill {id: s.skillId})
         CREATE (i)-[:REQUIRES_SKILL {importance: s.importance}]->(sk)`,
        { internId: intern.id, skills: intern.requiredSkills }
      );
    }

    // STEP 8 - Seed Students (6 diverse personas) + relationships
    console.log('👩‍🎓 Seeding Students...');
    const students = [
      {
        id: 'stu_1', name: 'Alex Johnson', email: 'alex@example.com',
        bio: 'Full-stack enthusiast passionate about building web apps.', gpa: 3.8,
        cityId: 'city_1',
        domainIds: ['dom_1'],
        skills: [
          { skillId: 'sk_1',  proficiency: 'Advanced' },     
          { skillId: 'sk_2',  proficiency: 'Advanced' },      
          { skillId: 'sk_5',  proficiency: 'Intermediate' }, 
          { skillId: 'sk_6',  proficiency: 'Intermediate' }, 
          { skillId: 'sk_14', proficiency: 'Advanced' },      
        ],
      },
      {
        id: 'stu_2', name: 'Sam Taylor', email: 'sam@example.com',
        bio: 'Design-minded developer who bridges code and creativity.', gpa: 3.5,
        cityId: 'city_3',
        domainIds: ['dom_3', 'dom_1'],
        skills: [
          { skillId: 'sk_4',  proficiency: 'Advanced' },      
          { skillId: 'sk_1',  proficiency: 'Intermediate' },  
          { skillId: 'sk_12', proficiency: 'Advanced' },     
          { skillId: 'sk_14', proficiency: 'Beginner' },     
        ],
      },
      {
        id: 'stu_3', name: 'Priya Sharma', email: 'priya@example.com',
        bio: 'Data science student with a love for machine learning.', gpa: 3.9,
        cityId: 'city_1',
        domainIds: ['dom_2'],
        skills: [
          { skillId: 'sk_3',  proficiency: 'Advanced' },     
          { skillId: 'sk_10', proficiency: 'Intermediate' },  
          { skillId: 'sk_11', proficiency: 'Advanced' },     
          { skillId: 'sk_5',  proficiency: 'Intermediate' }, 
        ],
      },
      {
        id: 'stu_4', name: 'Chidi Okonkwo', email: 'chidi@example.com',
        bio: 'Backend and DevOps engineer who loves infrastructure.', gpa: 3.6,
        cityId: 'city_2',
        domainIds: ['dom_4', 'dom_1'],
        skills: [
          { skillId: 'sk_2',  proficiency: 'Advanced' },  
          { skillId: 'sk_7',  proficiency: 'Intermediate' }, 
          { skillId: 'sk_9',  proficiency: 'Beginner' },      
          { skillId: 'sk_8',  proficiency: 'Intermediate' },  
          { skillId: 'sk_13', proficiency: 'Advanced' },      
          { skillId: 'sk_14', proficiency: 'Advanced' },     
        ],
      },
      {
        id: 'stu_5', name: 'Mia Chen', email: 'mia@example.com',
        bio: 'Frontend specialist exploring the intersection of design and code.', gpa: 3.7,
        cityId: 'city_1',
        domainIds: ['dom_1', 'dom_3'],
        skills: [
          { skillId: 'sk_1',  proficiency: 'Advanced' },        
          { skillId: 'sk_6',  proficiency: 'Advanced' },    
          { skillId: 'sk_12', proficiency: 'Intermediate' },  
          { skillId: 'sk_4',  proficiency: 'Beginner' },     
          { skillId: 'sk_14', proficiency: 'Intermediate' },  
        ],
      },
      {
        id: 'stu_6', name: 'Jordan Lee', email: 'jordan@example.com',
        bio: 'Generalist developer eager to explore every corner of tech.', gpa: 3.3,
        cityId: 'city_3',
        domainIds: ['dom_1', 'dom_4'],
        skills: [
          { skillId: 'sk_2',  proficiency: 'Beginner' },    
          { skillId: 'sk_3',  proficiency: 'Beginner' },      
          { skillId: 'sk_14', proficiency: 'Intermediate' }, 
        ],
      },
    ];

    for (const stu of students) {
      // Create the Student node and connect to City
      await session.run(
        `MATCH (city:City {id: $cityId})
         CREATE (s:Student {id: $id, name: $name, email: $email, bio: $bio, gpa: $gpa})
         CREATE (s)-[:LOCATED_IN]->(city)`,
        {
          id: stu.id,
          name: stu.name,
          email: stu.email,
          bio: stu.bio,
          gpa: stu.gpa,
          cityId: stu.cityId,
        }
      );

      // Connect student to their skills with proficiency level
      await session.run(
        `UNWIND $skills AS s
         MATCH (student:Student {id: $studentId})
         MATCH (skill:Skill {id: s.skillId})
         CREATE (student)-[:HAS_SKILL {proficiencyLevel: s.proficiency}]->(skill)`,
        { studentId: stu.id, skills: stu.skills }
      );

      // Connect student to domains of interest
      await session.run(
        `UNWIND $domainIds AS domId
         MATCH (student:Student {id: $studentId})
         MATCH (domain:Domain {id: domId})
         CREATE (student)-[:INTERESTED_IN]->(domain)`,
        { studentId: stu.id, domainIds: stu.domainIds }
      );
    }

    console.log('');
    console.log('✅ Database seeded successfully!');
    console.log('   → 14 Skills, 4 Domains, 3 Cities');
    console.log('   → 5 Companies, 8 Internships');
    console.log('   → 6 Students with skills, interests & locations');
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

seedDatabase();