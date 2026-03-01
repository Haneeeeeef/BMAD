// QA Validation Sub-Agent Configuration
// Spawns automatically after deliverable completion to validate output

import { DeliverableType, ValidationResult } from "./bmad-types"

// Validation criteria per deliverable type (Partial - not all types have QA yet)
export const QA_CRITERIA: Partial<Record<DeliverableType, Array<{
  id: string
  check: string
  description: string
  required: boolean
}>>> = {
  "product-brief": [
    { id: "vision", check: "Vision clearly defined", description: "Document has a clear, compelling vision statement", required: true },
    { id: "problem", check: "Problem statement specific", description: "Problem is well-articulated with evidence", required: true },
    { id: "users", check: "Target users identified", description: "User personas or segments are defined", required: true },
    { id: "metrics", check: "Success metrics measurable", description: "KPIs are quantitative and trackable", required: false },
    { id: "scope", check: "MVP scope bounded", description: "Clear boundaries on what's in/out of scope", required: true },
    { id: "differentiation", check: "Competitive differentiation", description: "Unique value proposition vs alternatives", required: false },
  ],
  "prd": [
    { id: "features", check: "Features prioritized", description: "Features listed with clear priority (P0/P1/P2)", required: true },
    { id: "stories", check: "User stories complete", description: "Stories follow As a/I want/So that format", required: true },
    { id: "acceptance", check: "Acceptance criteria defined", description: "Each feature has testable acceptance criteria", required: true },
    { id: "dependencies", check: "Dependencies identified", description: "Technical and business dependencies listed", required: false },
    { id: "risks", check: "Risks documented", description: "Known risks and mitigations included", required: false },
  ],
  "ux-design": [
    { id: "hierarchy", check: "Information hierarchy clear", description: "Page structure is logical and navigable", required: true },
    { id: "flows", check: "User flows documented", description: "Key user journeys are mapped", required: true },
    { id: "states", check: "Page states covered", description: "Empty, loading, error states considered", required: false },
    { id: "accessibility", check: "Accessibility noted", description: "A11y considerations mentioned", required: false },
  ],
  "architecture": [
    { id: "components", check: "Components defined", description: "System components are clearly identified", required: true },
    { id: "apis", check: "APIs documented", description: "API contracts or interfaces specified", required: true },
    { id: "data", check: "Data model included", description: "Database schema or data structures defined", required: true },
    { id: "security", check: "Security addressed", description: "Auth, encryption, data protection covered", required: true },
    { id: "scalability", check: "Scalability considered", description: "Performance and scaling approach noted", required: false },
  ],
  "epics-stories": [
    { id: "format", check: "Story format correct", description: "Stories use standard format", required: true },
    { id: "acceptance", check: "Acceptance criteria present", description: "Each story has testable criteria", required: true },
    { id: "estimation", check: "Stories estimated", description: "Story points or T-shirt sizes assigned", required: false },
    { id: "epics", check: "Grouped into epics", description: "Stories organized under epics", required: false },
  ],
  "sprint-planning": [
    { id: "goal", check: "Sprint goal defined", description: "Clear sprint objective stated", required: true },
    { id: "capacity", check: "Capacity calculated", description: "Team capacity considered", required: true },
    { id: "tasks", check: "Tasks broken down", description: "Stories broken into tasks", required: true },
    { id: "assignments", check: "Work assigned", description: "Tasks have owners", required: false },
  ],
}

// Build the QA sub-agent spawn instruction
export function buildQASpawnInstruction(
  deliverableType: DeliverableType,
  documentPath: string,
  projectName: string
): string | null {
  const criteria = QA_CRITERIA[deliverableType]
  if (!criteria) return null // No QA criteria for this type yet

  const criteriaList = criteria
    .map((c, i) => `${i + 1}. ${c.check} ${c.required ? "(REQUIRED)" : "(OPTIONAL)"}: ${c.description}`)
    .join("\n")

  return `You are a QA Validation Agent. Your job is to validate the ${deliverableType} document and provide a structured assessment.

## YOUR TASK
Read and validate the document at: ${documentPath}
Project: ${projectName}

## VALIDATION CRITERIA
${criteriaList}

## INSTRUCTIONS
1. Read the entire document carefully
2. Evaluate each criterion above
3. For each criterion, determine:
   - PASS: Criterion is fully met
   - WARN: Criterion is partially met or could be improved
   - FAIL: Criterion is not met (only for REQUIRED items)

4. Output your validation in this EXACT format:

---VALIDATION_START---
CRITERION: vision
STATUS: PASS|WARN|FAIL
MESSAGE: Brief explanation
SUGGESTION: How to improve (if WARN or FAIL)
---
CRITERION: problem
STATUS: PASS|WARN|FAIL
MESSAGE: Brief explanation
SUGGESTION: How to improve (if WARN or FAIL)
---
[Continue for all criteria]
---VALIDATION_END---

OVERALL_SCORE: [0-100]
SUMMARY: [2-3 sentence summary]

5. Be constructive - focus on actionable improvements
6. Be specific - reference exact sections when noting issues
7. Complete the validation in a single response

BEGIN VALIDATION NOW.`
}

// Parse validation results from QA agent response
export function parseValidationResults(response: string): {
  results: ValidationResult[]
  score: number
  summary: string
} {
  const results: ValidationResult[] = []
  let score = 0
  let summary = ""

  // Extract validation block
  const validationMatch = response.match(/---VALIDATION_START---([\s\S]*?)---VALIDATION_END---/)
  if (validationMatch) {
    const blocks = validationMatch[1].split("---").filter(b => b.trim())

    for (const block of blocks) {
      const criterionMatch = block.match(/CRITERION:\s*(\w+)/)
      const statusMatch = block.match(/STATUS:\s*(PASS|WARN|FAIL)/)
      const messageMatch = block.match(/MESSAGE:\s*([^\n]+)/)
      const suggestionMatch = block.match(/SUGGESTION:\s*([^\n]+)/)

      if (criterionMatch && statusMatch) {
        results.push({
          id: criterionMatch[1],
          check: criterionMatch[1],
          status: statusMatch[1].toLowerCase() as "pass" | "warn" | "fail",
          message: messageMatch?.[1]?.trim(),
          suggestion: suggestionMatch?.[1]?.trim(),
        })
      }
    }
  }

  // Extract score
  const scoreMatch = response.match(/OVERALL_SCORE:\s*(\d+)/)
  if (scoreMatch) {
    score = parseInt(scoreMatch[1], 10)
  } else {
    // Calculate from results
    const passCount = results.filter(r => r.status === "pass").length
    const warnCount = results.filter(r => r.status === "warn").length
    const total = results.length
    if (total > 0) {
      score = Math.round(((passCount + warnCount * 0.5) / total) * 100)
    }
  }

  // Extract summary
  const summaryMatch = response.match(/SUMMARY:\s*(.+?)$/m)
  if (summaryMatch) {
    summary = summaryMatch[1].trim()
  }

  return { results, score, summary }
}

// Build the message to send to existing QA session
export function buildQAValidationMessage(
  deliverableType: DeliverableType,
  documentPath: string
): string | null {
  const criteria = QA_CRITERIA[deliverableType]
  if (!criteria) return null // No QA criteria for this type yet

  const checkList = criteria.map(c => `- ${c.check}`).join("\n")

  return `VALIDATE DOCUMENT: ${documentPath}

Check these criteria:
${checkList}

Respond with validation results in the structured format.`
}
