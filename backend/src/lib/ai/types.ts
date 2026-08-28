import { z } from 'zod';

export const ThreatAnalysisSchema = z.object({
  assessment: z.string().min(1, 'assessment is required'),
  threatType: z.string().min(1, 'threatType is required'),
  summary: z.string().min(1, 'summary is required'),
  reasoning: z.string().min(1, 'reasoning is required'),
  evidence: z.array(z.string()),
  potentialImpact: z.string().min(1, 'potentialImpact is required'),
  uncertainties: z.array(z.string()),
  recommendedInvestigation: z.array(z.string()),
  confidence: z.number().min(0.0).max(1.0),
});

export type ThreatAnalysisData = z.infer<typeof ThreatAnalysisSchema>;

export const IncidentSummarySchema = z.object({

  incidentTitle: z.string().min(1, 'incidentTitle is required'),
  executiveSummary: z.string().min(1, 'executiveSummary is required'),
  timelineSummary: z.string().min(1, 'timelineSummary is required'),
  target: z.string().min(1, 'target is required'),
  source: z.string().min(1, 'source is required'),
  observedActivity: z.string().min(1, 'observedActivity is required'),
  impactSummary: z.string().min(1, 'impactSummary is required'),
  evidenceSummary: z.array(z.string()),
  uncertainties: z.array(z.string()),
});

export type IncidentSummaryData = z.infer<typeof IncidentSummarySchema>;

export const RiskAssessmentCategoricalSchema = z.object({
  likelihood: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  impact: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  targetCriticality: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNKNOWN']),
  evidenceStrength: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  rationale: z.string().min(1, 'rationale is required'),
  riskFactors: z.array(z.string()),
  uncertainties: z.array(z.string()),
});

export type RiskAssessmentCategoricalData = z.infer<typeof RiskAssessmentCategoricalSchema>;

export const ImmediateActionSchema = z.object({
  action: z.string().min(1, 'action is required'),
  reason: z.string().min(1, 'reason is required'),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
});

export const ActionReasonSchema = z.object({
  action: z.string().min(1, 'action is required'),
  reason: z.string().min(1, 'reason is required'),
});

export const ContainmentOptionSchema = z.object({
  action: z.string().min(1, 'action is required'),
  condition: z.string().min(1, 'condition is required'),
  reason: z.string().min(1, 'reason is required'),
});

export const ResponseRecommendationSchema = z.object({
  immediateActions: z.array(ImmediateActionSchema),
  investigationSteps: z.array(ActionReasonSchema),
  containmentOptions: z.array(ContainmentOptionSchema),
  mitigationActions: z.array(ActionReasonSchema),
  monitoringRecommendations: z.array(ActionReasonSchema),
  overallRecommendation: z.string().min(1, 'overallRecommendation is required'),
  humanReviewRequired: z.boolean().default(true),
  uncertainties: z.array(z.string()),
});

export type ResponseRecommendationData = z.infer<typeof ResponseRecommendationSchema>;

export interface AIProvider {
  analyzeThreat(prompt: string, systemPrompt: string): Promise<string>;
  getModelName(): string;
}



