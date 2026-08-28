import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { SummarizationAgent } from './lib/ai/summarizationAgent';
import { RiskAssessmentAgent } from './lib/ai/riskAssessmentAgent';

async function test() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('Connecting to database...');
  await prisma.$connect();

  const threats = await prisma.threatEvent.findMany({
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${threats.length} threat events in DB.`);

  if (threats.length === 0) {
    console.log('No threat events found.');
    await pool.end();
    return;
  }

  const threat = threats[0];
  console.log(`Testing Threat ID: ${threat.id} - ${threat.title}`);
  console.log(`Original Detection Risk Score: ${threat.riskScore}`);

  // Fetch latest analysis (Agent 1)
  const latestAnalysis = await prisma.threatAnalysis.findFirst({
    where: { threatEventId: threat.id },
    orderBy: { createdAt: 'desc' }
  });

  if (!latestAnalysis) {
    console.log('No ThreatAnalysis found for this threat.');
    await pool.end();
    return;
  }
  console.log(`Found ThreatAnalysis ID: ${latestAnalysis.id}`);

  // Fetch or generate IncidentSummary (Agent 2)
  let latestSummary = await prisma.incidentSummary.findFirst({
    where: { threatEventId: threat.id },
    orderBy: { createdAt: 'desc' }
  });

  if (!latestSummary) {
    console.log('Generating IncidentSummary via Agent 2...');
    const recordIds = Array.isArray(threat.sourceRecordIds)
      ? (threat.sourceRecordIds as string[])
      : JSON.parse(threat.sourceRecordIds as string);

    const records = await prisma.logRecord.findMany({
      where: { id: { in: recordIds } },
      orderBy: { rowIndex: 'asc' }
    });

    const sumAgent = new SummarizationAgent();
    const sumResult = await sumAgent.generateSummary(threat, latestAnalysis, records);
    latestSummary = await prisma.incidentSummary.create({
      data: {
        threatEventId: threat.id,
        threatAnalysisId: latestAnalysis.id,
        incidentTitle: sumResult.incidentTitle,
        executiveSummary: sumResult.executiveSummary,
        timelineSummary: sumResult.timelineSummary,
        target: sumResult.target,
        source: sumResult.source,
        observedActivity: sumResult.observedActivity,
        impactSummary: sumResult.impactSummary,
        evidenceSummary: sumResult.evidenceSummary,
        uncertainties: sumResult.uncertainties,
        model: sumResult.model,
        promptVersion: sumResult.promptVersion,
      }
    });
    console.log(`Created IncidentSummary ID: ${latestSummary.id}`);
  } else {
    console.log(`Found IncidentSummary ID: ${latestSummary.id}`);
  }

  // Test RiskAssessmentAgent (Agent 3)
  console.log('\n--- INVOKING RISK ASSESSMENT AGENT (AGENT 3) ---');
  const agent = new RiskAssessmentAgent();
  const riskResult = await agent.assessRisk(threat, latestAnalysis, latestSummary);

  console.log('\n--- AGENT 3 RESULT (CATEGORICAL + DETERMINISTIC) ---');
  console.log(JSON.stringify(riskResult, null, 2));

  // Save to Neon DB
  console.log('\n--- SAVING RISK ASSESSMENT TO NEON POSTGRESQL ---');
  const saved = await prisma.riskAssessment.create({
    data: {
      threatEventId: threat.id,
      threatAnalysisId: latestAnalysis.id,
      incidentSummaryId: latestSummary.id,
      likelihood: riskResult.likelihood,
      impact: riskResult.impact,
      targetCriticality: riskResult.targetCriticality,
      evidenceStrength: riskResult.evidenceStrength,
      riskScore: riskResult.riskScore,
      riskLevel: riskResult.riskLevel,
      priority: riskResult.priority,
      rationale: riskResult.rationale,
      riskFactors: riskResult.riskFactors,
      uncertainties: riskResult.uncertainties,
      model: riskResult.model,
      promptVersion: riskResult.promptVersion,
    }
  });

  console.log(`Saved RiskAssessment ID: ${saved.id}`);

  // Test retrieval (Cache Test)
  console.log('\n--- TESTING GET / RISK-ASSESSMENT FROM NEON DB ---');
  const retrieved = await prisma.riskAssessment.findFirst({
    where: { threatEventId: threat.id },
    orderBy: { createdAt: 'desc' }
  });

  console.log('Retrieved from DB:', retrieved?.id === saved.id ? 'SUCCESS' : 'FAILURE');
  console.log('Calculated AI Risk Score:', retrieved?.riskScore);
  console.log('Calculated Risk Level:', retrieved?.riskLevel);
  console.log('Calculated Priority:', retrieved?.priority);

  // Verify original threat score unchanged
  const freshThreat = await prisma.threatEvent.findUnique({ where: { id: threat.id } });
  console.log('Original Threat Event Detection Risk Score (Unchanged):', freshThreat?.riskScore);

  await pool.end();
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
