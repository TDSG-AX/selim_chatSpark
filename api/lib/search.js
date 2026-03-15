const fs = require('fs');
const path = require('path');

/**
 * BM25 기반의 초경량 검색 클래스
 * 지식베이스가 작으므로(A4 5장 내외) 메모리 내에서 동작하도록 설계함.
 */
class MiniBM25 {
  constructor(k1 = 1.5, b = 0.75) {
    this.k1 = k1;
    this.b = b;
    this.documents = []; // { source, text, tokens }
    this.avgdl = 0;
    this.idf = {};
    this.vocab = new Set();
  }

  // 한국어 매칭을 위한 토큰화 고도화
  tokenize(text) {
    const raw = text.toLowerCase();
    // 1. 단어 단위 (공백 기준)
    const words = raw.replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, ' ').split(/\s+/).filter(t => t.length > 0);
    // 2. 글자 단위 2-gram (띄어쓰기 무시하고 붙여서 생성)
    const chars = raw.replace(/[^\wㄱ-ㅎㅏ-ㅣ가-힣]/g, '');
    const grams = [];
    for (let i = 0; i < chars.length - 1; i++) {
      grams.push(chars.substring(i, i + 2));
    }
    return [...new Set([...words, ...grams])];
  }

  addDocument(source, text) {
    const tokens = this.tokenize(text);
    this.documents.push({ source, text, tokens });
    tokens.forEach(t => this.vocab.add(t));
  }

  initialize() {
    const N = this.documents.length;
    if (N === 0) return;
    const totalLen = this.documents.reduce((sum, doc) => sum + doc.tokens.length, 0);
    this.avgdl = totalLen / N;
    this.idf = {};
    this.vocab.forEach(term => {
      const nq = this.documents.filter(doc => doc.tokens.includes(term)).length;
      this.idf[term] = Math.log((N - nq + 0.5) / (nq + 0.5) + 1);
    });
  }

  search(query, topK = 5) {
    const qTokens = this.tokenize(query);
    const scores = this.documents.map(doc => {
      let score = 0;
      const docLen = doc.tokens.length;
      const tfMap = {};
      doc.tokens.forEach(t => tfMap[t] = (tfMap[t] || 0) + 1);

      qTokens.forEach(term => {
        if (!this.idf[term]) return;
        const tf = tfMap[term] || 0;
        const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / this.avgdl));
        score += (this.idf[term] * tf * (this.k1 + 1)) / denominator;
      });
      return { ...doc, score };
    });

    return scores
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}

/**
 * 지식베이스 파일을 읽어 청크로 나누고 검색 엔진 초기화
 */
function initializeSearch() {
  const engine = new MiniBM25();
  const baseFiles = ['base01.md', 'base02.md', 'base03.md', 'base04.md'];
  const baseDir = path.join(__dirname, '../../');

  baseFiles.forEach(filename => {
    const filePath = path.join(baseDir, filename);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      // 제목(#) 기준 분할 (메타데이터 보존을 위해 큰 단위 유지)
      const sections = content.split(/(?=^# )|(?=^## )|(?=^### )/m);
      sections.forEach(section => {
        const trimmed = section.trim();
        if (trimmed.length > 20) {
          engine.addDocument(filename, trimmed);
        }
      });
    }
  });

  engine.initialize();
  return engine;
}

const sharedEngine = initializeSearch();

module.exports = {
  search: (query, topK = 5) => sharedEngine.search(query, topK),
  getRawDocuments: () => sharedEngine.documents
};
