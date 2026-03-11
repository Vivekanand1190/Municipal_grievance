// classifier.js - AI Keyword-based complaint classifier
const CATEGORIES = {
  Road: {
    department: 'Public Works Department',
    email: 'publicworks@municipality.gov',
    keywords: [
      'road', 'pothole', 'street', 'highway', 'pavement', 'footpath', 'traffic',
      'signal', 'bridge', 'divider', 'speed breaker', 'road damage', 'road repair',
      'broken road', 'crater', 'accident', 'sidewalk', 'crossing'
    ]
  },
  Water: {
    department: 'Water Supply Department',
    email: 'watersupply@municipality.gov',
    keywords: [
      'water', 'pipe', 'leak', 'supply', 'no water', 'tap', 'borewell', 'sewage',
      'drain', 'drainage', 'flood', 'waterlogging', 'overflow', 'water pressure',
      'contaminated water', 'dirty water', 'water pipe', 'plumbing'
    ]
  },
  Electricity: {
    department: 'Electricity Department',
    email: 'electricity@municipality.gov',
    keywords: [
      'electricity', 'power', 'light', 'streetlight', 'street light', 'blackout',
      'power cut', 'outage', 'transformer', 'wire', 'electric pole', 'sparking',
      'short circuit', 'meter', 'billing', 'voltage', 'bulb', 'lamp post', 'electric'
    ]
  },
  Sanitation: {
    department: 'Sanitation & Waste Management',
    email: 'sanitation@municipality.gov',
    keywords: [
      'garbage', 'waste', 'trash', 'sanitation', 'cleanliness', 'dirty', 'filth',
      'smell', 'odor', 'sweeper', 'dustbin', 'bin', 'litter', 'rubbish', 'dumping',
      'toilet', 'public toilet', 'open defecation', 'mosquito', 'pest', 'rat', 'stray dog'
    ]
  }
};

function classifyComplaint(description) {
  const text = description.toLowerCase();
  const scores = {};

  for (const [category, info] of Object.entries(CATEGORIES)) {
    let score = 0;
    for (const keyword of info.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += keyword.split(' ').length; // multi-word keywords score higher
      }
    }
    scores[category] = score;
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];

  if (best[1] === 0) {
    return {
      category: 'General',
      department: 'Municipal Office (General)',
      departmentEmail: 'general@municipality.gov',
      confidence: 0,
      allScores: scores
    };
  }

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = Math.round((best[1] / totalScore) * 100);

  return {
    category: best[0],
    department: CATEGORIES[best[0]].department,
    departmentEmail: CATEGORIES[best[0]].email,
    confidence,
    allScores: scores
  };
}

module.exports = { classifyComplaint };
