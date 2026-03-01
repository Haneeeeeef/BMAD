// Independent QA Agent using Google Gemini
// Reviews deliverables separately from Jarvis for unbiased validation
export const runtime = "edge"

import { requireAuth } from "@/lib/auth"
import { DeliverableType } from "@/lib/bmad-types"
import { QA_CRITERIA } from "@/lib/qa-validation"

// Build QA prompt for Gemini
function buildGeminiQAPrompt(
  deliverableType: DeliverableType,
  documentContent: string,
  chatHistory: string,
  projectName: string
): string {
  const criteria = QA_CRITERIA[deliverableType]
  if (!criteria) {
    return `Review this ${deliverableType} document and provide feedback.`
  }

  const criteriaList = criteria
    .map((c, i) => `${i + 1}. ${c.check} ${c.required ? "(REQUIRED)" : "(OPTIONAL)"}: ${c.description}`)
    .join("\n")

  return `You are an independent QA Agent reviewing a ${deliverableType} document.
Your job is to provide an UNBIASED assessment - you were NOT involved in creating this document.

## PROJECT: ${projectName}

## DOCUMENT TO REVIEW:
${documentContent}

## CONVERSATION CONTEXT (what the user provided):
${chatHistory}

## VALIDATION CRITERIA:
${criteriaList}

## YOUR TASK:
1. Read the document and conversation carefully
2. Evaluate each criterion above
3. For each criterion, determine:
   - PASS: Criterion is fully met with quality content
   - WARN: Criterion is partially met or could be improved
   - FAIL: Criterion is not met (only for REQUIRED items)

4. Output your validation in this EXACT format:

---VALIDATION_START---
CRITERION: [criterion_id]
STATUS: PASS|WARN|FAIL
MESSAGE: Brief explanation
SUGGESTION: How to improve (if WARN or FAIL)
---
[Continue for all criteria]
---VALIDATION_END---

OVERALL_SCORE: [0-100]
SUMMARY: [2-3 sentence overall assessment]

5. Be HONEST and CRITICAL - your value is in catching issues the author missed
6. Be SPECIFIC - reference exact sections when noting issues
7. Focus on SUBSTANCE not formatting

BEGIN VALIDATION NOW.`
}

export async function POST(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof Response) return auth

  const geminiKey = process.env.GEMINI_API_KEY

  if (!geminiKey) {
    return new Response(
      JSON.stringify({ error: "Gemini API not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }

  try {
    const body = await request.json()
    const {
      deliverableType,
      documentContent,
      chatHistory,
      projectName,
    } = body as {
      deliverableType: DeliverableType
      documentContent: string
      chatHistory: string
      projectName: string
    }

    if (!deliverableType || !documentContent) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const prompt = buildGeminiQAPrompt(
      deliverableType,
      documentContent,
      chatHistory || "",
      projectName || "Unknown"
    )

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000,
          },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error("Gemini API error:", error)
      return new Response(
        JSON.stringify({ error: "Gemini API failed", details: error }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

    return new Response(
      JSON.stringify({
        success: true,
        content,
        model: "gemini-2.0-flash"
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("QA Gemini error:", error)
    return new Response(
      JSON.stringify({ error: "Failed to run QA validation" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
