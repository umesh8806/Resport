export const defaultResultTemplate = `
<style>
  .result-card {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 40px;
    background: white;
    color: #333;
  }
  .header {
    text-align: center;
    margin-bottom: 30px;
    border-bottom: 2px solid #f0f0f0;
    padding-bottom: 20px;
  }
  .school-name {
    font-size: 28px;
    font-weight: bold;
    color: #1a365d;
    margin: 0;
  }
  .school-address {
    font-size: 14px;
    color: #666;
    margin: 5px 0 15px 0;
  }
  .exam-name {
    font-size: 20px;
    color: #2b6cb0;
    font-weight: 600;
  }
  .student-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 30px;
    background: #f8fafc;
    padding: 15px;
    border-radius: 8px;
  }
  .info-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .info-row {
    display: flex;
    gap: 10px;
  }
  .info-label {
    font-weight: 600;
    color: #4a5568;
    width: 100px;
  }
  .marks-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 30px;
  }
  .marks-table th, .marks-table td {
    border: 1px solid #e2e8f0;
    padding: 12px;
    text-align: center;
  }
  .marks-table th {
    background-color: #f1f5f9;
    font-weight: 600;
    color: #475569;
  }
  .marks-table td:first-child, .marks-table th:first-child {
    text-align: left;
  }
  .summary-box {
    display: flex;
    justify-content: space-around;
    background: #f8fafc;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 40px;
    border: 1px solid #e2e8f0;
  }
  .summary-item {
    text-align: center;
  }
  .summary-value {
    font-size: 24px;
    font-weight: bold;
    color: #1e293b;
    margin-top: 5px;
  }
  .summary-label {
    font-size: 12px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .footer {
    margin-top: 50px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .signature-box {
    text-align: center;
    width: 200px;
  }
  .signature-line {
    border-top: 1px solid #cbd5e1;
    margin-top: 40px;
    padding-top: 10px;
    color: #64748b;
    font-size: 14px;
  }
  .stamp-area {
    width: 120px;
    height: 120px;
    border: 2px dashed #cbd5e1;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    font-size: 12px;
    transform: rotate(-15deg);
    margin: 0 auto;
  }
</style>

<div class="result-card">
  <div class="header">
    <!-- You can add an <img src="URL" /> here for the school logo -->
    <h1 class="school-name">{{school_name}}</h1>
    <p class="school-address">{{school_address}}</p>
    <div class="exam-name">{{exam_name}} - {{academic_year}}</div>
  </div>

  <div class="student-info">
    <div class="info-group">
      <div class="info-row">
        <span class="info-label">Student Name:</span>
        <span>{{student_name}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Roll Number:</span>
        <span>{{roll_number}}</span>
      </div>
    </div>
    <div class="info-group">
      <div class="info-row">
        <span class="info-label">Class:</span>
        <span>{{class_name}} {{division}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">D.O.B:</span>
        <span>{{date_of_birth}}</span>
      </div>
    </div>
  </div>

  <!-- This special tag will be automatically replaced by the <table> of marks -->
  {{marks_table}}

  <div class="summary-box">
    <div class="summary-item">
      <div class="summary-label">Total Marks</div>
      <div class="summary-value">{{total_marks}} / {{maximum_marks}}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Percentage</div>
      <div class="summary-value">{{percentage}}%</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Grade</div>
      <div class="summary-value">{{grade}}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Result Status</div>
      <div class="summary-value">{{result_status}}</div>
    </div>
  </div>

  <div class="footer">
    <div class="signature-box">
      <div class="stamp-area">
        Official Stamp
        <!-- Replace with <img src="STAMP_URL" /> -->
      </div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Class Teacher</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Principal</div>
    </div>
  </div>
</div>
`
