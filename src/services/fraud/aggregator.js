function decisionFromScore(score) {
  if (score > 0.8) return 'BLOCK';
  if (score >= 0.5) return 'FLAG';
  return 'APPROVE';
}

function aggregate(ruleResults, mlResult) {
  const triggeredRules = ruleResults.filter((rule) => !rule.passed);
  const ruleScore = triggeredRules.length > 0 ? 0.9 : 0.0;

  // Combine ML confidence with rule-based severity.
  const finalScore = Math.max(ruleScore, mlResult.score);
  const decision = decisionFromScore(finalScore);

  return {
    decision,
    score: Number(finalScore.toFixed(4)),
    mlScore: mlResult.score,
    ruleScore,
    triggeredRules: triggeredRules.map((rule) => rule.id),
    ruleResults,
    mlResult
  };
}

module.exports = {
  aggregate
};
