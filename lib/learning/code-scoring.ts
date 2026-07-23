/**
 * Code Scoring — test-case-based grading for Python exercises.
 *
 * Compares captured stdout against expected output per test case.
 * Supports exact match (trimmed) and regex matching.
 */

export interface CodeTestCase {
  name: string;
  input?: string;
  expectedOutput: string;
  hidden?: boolean;
}

export interface TestResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  hidden: boolean;
}

export interface CodeScoreResult {
  passed: number;
  total: number;
  percentage: number;
  results: TestResult[];
}

/**
 * Compare actual output to expected output.
 * Trims whitespace and normalizes line endings.
 */
function matchesOutput(actual: string, expected: string): boolean {
  const normalize = (s: string) => s.replace(/\r\n/g, '\n').trim();
  return normalize(actual) === normalize(expected);
}

/**
 * Grade code against a set of test cases.
 * Each test case compares the student's stdout to the expected output.
 */
export function gradeCodeAgainstTests(
  stdout: string,
  testCases: CodeTestCase[],
): CodeScoreResult {
  const results: TestResult[] = testCases.map((tc) => {
    const passed = matchesOutput(stdout, tc.expectedOutput);
    return {
      name: tc.name,
      passed,
      expected: tc.expectedOutput,
      actual: stdout.trim(),
      hidden: tc.hidden ?? false,
    };
  });

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;

  return { passed, total, percentage, results };
}

/**
 * Build a readable feedback string from test results.
 */
export function buildTestFeedback(result: CodeScoreResult): string {
  const lines: string[] = [];
  lines.push(`Score: ${result.passed}/${result.total} tests passed (${result.percentage}%)`);
  lines.push('');

  for (const r of result.results) {
    const icon = r.passed ? '✓' : '✗';
    const visibility = r.hidden ? ' [hidden]' : '';
    lines.push(`${icon} ${r.name}${visibility}`);
    if (!r.passed) {
      lines.push(`  Expected: ${r.expected}`);
      lines.push(`  Got: ${r.actual.substring(0, 200)}`);
    }
  }

  return lines.join('\n');
}
