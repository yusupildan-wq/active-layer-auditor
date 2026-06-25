import assert from 'node:assert/strict'
import { applyRules } from '../optimizer'
import { mergeAIOptimizations } from '../ai'

function ids(yaml: string): string[] {
  return applyRules(yaml).optimizations.map(o => o.id)
}

{
  const yaml = `steps:
  - checkout: self
    fetchDepth: 1
`
  const result = applyRules(yaml)
  assert.ok(result.optimizations.some(o => o.id === 'checkout-fetch-tags'))
  assert.match(result.optimizedYaml, /fetchTags: false/)
}

{
  const yaml = `steps:
  - checkout: self
    fetchDepth: 1
  - script: git describe --tags
`
  assert.ok(!ids(yaml).includes('checkout-fetch-tags'))
}

{
  const yaml = `trigger:
  branches:
    include:
      - main
steps:
  - script: dotnet restore src/App/App.csproj
  - script: dotnet build src/App/App.csproj
  - script: dotnet test tests/App.Tests/App.Tests.csproj
`
  const result = applyRules(yaml)
  assert.ok(ids(yaml).includes('ci-trigger-batching'))
  assert.ok(ids(yaml).includes('ci-path-filters'))
  assert.ok(ids(yaml).includes('dotnet-build-no-restore'))
  assert.ok(ids(yaml).includes('dotnet-test-no-build'))
  assert.equal(result.optimizedYaml.includes('--no-restore'), false)
  assert.equal(result.optimizedYaml.includes('--no-build'), false)
}

{
  const yaml = `steps:
  - task: DownloadPipelineArtifact@2
    inputs:
      artifact: drop
  - task: VSTest@3
    inputs:
      testSelector: testAssemblies
`
  const found = ids(yaml)
  assert.ok(found.includes('artifact-selective-download'))
  assert.ok(found.includes('vstest-parallel'))
  assert.ok(found.includes('parallel-test-sharding'))
}

{
  const base = [
    {
      id: 'shallow-clone',
      title: 'Shallow clone',
      description: '',
      estimatedSavingMinutes: 20,
      confidence: 'high' as const,
      category: 'speed' as const,
    },
    {
      id: 'parallel-stages',
      title: 'Parallel stages',
      description: '',
      estimatedSavingMinutes: 120,
      confidence: 'low' as const,
      category: 'parallelism' as const,
    },
  ]
  const ai = [{
    id: 'ai-parallel-1',
    title: 'Parallelize Test',
    description: 'Test and Staging are independent.',
    estimatedSavingMinutes: 30,
    confidence: 'high' as const,
    category: 'parallelism' as const,
  }]
  const merged = mergeAIOptimizations(base, ai)
  assert.equal(merged.estimatedSavingMinutes, 140)
  assert.equal(merged.optimizations.length, 3)
  assert.equal(merged.optimizations[2].estimatedSavingMinutes, 0)
  assert.match(merged.optimizations[2].title, /^AI confirmed:/)
}

{
  const merged = mergeAIOptimizations([], [{
    id: 'ai-parallel-1',
    title: 'Parallelize Test',
    description: 'Independent stage.',
    estimatedSavingMinutes: 30,
    confidence: 'high',
    category: 'parallelism',
  }])
  assert.equal(merged.estimatedSavingMinutes, 30)
}

console.log('optimizer tests passed')
