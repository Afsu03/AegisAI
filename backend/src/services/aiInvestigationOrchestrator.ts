import { PrismaClient, LogRecord, ThreatEvent, ThreatAnalysis, IncidentSummary, RiskAssessment, ResponseRecommendation } from '../generated/prisma/client';
import { ThreatAnalysisAgent } from '../lib/ai/agent';
import { SummarizationAgent } from '../lib/ai/summarizationAgent';
import { RiskAssessmentAgent } from '../lib/ai/riskAssessmentAgent';
import { RecommendationAgent } from '../lib/ai/recommendationAgent';
import { resolveAIProvider } from '../lib/ai/providers';
import { AIProvider } from '../lib/ai/types';

export type StageStatus = 'NOT_STARTED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type OverallStatus = 'NOT_STARTED' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';

export interface AIInvestigationResult {
  success: boolean;
  threatId: string;
  overallStatus: OverallStatus;
  stages: {
    agent1: { status: StageStatus; name: string; error?: string };
    agent2: { status: StageStatus; name: string; error?: string };
    agent3: { status: StageStatus; name: string; error?: string };
    agent4: { status: StageStatus; name: string; error?: string };
  };
  outputs: {
    threatAnalysis: ThreatAnalysis | null;
    incidentSummary: IncidentSummary | null;
    riskAssessment: RiskAssessment | null;
    recommendation: ResponseRecommendation | null;
  };
  error?: string;
}

