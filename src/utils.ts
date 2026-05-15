export const mapCodeToYear = (code: any, cycle?: string): string | null => {
  if (!code) return null;
  const c = code.toString().toLowerCase().trim();
  const cy = cycle?.toLowerCase().trim() || '';
  
  // Secondary Level (AS)
  if (c.startsWith('61') || c.includes('1ثا') || c.includes('1as') || (cy.includes('secondaire') && (c === '1' || c === '1as'))) return '1as';
  if (c.startsWith('62') || c.includes('2ثا') || c.includes('2as') || (cy.includes('secondaire') && (c === '2' || c === '2as'))) return '2as';
  if (c.startsWith('63') || c.includes('3ثا') || c.includes('3as') || (cy.includes('secondaire') && (c === '3' || c === '3as'))) return '3as';
  
  // Middle Level (AM)
  if (c.startsWith('41') || c.includes('1مت') || c.includes('1am') || (cy.includes('moyen') && (c === '1' || c === '1am'))) return '1am';
  if (c.startsWith('42') || c.includes('2مت') || c.includes('2am') || (cy.includes('moyen') && (c === '2' || c === '2am'))) return '2am';
  if (c.startsWith('43') || c.includes('3مت') || c.includes('3am') || (cy.includes('moyen') && (c === '3' || c === '3am'))) return '3am';
  if (c.startsWith('44') || c.includes('4مت') || c.includes('4am') || (cy.includes('moyen') && (c === '4' || c === '4am'))) return '4am';

  // Primary Level (AP)
  if (c.startsWith('21') || c.includes('1اب') || c.includes('1ap') || (cy.includes('primaire') && (c === '1' || c === '1ap'))) return '1ap';
  if (c.startsWith('22') || c.includes('2اب') || c.includes('2ap') || (cy.includes('primaire') && (c === '2' || c === '2ap'))) return '2ap';
  if (c.startsWith('23') || c.includes('3اب') || c.includes('3ap') || (cy.includes('primaire') && (c === '3' || c === '3ap'))) return '3ap';
  if (c.startsWith('24') || c.includes('4اب') || c.includes('4ap') || (cy.includes('primaire') && (c === '4' || c === '4ap'))) return '4ap';
  if (c.startsWith('25') || c.includes('5اب') || c.includes('5ap') || (cy.includes('primaire') && (c === '5' || c === '5ap'))) return '5ap';
  
  // Fallback keyword checks
  if (c.includes('1as')) return '1as';
  if (c.includes('2as')) return '2as';
  if (c.includes('3as')) return '3as';
  if (c.includes('1am')) return '1am';
  if (c.includes('2am')) return '2am';
  if (c.includes('3am')) return '3am';
  if (c.includes('4am')) return '4am';
  if (c.includes('1ap')) return '1ap';
  if (c.includes('2ap')) return '2ap';
  if (c.includes('3ap')) return '3ap';
  if (c.includes('4ap')) return '4ap';
  if (c.includes('5ap')) return '5ap';
  
  // Last resort: map digits based on cycle
  const digit = c.match(/\d/)?.[0];
  if (digit) {
    if (cy.includes('moyen')) return digit + 'am';
    if (cy.includes('secondaire')) return digit + 'as';
    if (cy.includes('primaire')) return digit + 'ap';
    
    // Default mapping if no cycle but digit
    if (digit === '1') return '1ap';
    if (digit === '2') return '2ap';
    if (digit === '3') return '3ap';
    if (digit === '4') return '4ap';
    if (digit === '5') return '5ap';
  }

  return null;
};
