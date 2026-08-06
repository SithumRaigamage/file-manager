import { RuleSetDomain } from './rule-evaluator';
import path from 'path';

export class ConflictDetector {
  /**
   * Checks if an incoming new rule creates a circular movement loop with existing rules.
   * e.g. Rule A: Watch Downloads, move to Documents
   *      Rule B: Watch Documents, move to Downloads
   * Returns true if a conflict is detected.
   */
  static hasCircularConflict(newRule: RuleSetDomain, existingRules: RuleSetDomain[]): boolean {
    if (!newRule.watchedFolder || !newRule.action.destination) return false;

    const newSource = path.resolve(newRule.watchedFolder);
    const newDest = path.resolve(newRule.action.destination);

    // Simplest circular check: Is there any existing rule that watches our destination and moves to our source?
    for (const rule of existingRules) {
      if (!rule.watchedFolder || !rule.action.destination) continue;
      
      const existingSource = path.resolve(rule.watchedFolder);
      const existingDest = path.resolve(rule.action.destination);

      if (existingSource === newDest && existingDest === newSource) {
        return true;
      }
      
      // We could do full graph traversal to detect A->B->C->A, but A->B->A is enough for MVP.
    }
    
    return false;
  }
}
