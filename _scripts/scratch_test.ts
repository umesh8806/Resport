import { verifyAndFetchResultByExam } from './src/actions/publicResult';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function runTest() {
  console.log('Testing with Roll Number: R.00001 (with a dot)');
  const yearId = 'df3e1033-fd51-414e-a0ea-36c3d5bcfc33';
  const examId = '48c5d9af-48fe-42f9-9873-7370cc8d1cc5';
  
  const result = await verifyAndFetchResultByExam(yearId, examId, 'R.00001');
  console.log('Result from Server Action:', JSON.stringify(result, null, 2));
}

runTest().catch(console.error);
