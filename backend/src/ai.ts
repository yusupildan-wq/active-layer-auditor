import axios from 'axios'

const OLLAMA_URL = 'http://localhost:11434/api/chat'
const MODEL = 'llama3.1'

export interface AIChange {
  id: string
  title: string
  description: string
  estimatedSavingMinutes: number
  confidence: 'high' | 'medium' | 'low'
  category: 'speed' | 'cache' | 'parallelism' | 'cleanup'
}

export interface AIOptimizationResult {
  optimizedYaml: string
  changes: AIChange[]
}

const SYSTEM_PROMPT = `You are an expert Azure DevOps pipeline optimizer specializing in Power Platform deployment pipelines.

Analyze the provided YAML pipeline and return an optimized version as a JSON object with this EXACT structure (no markdown, no code fences, just raw JSON):
{
  "optimizedYaml": "<complete optimized YAML as a string with \\n for newlines>",
  "changes": [
    {
      "id": "change-1",
      "title": "Short title of what changed",
      "description": "Detailed explanation of why this improves the pipeline",
      "estimatedSavingMinutes": 30,
      "confidence": "high",
      "category": "parallelism"
    }
  ]
}

Apply ALL of these optimizations where applicable:

PARALLELISM (highest impact):
- Identify stages that deploy to independent environments (e.g. Test and Staging with no shared artifacts) and remove their dependsOn to enable parallel execution
- Stages that only share a common build artifact (not a deployment dependency) can run in parallel
- Be aggressive — if there is no logical reason for sequential ordering, parallelize it

CHECKOUT:
- Add "fetchDepth: 1" to all checkout steps (shallow clone)
- Add "lfs: false" to all checkout steps unless LFS is explicitly used

TIMEOUTS:
- Add "timeoutInMinutes: 60" to all jobs that do not have a timeout set

ARTIFACTS:
- Add "continueOnError: true" to all PublishPipelineArtifact tasks to prevent rerun failures

POWER PLATFORM:
- Add "async: true" to PowerPlatformImportSolution tasks
- Add "async: true" to PowerPlatformExportSolution tasks
- Add "skipIfSameVersion: true" to PowerPlatformImportSolution tasks

CACHING:
- Add a cache step before npm install steps to cache node_modules
- Add a cache step before NuGet restore steps

Return ONLY the raw JSON object. No explanation, no markdown formatting, no code blocks.`

export async function analyzeWithAI(yaml: string): Promise<AIOptimizationResult> {
  const resp = await axios.post(
    OLLAMA_URL,
    {
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Optimize this Azure DevOps pipeline YAML and return only JSON:\n\n${yaml}` },
      ],
      stream: false,
      options: { temperature: 0.1, num_predict: 8192 },
    },
    { timeout: 180000 }
  )

  const content: string = resp.data.message?.content ?? ''

  // Strip markdown code fences if model wraps its response
  const stripped = content.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim()

  const jsonMatch = stripped.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI returned no valid JSON — try again')

  let parsed: AIOptimizationResult
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    throw new Error('AI returned malformed JSON — try again')
  }

  if (typeof parsed.optimizedYaml !== 'string' || !Array.isArray(parsed.changes)) {
    throw new Error('AI response is missing required fields')
  }

  // Ensure all changes have required fields with fallbacks
  parsed.changes = parsed.changes.map((c, i) => ({
    id: c.id ?? `ai-change-${i + 1}`,
    title: c.title ?? 'Optimization',
    description: c.description ?? '',
    estimatedSavingMinutes: typeof c.estimatedSavingMinutes === 'number' ? c.estimatedSavingMinutes : 0,
    confidence: (['high', 'medium', 'low'] as const).includes(c.confidence) ? c.confidence : 'medium',
    category: (['speed', 'cache', 'parallelism', 'cleanup'] as const).includes(c.category) ? c.category : 'speed',
  }))

  return parsed
}