export async function runAIInvestigation(
  threatId: string,
  prisma: PrismaClient,
  userId?: string
): Promise<AIInvestigationResult> {
  // 1. Fetch threat event with ownership tree
  const threat = await prisma.threatEvent.findUnique({
    where: { id: threatId },
    include: {
      file: {
        include: {
          analysis: true,
        },
      },
    },
  });

  if (!threat) {
    throw new Error(`Threat event "${threatId}" not found.`);
  }

  // 2. Fetch associated LogRecords if sourceRecordIds exist
  let records: LogRecord[] = [];
  if (threat.sourceRecordIds) {
    const recordIds = Array.isArray(threat.sourceRecordIds)
      ? (threat.sourceRecordIds as string[])
      : JSON.parse(threat.sourceRecordIds as string);

    if (recordIds.length > 0) {
      records = await prisma.logRecord.findMany({
        where: { id: { in: recordIds } },
        orderBy: { rowIndex: 'asc' },
      });
    }
  }

  // Initial status tracking
  const result: AIInvestigationResult = {
    success: false,
    threatId,
    overallStatus: 'RUNNING',
    stages: {
      agent1: { status: 'NOT_STARTED', name: 'Threat Analysis' },
      agent2: { status: 'NOT_STARTED', name: 'Incident Summary' },
      agent3: { status: 'NOT_STARTED', name: 'Risk Assessment' },
      agent4: { status: 'NOT_STARTED', name: 'Response Recommendation' },
    },
    outputs: {
      threatAnalysis: null,
      incidentSummary: null,
      riskAssessment: null,
      recommendation: null,
    },
  };

  // Check cache for existing stages
  let existingAnalysis = await prisma.threatAnalysis.findFirst({
    where: { threatEventId: threatId },
    orderBy: { createdAt: 'desc' },
  });
  let existingSummary = await prisma.incidentSummary.findFirst({
    where: { threatEventId: threatId },
    orderBy: { createdAt: 'desc' },
  });
  let existingRisk = await prisma.riskAssessment.findFirst({
    where: { threatEventId: threatId },
    orderBy: { createdAt: 'desc' },
  });
  let existingRec = await prisma.responseRecommendation.findFirst({
    where: { threatEventId: threatId },
    orderBy: { createdAt: 'desc' },
  });

  // Fast path: If all 4 stages are cached, return immediately without resolving provider or calling LLMs
  if (existingAnalysis && existingSummary && existingRisk && existingRec) {
    result.stages.agent1.status = 'COMPLETED';
    result.stages.agent2.status = 'COMPLETED';
    result.stages.agent3.status = 'COMPLETED';
    result.stages.agent4.status = 'COMPLETED';
    result.outputs.threatAnalysis = existingAnalysis;
    result.outputs.incidentSummary = existingSummary;
    result.outputs.riskAssessment = existingRisk;
    result.outputs.recommendation = existingRec;
    result.overallStatus = 'COMPLETED';
    result.success = true;
    return result;
  }

  // Fresh execution needed: Resolve AI Provider for the threat owner
  const effectiveUserId = userId || threat.file?.analysis?.userId;
  let resolvedAI: { provider: AIProvider; isBYOK: boolean } | null = null;

  try {
    resolvedAI = await resolveAIProvider(effectiveUserId, prisma);
  } catch (err: any) {
    result.overallStatus = 'FAILED';
    result.error = err?.message || 'Failed to resolve AI provider.';
    return result;
  }

  const aiProvider = resolvedAI.provider;

  // ── STEP 1: Agent 01 — Threat Analysis ─────────────────────────────────────
  if (existingAnalysis) {
    result.stages.agent1.status = 'COMPLETED';
    result.outputs.threatAnalysis = existingAnalysis;
  } else {
    try {
      result.stages.agent1.status = 'RUNNING';
      const agent1 = new ThreatAnalysisAgent(aiProvider);
      const analysisData = await agent1.analyzeThreat(threat, records);

      existingAnalysis = await prisma.threatAnalysis.create({
        data: {
          threatEventId: threatId,
          assessment: analysisData.assessment,
          threatType: analysisData.threatType,
          summary: analysisData.summary,
          reasoning: analysisData.reasoning,
          evidence: analysisData.evidence,
          potentialImpact: analysisData.potentialImpact,
          uncertainties: analysisData.uncertainties,
          recommendedInvestigation: analysisData.recommendedInvestigation,
          confidence: analysisData.confidence,
          model: analysisData.model,
          promptVersion: analysisData.promptVersion,
        },
      });

      result.stages.agent1.status = 'COMPLETED';
      result.outputs.threatAnalysis = existingAnalysis;
    } catch (err: any) {
      result.stages.agent1.status = 'FAILED';
      result.stages.agent1.error = err?.message || 'Agent 01 Threat Analysis failed.';
      result.overallStatus = 'FAILED';
      result.error = `Agent 01 failed: ${err?.message}`;
      return result;
    }
  }

  // ── STEP 2: Agent 02 — Incident Summary ────────────────────────────────────
  if (existingSummary) {
    result.stages.agent2.status = 'COMPLETED';
    result.outputs.incidentSummary = existingSummary;
  } else {
    try {
      result.stages.agent2.status = 'RUNNING';
      const agent2 = new SummarizationAgent(aiProvider);
      const summaryData = await agent2.generateSummary(threat, existingAnalysis, records);

      existingSummary = await prisma.incidentSummary.create({
        data: {
          threatEventId: threatId,
          threatAnalysisId: existingAnalysis.id,
          incidentTitle: summaryData.incidentTitle,
          executiveSummary: summaryData.executiveSummary,
          timelineSummary: summaryData.timelineSummary,
          target: summaryData.target,
          source: summaryData.source,
          observedActivity: summaryData.observedActivity,
          impactSummary: summaryData.impactSummary,
          evidenceSummary: summaryData.evidenceSummary,
          uncertainties: summaryData.uncertainties,
          model: summaryData.model,
          promptVersion: summaryData.promptVersion,
        },
      });

      result.stages.agent2.status = 'COMPLETED';
      result.outputs.incidentSummary = existingSummary;
    } catch (err: any) {
      result.stages.agent2.status = 'FAILED';
      result.stages.agent2.error = err?.message || 'Agent 02 Incident Summary failed.';
      result.overallStatus = 'PARTIAL';
      result.error = `Agent 02 failed: ${err?.message}`;
      return result;
    }
  }

  // ── STEP 3: Agent 03 — Risk Assessment ─────────────────────────────────────
  if (existingRisk) {
    result.stages.agent3.status = 'COMPLETED';
    result.outputs.riskAssessment = existingRisk;
  } else {
    try {
      result.stages.agent3.status = 'RUNNING';
      const agent3 = new RiskAssessmentAgent(aiProvider);
      const riskData = await agent3.assessRisk(threat, existingAnalysis, existingSummary);

      existingRisk = await prisma.riskAssessment.create({
        data: {
          threatEventId: threatId,
          threatAnalysisId: existingAnalysis.id,
          incidentSummaryId: existingSummary.id,
          likelihood: riskData.likelihood,
          impact: riskData.impact,
          targetCriticality: riskData.targetCriticality,
          evidenceStrength: riskData.evidenceStrength,
          riskScore: riskData.riskScore,
          riskLevel: riskData.riskLevel,
          priority: riskData.priority,
          rationale: riskData.rationale,
          riskFactors: riskData.riskFactors,
          uncertainties: riskData.uncertainties,
          model: riskData.model,
          promptVersion: riskData.promptVersion,
        },
      });

      result.stages.agent3.status = 'COMPLETED';
      result.outputs.riskAssessment = existingRisk;
    } catch (err: any) {
      result.stages.agent3.status = 'FAILED';
      result.stages.agent3.error = err?.message || 'Agent 03 Risk Assessment failed.';
      result.overallStatus = 'PARTIAL';
      result.error = `Agent 03 failed: ${err?.message}`;
      return result;
    }
  }

  // ── STEP 4: Agent 04 — Response Recommendation ────────────────────────────
  if (existingRec) {
    result.stages.agent4.status = 'COMPLETED';
    result.outputs.recommendation = existingRec;
  } else {
    try {
      result.stages.agent4.status = 'RUNNING';
      const agent4 = new RecommendationAgent(aiProvider);
      const recData = await agent4.generateRecommendations(
        threat,
        existingAnalysis,
        existingSummary,
        existingRisk
      );

      existingRec = await prisma.responseRecommendation.create({
        data: {
          threatEventId: threatId,
          threatAnalysisId: existingAnalysis.id,
          incidentSummaryId: existingSummary.id,
          riskAssessmentId: existingRisk.id,
          immediateActions: recData.immediateActions,
          investigationSteps: recData.investigationSteps,
          containmentOptions: recData.containmentOptions,
          mitigationActions: recData.mitigationActions,
          monitoringRecommendations: recData.monitoringRecommendations,
          overallRecommendation: recData.overallRecommendation,
          humanReviewRequired: true,
          uncertainties: recData.uncertainties,
          model: recData.model,
          promptVersion: recData.promptVersion,
        },
      });

      result.stages.agent4.status = 'COMPLETED';
      result.outputs.recommendation = existingRec;
    } catch (err: any) {
      result.stages.agent4.status = 'FAILED';
      result.stages.agent4.error = err?.message || 'Agent 04 Response Recommendation failed.';
      result.overallStatus = 'PARTIAL';
      result.error = `Agent 04 failed: ${err?.message}`;
      return result;
    }
  }

  // All 4 agents executed or loaded successfully
  result.overallStatus = 'COMPLETED';
  result.success = true;
  return result;
}

