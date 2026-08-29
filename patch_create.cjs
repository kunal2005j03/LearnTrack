const fs = require('fs');
let code = fs.readFileSync('src/context/CommitmentContext.tsx', 'utf8');
const search = `  const createCommitment = async (data: Partial<StudyCommitment>) => {
    if (!user) return;
    
    // Server-side duplicate protection isn't easily doable purely on client without transactions,
    // but we can at least protect against quick double clicks and multiple active commitments
    const existing = commitmentsRef.current.find(c => c.courseId === data.courseId && c.status === 'active');
    if (existing) {
       throw new Error('An active study commitment already exists for this course.');
    }`;
const replace = `  const createCommitment = async (data: Partial<StudyCommitment>) => {
    if (!user) return;
    
    // Server-side duplicate protection via Firestore transactions
    const commitmentsQuery = query(
      collection(db, \`users/\${user.uid}/studyCommitments\`),
      where('courseId', '==', data.courseId),
      where('status', '==', 'active')
    );
    const snap = await getDocs(commitmentsQuery);
    if (!snap.empty) {
      throw new Error('An active study commitment already exists for this course.');
    }`;
code = code.replace(search, replace);
fs.writeFileSync('src/context/CommitmentContext.tsx', code);
