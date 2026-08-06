import path from 'path';
import fs from 'fs';

// Note: In MVP, Smart Rules only support extension, name pattern, size.
export interface SmartCondition {
  field: 'extension' | 'name' | 'size';
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt';
  value: string | number;
}

export interface RuleSetDomain {
  id: string;
  name: string;
  type: 'quick' | 'smart';
  quickRuleId?: 'images' | 'videos' | 'docs' | 'archives' | string;
  conditions?: SmartCondition[];
  conditionLogic?: 'AND' | 'OR';
  action: { type: 'move' | 'copy'; destination: string };
  watchedFolder?: string;
}

const QUICK_RULE_EXTENSIONS = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.tiff'],
  videos: ['.mp4', '.mkv', '.mov', '.avi', '.webm', '.flv', '.wmv'],
  docs: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.xls', '.xlsx', '.ppt', '.pptx', '.csv'],
  archives: ['.zip', '.rar', '.7z', '.tar', '.gz']
};

export class RuleEvaluator {
  static evaluate(filePath: string, rule: RuleSetDomain): boolean {
    if (rule.type === 'quick') {
      return this.evaluateQuickRule(filePath, rule.quickRuleId);
    } else if (rule.type === 'smart') {
      return this.evaluateSmartRule(filePath, rule);
    }
    return false;
  }

  private static evaluateQuickRule(filePath: string, quickRuleId?: string): boolean {
    if (!quickRuleId) return false;
    const exts = QUICK_RULE_EXTENSIONS[quickRuleId as keyof typeof QUICK_RULE_EXTENSIONS];
    if (!exts) return false;
    
    const ext = path.extname(filePath).toLowerCase();
    return exts.includes(ext);
  }

  private static evaluateSmartRule(filePath: string, rule: RuleSetDomain): boolean {
    if (!rule.conditions || rule.conditions.length === 0) return false;

    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    let fileSize = 0;
    try {
      fileSize = fs.statSync(filePath).size;
    } catch {
      return false; // Cannot read file
    }

    const results = rule.conditions.map(cond => {
      switch (cond.field) {
        case 'extension':
          return this.compareString(ext, cond.operator, cond.value as string);
        case 'name':
          return this.compareString(fileName, cond.operator, cond.value as string);
        case 'size':
          return this.compareNumber(fileSize, cond.operator, Number(cond.value));
        default:
          return false;
      }
    });

    if (rule.conditionLogic === 'OR') {
      return results.some(r => r === true);
    }
    // Default AND
    return results.every(r => r === true);
  }

  private static compareString(actual: string, operator: string, expected: string): boolean {
    const act = actual.toLowerCase();
    const exp = expected.toLowerCase();
    switch (operator) {
      case 'equals': return act === exp || (act.startsWith('.') ? act.slice(1) === exp : false);
      case 'contains': return act.includes(exp);
      case 'startsWith': return act.startsWith(exp);
      case 'endsWith': return act.endsWith(exp);
      default: return false;
    }
  }

  private static compareNumber(actual: number, operator: string, expected: number): boolean {
    switch (operator) {
      case 'gt': return actual > expected;
      case 'lt': return actual < expected;
      case 'equals': return actual === expected;
      default: return false;
    }
  }
}
