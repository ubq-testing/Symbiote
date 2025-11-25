import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { WorkerEnv, WorkflowEnv } from "../../types/env";
import { PluginSettings } from "../../types/plugin-input";

type SymbioteEnv = WorkerEnv | WorkflowEnv;

export interface MentionAssessmentRequest {
  hostUsername: string;
  notificationReason: string;
  notificationType: string;
  repoFullName?: string | null;
  subjectTitle?: string | null;
  subjectUrl?: string | null;
  latestCommentUrl?: string | null;
  mentionAuthor?: string | null;
  mentionText?: string | null;
  unread: boolean;
  createdAt?: string;
  additionalContext?: string[];
}

export type MentionPriority = "low" | "medium" | "high";

export interface MentionAssessmentResponse {
  shouldAct: boolean;
  priority: MentionPriority;
  confidence: number;
  reason: string;
  suggestedActions: string[];
  classification: "respond" | "investigate" | "ignore";
}

export interface AiAdapter {
  classifyMention(request: MentionAssessmentRequest): Promise<MentionAssessmentResponse>;
}

const DEFAULT_ASSESSMENT: MentionAssessmentResponse = {
  shouldAct: false,
  priority: "low",
  confidence: 0.1,
  reason: "No automated assessment available.",
  suggestedActions: [],
  classification: "ignore",
};

export async function createAiAdapter(env: SymbioteEnv, config: PluginSettings): Promise<AiAdapter | null> {
  const aiConfig = config.aiConfig;
  if (!aiConfig) {
    return null;
  }

  const client = new OpenAI({
    apiKey:env.AI_API_KEY,
    baseURL: aiConfig.baseUrl,
  });

  async function classifyMention(request: MentionAssessmentRequest): Promise<MentionAssessmentResponse> {
    const messages = buildMentionMessages(request);
    try {
      const completion = await client.chat.completions.create({
        model: aiConfig.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages,
      });

      const answer = completion.choices[0]?.message?.content;
      if (!answer) {
        return DEFAULT_ASSESSMENT;
      }

      const parsed = safeParse(answer);
      return normalizeAssessment(parsed);
    } catch (error) {
      console.error(`[AI] Failed to classify mention`, { error });
      return DEFAULT_ASSESSMENT;
    }
  }

  return {
    classifyMention,
  };
}

function buildMentionMessages(request: MentionAssessmentRequest): ChatCompletionMessageParam[] {
  const { hostUsername, ...rest } = request;
  const payload = {
    hostUsername,
    notification: rest,
  };

  const systemMessage = `
You are Symbiote, an autonomous GitHub co-pilot that triages mentions for ${hostUsername}.
You must decide whether to act automatically on a pull request mention.
Respond with **strict JSON** matching:
{
  "shouldAct": boolean,
  "priority": "low" | "medium" | "high",
  "confidence": number (0-1),
  "reason": string,
  "suggestedActions": string[],
  "classification": "respond" | "investigate" | "ignore"
}

Guidance:
- "respond" means Symbiote should autonomously reply or prep work right now.
- "investigate" means gather context or prep a work plan before responding.
- "ignore" means no action is needed yet.
- Use the mention text plus metadata to infer urgency.
`.trim();

  return [
    {
      role: "system",
      content: systemMessage,
    },
    {
      role: "user",
      content: JSON.stringify(payload, null, 2),
    },
  ];
}

function safeParse(content: string): Partial<MentionAssessmentResponse> {
  try {
    return JSON.parse(content) as MentionAssessmentResponse;
  } catch (error) {
    console.error(`[AI] Unable to parse assessment JSON`, { error, content });
    return {};
  }
}

function normalizeAssessment(candidate: Partial<MentionAssessmentResponse>): MentionAssessmentResponse {
  return {
    shouldAct: typeof candidate.shouldAct === "boolean" ? candidate.shouldAct : DEFAULT_ASSESSMENT.shouldAct,
    priority: isPriority(candidate.priority) ? candidate.priority : DEFAULT_ASSESSMENT.priority,
    confidence: typeof candidate.confidence === "number" ? candidate.confidence : DEFAULT_ASSESSMENT.confidence,
    reason: typeof candidate.reason === "string" && candidate.reason.length > 0 ? candidate.reason : DEFAULT_ASSESSMENT.reason,
    suggestedActions: Array.isArray(candidate.suggestedActions) ? candidate.suggestedActions.filter((item): item is string => typeof item === "string") : DEFAULT_ASSESSMENT.suggestedActions,
    classification: isClassification(candidate.classification) ? candidate.classification : DEFAULT_ASSESSMENT.classification,
  };
}

function isPriority(value: unknown): value is MentionPriority {
  return value === "low" || value === "medium" || value === "high";
}

function isClassification(value: unknown): value is MentionAssessmentResponse["classification"] {
  return value === "respond" || value === "investigate" || value === "ignore";
}

