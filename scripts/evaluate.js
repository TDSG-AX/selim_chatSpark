const searchEngine = require('../api/lib/search');

/**
 * 평가를 위한 질문 셋 (사용자 제안 기반)
 */
const EVALUATION_SET = [
  {
    query: "경영개선지원 자격이 어떻게 되나요?",
    expectedKeywords: ["매출 10%", "저신용자", "744점", "base01.md"]
  },
  {
    query: "철거비 지원은 얼마나 받을 수 있죠?",
    expectedKeywords: ["3.3㎡", "8만 원", "최대 200만 원", "base01.md", "base04.md"]
  },
  {
    query: "재창업 교육은 언제 신청하나요?",
    expectedKeywords: ["3월 9일", "상시", "base03.md"]
  },
  {
    query: "서류는 뭐가 필요해요?",
    expectedKeywords: ["사업자등록증명원", "소상공인확인서", "납세증명서", "base02.md"]
  }
];

function runEvaluation() {
  console.log("=== ChatSpark BM25 검색 엔진 평가 시작 ===\n");
  
  let totalScore = 0;
  
  EVALUATION_SET.forEach((item, index) => {
    console.log(`질문 ${index + 1}: "${item.query}"`);
    const results = searchEngine.search(item.query, 3);
    
    const foundSources = results.map(r => r.source);
    const resultText = results.map(r => r.text).join(" ");
    
    let matchCount = 0;
    item.expectedKeywords.forEach(kw => {
      if (resultText.includes(kw) || foundSources.includes(kw)) {
        matchCount++;
      }
    });
    
    const score = (matchCount / item.expectedKeywords.length) * 100;
    totalScore += score;
    
    console.log(`- 검색된 소스: ${[...new Set(foundSources)].join(", ")}`);
    console.log(`- 키워드 매칭률: ${score.toFixed(1)}% (${matchCount}/${item.expectedKeywords.length})`);
    console.log("------------------------------------------");
  });
  
  const avgScore = totalScore / EVALUATION_SET.length;
  console.log(`\n최종 평균 Recall 점수: ${avgScore.toFixed(1)}%`);
  
  if (avgScore >= 80) {
    console.log("결과: [성공] 검색 엔진이 매우 높은 정확도로 문맥을 찾고 있습니다.");
  } else {
    console.log("결과: [필요] 일부 질문에 대한 검색 성능 개선이 필요합니다.");
  }
}

// 스크립트 실행
try {
  runEvaluation();
} catch (error) {
  console.error("평가 중 오류 발생:", error);
}
