const fs = require('fs');
let code = fs.readFileSync('src/context/CommitmentContext.tsx', 'utf8');
const search = `  const createCommitment = async (data: Partial<StudyCommitment>) => {
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
const replace = `  const createCommitment = async (data: Partial<StudyCommitment>) => {
    if (!user) return;
    
    // Duplicate protection
    const existingMemory = commitmentsRef.current.find(c => c.courseId === data.courseId && c.status === 'active');
    if (existingMemory) {
       throw new Error('An active study commitment already exists for this course.');
    }
    
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
