// test_e2e_workflow.mjs
const BASE_URL = 'http://127.0.0.1:8000';

async function request(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
}

async function runEndToEndTest() {
  console.log('========================================================');
  console.log('STEP 11C: END-TO-END PRODUCT WORKFLOW TEST WITH REAL GEMINI');
  console.log('========================================================\n');

  // Step 1: Create Company
  console.log('--- 1. Creating Company ---');
  const company = await request('/api/v1/companies', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Apex AI Technologies',
      website: 'https://apexai.tech',
    }),
  });
  console.log('Created Company:', company.name, 'ID:', company.id);

  // Step 2: Create Brand
  console.log('\n--- 2. Creating Brand ---');
  const brand = await request('/api/v1/brands', {
    method: 'POST',
    body: JSON.stringify({
      company_id: company.id,
      name: 'ApexPulse',
      website: 'https://pulse.apexai.tech',
      description: 'AI-first Search Intelligence and visibility monitoring platform',
      industry: 'SaaS Analytics',
    }),
  });
  console.log('Created Brand:', brand.name, 'ID:', brand.id, 'Industry:', brand.industry);

  // Step 3: Create Project
  console.log('\n--- 3. Creating Project Workspace ---');
  const project = await request('/api/v1/projects', {
    method: 'POST',
    body: JSON.stringify({
      company_id: company.id,
      brand_id: brand.id,
      name: 'ApexPulse AI Visibility Q4 Benchmark',
      description: 'Tracking ApexPulse citations and entity rankings across AI answers',
      status: 'active',
    }),
  });
  console.log('Created Project:', project.name, 'ID:', project.id);

  // Step 4: Create At Least 3 Prompts
  console.log('\n--- 4. Creating 3 Search Prompts ---');
  const prompts = [
    {
      project_id: project.id,
      prompt_text: 'What are the top AI search visibility and answer engine optimization platforms in 2026?',
      category: 'awareness',
      language: 'en',
      region: 'US',
    },
    {
      project_id: project.id,
      prompt_text: 'How does ApexPulse compare to Brand24 and Mention for tracking brand citations in AI responses?',
      category: 'comparison',
      language: 'en',
      region: 'US',
    },
    {
      project_id: project.id,
      prompt_text: 'Best enterprise AI search intelligence software for marketing and PR teams',
      category: 'purchase',
      language: 'en',
      region: 'US',
    },
  ];

  const createdPrompts = [];
  for (const p of prompts) {
    const res = await request('/api/v1/prompts', {
      method: 'POST',
      body: JSON.stringify(p),
    });
    createdPrompts.push(res);
    console.log(`- Created Prompt [${res.category}]: "${res.prompt_text.slice(0, 60)}..." (ID: ${res.id})`);
  }

  // Step 5: Run Real Gemini Search
  console.log('\n--- 5. Executing Real Gemini Search with Google Search Grounding ---');
  const promptToRun = createdPrompts[1]; // Run comparison prompt mentioning ApexPulse
  console.log(`Running prompt: "${promptToRun.prompt_text}"`);
  const searchRun = await request('/api/v1/search-runs', {
    method: 'POST',
    body: JSON.stringify({ prompt_id: promptToRun.id }),
  });
  console.log('Search Run Result:');
  console.log('- Status:', searchRun.status);
  console.log('- Engine:', searchRun.engine);
  console.log('- Model:', searchRun.model);
  console.log('- Response Preview:', searchRun.response ? searchRun.response.slice(0, 140) + '...' : 'None');

  // Step 6: Analyze Response with Gemini
  console.log('\n--- 6. Analyzing AI Response with Gemini ---');
  const analysis = await request(`/api/v1/search-runs/${searchRun.search_run_id}/analyze`, {
    method: 'POST',
  });
  console.log('Analysis Result:');
  console.log('- Target Brand Mentioned:', analysis.target_brand_analysis.mentioned);
  console.log('- Mention Count:', analysis.target_brand_analysis.mention_count);
  console.log('- Overall Sentiment:', analysis.target_brand_analysis.overall_sentiment);
  console.log('- Sentiment Score:', analysis.target_brand_analysis.sentiment_score);
  console.log('- Entities Detected Count:', analysis.entities_count);
  if (analysis.entities && analysis.entities.length > 0) {
    console.log('  Top Entities:', analysis.entities.slice(0, 3).map(e => e.entity_name).join(', '));
  }

  // Step 7: Extract Sources & Grounding Citations
  console.log('\n--- 7. Extracting Grounded Sources & Citations ---');
  const sources = await request(`/api/v1/search-runs/${searchRun.search_run_id}/extract-sources`, {
    method: 'POST',
  });
  console.log('Sources Extraction Result:');
  console.log('- Sources Count:', sources.sources_count);
  console.log('- Citations Count:', sources.citations_count);
  if (sources.sources && sources.sources.length > 0) {
    console.log('  Sample Source Domain:', sources.sources[0].domain, 'URL:', sources.sources[0].url);
  }

  // Step 8: Calculate Metrics
  console.log('\n--- 8. Calculating Daily Metrics ---');
  const metric = await request(`/api/v1/projects/${project.id}/metrics/calculate`, {
    method: 'POST',
  });
  console.log('Metric Calculated:');
  console.log('- Metric Date:', metric.metric_date);
  console.log('- Visibility Score:', metric.visibility_score);
  console.log('- Average Position:', metric.average_position);
  console.log('- Sentiment Score:', metric.sentiment_score);
  console.log('- Share of Voice:', metric.share_of_voice);
  console.log('- Mention Count:', metric.mention_count);

  // Step 9: Verify Project Metrics via GET
  console.log('\n--- 9. Verifying Dashboard Metrics Endpoint ---');
  const metricsList = await request(`/api/v1/projects/${project.id}/metrics`);
  console.log('Historical Metrics Count:', metricsList.length);
  console.log('Latest Visibility Score:', metricsList[0].visibility_score);

  // Step 10: Generate Recommendations with Gemini
  console.log('\n--- 10. Generating Actionable Recommendations with Gemini ---');
  const recs = await request(`/api/v1/projects/${project.id}/recommendations/generate`, {
    method: 'POST',
  });
  console.log('Generated Recommendations Count:', recs.length);
  if (recs.length > 0) {
    recs.forEach((r, idx) => {
      console.log(`  [${idx + 1}] Priority: ${r.priority.toUpperCase()} | Type: ${r.recommendation_type}`);
      console.log(`      Title: ${r.title}`);
      console.log(`      Description: ${r.description.slice(0, 100)}...`);
    });
  }

  // Step 11: Verify Insights & Competitors
  console.log('\n--- 11. Verifying Insights & Diagnosis ---');
  const insights = await request(`/api/v1/projects/${project.id}/insights`);
  console.log('Diagnosis:', insights.diagnosis ? insights.diagnosis.slice(0, 100) + '...' : 'None');
  console.log('Root Causes Count:', insights.root_causes ? insights.root_causes.length : 0);
  console.log('Competitors Count:', insights.competitors ? insights.competitors.length : 0);

  console.log('\n========================================================');
  console.log('ALL 11 END-TO-END WORKFLOW STEPS PASSED SUCCESSFULLY!');
  console.log('========================================================\n');
}

runEndToEndTest().catch((err) => {
  console.error('\n❌ Workflow test failed:', err);
  process.exit(1);
});
