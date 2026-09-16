type SubjectMark = {
  subject_id: string
  marks_obtained: number
  maximum_marks: number
  passing_marks: number
}

type GradingRule = {
  min_percentage: number
  max_percentage: number
  grade: string
  result_status: 'PASS' | 'FAIL'
}

type CalculationResult = {
  total_marks: number
  maximum_marks: number
  percentage: number
  grade: string
  result_status: 'PASS' | 'FAIL'
}

export function calculateResult(marks: SubjectMark[], rules: GradingRule[]): CalculationResult {
  let totalObtained = 0
  let totalMaximum = 0
  let passedAllSubjects = true

  for (const m of marks) {
    totalObtained += m.marks_obtained
    totalMaximum += m.maximum_marks
    if (m.marks_obtained < m.passing_marks) {
      passedAllSubjects = false
    }
  }

  // Handle case where no marks exist
  if (totalMaximum === 0) {
    return {
      total_marks: 0,
      maximum_marks: 0,
      percentage: 0,
      grade: 'N/A',
      result_status: 'FAIL'
    }
  }

  // Calculate percentage deterministic to 2 decimal places
  // Multiply by 10000, divide by totalMax, then round and divide by 100 for true 2 decimal rounding without floating point anomalies
  const percentageStr = ((totalObtained / totalMaximum) * 100).toFixed(2)
  const percentage = Number(percentageStr)

  let finalStatus: 'PASS' | 'FAIL' = passedAllSubjects ? 'PASS' : 'FAIL'
  let finalGrade = 'F'

  // Match grading rules
  // Grading rule ranges are inclusive bounds, e.g. 90 to 100, 80 to 89.99
  for (const rule of rules) {
    if (percentage >= rule.min_percentage && percentage <= rule.max_percentage) {
      finalGrade = rule.grade
      // If a student failed a subject, they might still fall into a high percentage bucket.
      // Usually, if they failed a subject, they fail overall regardless of percentage.
      // We override rule status if they failed a subject.
      if (!passedAllSubjects) {
         finalStatus = 'FAIL'
         // Optional: set grade to F if they failed a subject
         // finalGrade = 'F' 
      } else {
         finalStatus = rule.result_status
      }
      break
    }
  }

  return {
    total_marks: totalObtained,
    maximum_marks: totalMaximum,
    percentage,
    grade: finalGrade,
    result_status: finalStatus
  }
}

export function validateGradingRules(rules: GradingRule[]): boolean {
  // Sort rules by min_percentage
  const sorted = [...rules].sort((a, b) => a.min_percentage - b.min_percentage)
  
  for (let i = 0; i < sorted.length - 1; i++) {
    // If the next rule's min_percentage is less than or equal to current rule's max_percentage, they overlap
    if (sorted[i + 1].min_percentage <= sorted[i].max_percentage) {
      return false // Overlap detected
    }
  }
  return true
}
