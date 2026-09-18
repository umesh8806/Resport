const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

function generateMobile() {
  return '9' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
}

function calculateGrade(percentage) {
  if (percentage >= 90) return { grade: 'A+', status: 'PASS' };
  if (percentage >= 80) return { grade: 'A', status: 'PASS' };
  if (percentage >= 70) return { grade: 'B+', status: 'PASS' };
  if (percentage >= 60) return { grade: 'B', status: 'PASS' };
  if (percentage >= 50) return { grade: 'C', status: 'PASS' };
  if (percentage >= 35) return { grade: 'D', status: 'PASS' };
  return { grade: 'F', status: 'FAIL' };
}

async function run() {
  console.log('Fetching metadata...');
  
  const { data: schools } = await supabase.from('schools').select('id, school_code').eq('status', 'ACTIVE');
  const { data: years } = await supabase.from('academic_years').select('id').eq('status', 'ACTIVE');
  const { data: exams } = await supabase.from('exams').select('id').eq('status', 'ACTIVE');
  let { data: subjects } = await supabase.from('subjects').select('id, subject_code, maximum_marks, passing_marks').eq('active', true);

  if (!subjects?.length) {
    console.log('No subjects found. Inserting defaults...');
    await supabase.from('subjects').insert([
      { subject_code: 'SUB-ENG', subject_name: 'English', maximum_marks: 100, passing_marks: 35, display_order: 1, active: true },
      { subject_code: 'SUB-MATH', subject_name: 'Mathematics', maximum_marks: 100, passing_marks: 35, display_order: 2, active: true },
      { subject_code: 'SUB-SCI', subject_name: 'Science', maximum_marks: 100, passing_marks: 35, display_order: 3, active: true }
    ]);
    const { data: newSubjects } = await supabase.from('subjects').select('id, subject_code, maximum_marks, passing_marks').eq('active', true);
    subjects = newSubjects;
  }

  if (!schools?.length || !years?.length || !exams?.length || !subjects?.length) {
    console.error('Missing required metadata (schools, years, exams, or subjects).');
    process.exit(1);
  }

  const school = schools[0];
  const yearId = years[0].id;
  const examId = exams[0].id;

  const totalStudents = 15000;
  const chunkSize = 1000;

  console.log(`Target: ${totalStudents} students for School: ${school.school_code}`);

  for (let i = 0; i < totalStudents; i += chunkSize) {
    console.log(`Processing chunk ${i} to ${i + chunkSize}...`);
    const studentsToInsert = [];
    
    for (let j = 0; j < chunkSize; j++) {
      const index = i + j + 1;
      studentsToInsert.push({
        school_id: school.id,
        academic_year_id: yearId,
        roll_number: `STU15K-${index}`,
        student_name: `Student ${index}`,
        date_of_birth: '2010-01-01',
        class_name: '10',
        division: 'A',
        mobile_number: generateMobile(),
        status: 'ACTIVE'
      });
    }

    const { data: insertedStudents, error: studentError } = await supabase
      .from('students')
      .upsert(studentsToInsert, { onConflict: 'school_id, academic_year_id, roll_number' })
      .select('id');

    if (studentError) {
      console.error('Error inserting students:', studentError);
      process.exit(1);
    }

    const resultsToInsert = [];
    const allMarksToInsert = [];

    for (let j = 0; j < chunkSize; j++) {
      const studentId = insertedStudents[j].id;
      let totalObtained = 0;
      let totalMax = 0;
      let failedSubject = false;
      
      const studentMarks = subjects.map(sub => {
        // Random marks between 20 and 100
        const mark = Math.floor(Math.random() * (sub.maximum_marks - 20 + 1)) + 20;
        totalObtained += mark;
        totalMax += sub.maximum_marks;
        if (mark < sub.passing_marks) failedSubject = true;
        
        return {
          school_id: school.id,
          subject_id: sub.id,
          marks_obtained: mark,
          maximum_marks: sub.maximum_marks,
          passing_marks: sub.passing_marks
        };
      });

      const percentage = Number(((totalObtained / totalMax) * 100).toFixed(2));
      const calc = calculateGrade(percentage);
      const resultStatus = failedSubject ? 'FAIL' : calc.status;

      resultsToInsert.push({
        school_id: school.id,
        student_id: studentId,
        exam_id: examId,
        total_marks: totalObtained,
        maximum_marks: totalMax,
        percentage,
        grade: calc.grade,
        result_status: resultStatus,
        publication_status: 'PUBLISHED',
        published_at: new Date().toISOString(),
        calculation_version: 1
      });
      
      // We will attach student_id to marks later after results are inserted
      studentMarks.forEach(sm => allMarksToInsert.push({ ...sm, _tempStudentId: studentId }));
    }

    const { data: insertedResults, error: resultError } = await supabase
      .from('results')
      .upsert(resultsToInsert, { onConflict: 'student_id, exam_id' })
      .select('id, student_id');

    if (resultError) {
      console.error('Error inserting results:', resultError);
      process.exit(1);
    }

    const studentToResultMap = {};
    insertedResults.forEach(r => studentToResultMap[r.student_id] = r.id);

    const marksReadyToInsert = allMarksToInsert.map(m => {
      const { _tempStudentId, ...rest } = m;
      return {
        ...rest,
        result_id: studentToResultMap[_tempStudentId]
      };
    });

    const { error: marksError } = await supabase
      .from('result_marks')
      .upsert(marksReadyToInsert, { onConflict: 'result_id, subject_id' });

    if (marksError) {
      console.error('Error inserting marks:', marksError);
      process.exit(1);
    }
  }

  console.log('Successfully pushed 15,000 students!');
}

run();
