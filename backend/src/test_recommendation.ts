import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { SummarizationAgent } from './lib/ai/summarizationAgent';
import { RiskAssessmentAgent } from './lib/ai/riskAssessmentAgent';
import { RecommendationAgent } from './lib/ai/recommendationAgent';

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

  // Fetch Agent 1 output
  const latestAnalysis = await prisma.threatAnalysis.findFirst({
    where: { threatEventId: threat.id },
    orderBy: { createdAt: 'desc' }
  });

  if (!latestAnalysis) {
    console.log('No ThreatAnalysis found.');
    await pool.end();
    return;
  }
  console.log(`Agent 1 ThreatAnalysis ID: ${latestAnalysis.id}`);

  // Fetch or generate Agent 2 output
  let latestSummary = await prisma.incidentSummary.findFirst({
    where: { threatEventId: threat.id },
    orderBy: { createdAt: 'desc' }
  });

  if (!latestSummary) {
    console.log('Generating Agent 2 IncidentSummary...');
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
  }
  console.log(`Agent 2 IncidentSummary ID: ${latestSummary.id}`);

  // Fetch or generate Agent 3 output
  let latestRisk = await prisma.riskAssessment.findFirst({
    where: { threatEventId: threat.id },
    orderBy: { createdAt: 'desc' }
  });

  if (!latestRisk) {
    console.log('Generating Agent 3 RiskAssessment...');
    const riskAgent = new RiskAssessmentAgent();
    const riskResult = await riskAgent.assessRisk(threat, latestAnalysis, latestSummary);
    latestRisk = await prisma.riskAssessment.create({
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
  }
  console.log(`Agent 3 RiskAssessment ID: ${latestRisk.id}`);

  // Invoke Agent 4 (RecommendationAgent)
  console.log('\n--- INVOKING RECOMMENDATION AGENT (AGENT 4) ---');
  const agent = new RecommendationAgent();
  const recResult = await agent.generateRecommendations(threat, latestAnalysis, latestSummary, latestRisk);

  console.log('\n--- AGENT 4 RESULT ---');
  console.log(JSON.stringify(recResult, null, 2));

  // Save to Neon DB
  console.log('\n--- SAVING RECOMMENDATION TO NEON POSTGRESQL ---');
  const saved = await prisma.responseRecommendation.create({
    data: {
      threatEventId: threat.id,
      threatAnalysisId: latestAnalysis.id,
      incidentSummaryId: latestSummary.id,
      riskAssessmentId: latestRisk.id,
      immediateActions: recResult.immediateActions,
      investigationSteps: recResult.investigationSteps,
      containmentOptions: recResult.containmentOptions,
      mitigationActions: recResult.mitigationActions,
      monitoringRecommendations: recResult.monitoringRecommendations,
      overallRecommendation: recResult.overallRecommendation,
      humanReviewRequired: true,
      uncertainties: recResult.uncertainties,
      model: recResult.model,
      promptVersion: recResult.promptVersion,
    }
  });

  console.log(`Saved ResponseRecommendation ID: ${saved.id}`);

  // Test GET retrieval (Cache test)
  console.log('\n--- TESTING GET / RECOMMENDATIONS FROM NEON DB ---');
  const retrieved = await prisma.responseRecommendation.findFirst({
    where: { threatEventId: threat.id },
    orderBy: { createdAt: 'desc' }
  });

  console.log('Retrieved from DB:', retrieved?.id === saved.id ? 'SUCCESS' : 'FAILURE');
  console.log('Human Review Required:', retrieved?.humanReviewRequired);
  console.log('Overall Recommendation:', retrieved?.overallRecommendation);

  await pool.end();
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