export async function getAIInvestigationStatus(
  threatId: string,
  prisma: PrismaClient
): Promise<AIInvestigationResult> {
  const threat = await prisma.threatEvent.findUnique({
    where: { id: threatId },
  });

  if (!threat) {
    throw new Error(`Threat event "${threatId}" not found.`);
  }

  const [threatAnalysis, incidentSummary, riskAssessment, recommendation] = await Promise.all([
    prisma.threatAnalysis.findFirst({ where: { threatEventId: threatId }, orderBy: { createdAt: 'desc' } }),
    prisma.incidentSummary.findFirst({ where: { threatEventId: threatId }, orderBy: { createdAt: 'desc' } }),
    prisma.riskAssessment.findFirst({ where: { threatEventId: threatId }, orderBy: { createdAt: 'desc' } }),
    prisma.responseRecommendation.findFirst({ where: { threatEventId: threatId }, orderBy: { createdAt: 'desc' } }),
  ]);

  const stages = {
    agent1: {
      status: (threatAnalysis ? 'COMPLETED' : 'NOT_STARTED') as StageStatus,
      name: 'Threat Analysis',
    },
    agent2: {
      status: (incidentSummary ? 'COMPLETED' : 'NOT_STARTED') as StageStatus,
      name: 'Incident Summary',
    },
    agent3: {
      status: (riskAssessment ? 'COMPLETED' : 'NOT_STARTED') as StageStatus,
      name: 'Risk Assessment',
    },
    agent4: {
      status: (recommendation ? 'COMPLETED' : 'NOT_STARTED') as StageStatus,
      name: 'Response Recommendation',
    },
  };

  const completedCount = [threatAnalysis, incidentSummary, riskAssessment, recommendation].filter(Boolean).length;
  let overallStatus: OverallStatus = 'NOT_STARTED';

  if (completedCount === 4) {
    overallStatus = 'COMPLETED';
  } else if (completedCount > 0) {
    overallStatus = 'PARTIAL';
  }

  return {
    success: completedCount > 0,
    threatId,
    overallStatus,
    stages,
    outputs: {
      threatAnalysis,
      incidentSummary,
      riskAssessment,
      recommendation,
    },
  };
}
