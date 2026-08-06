import path from 'path';

export interface RenameStepFindReplace {
  type: 'find_replace';
  find: string;
  replace: string;
  useRegex?: boolean;
  caseSensitive?: boolean;
}

export interface RenameStepPrefixSuffix {
  type: 'prefix_suffix';
  prefix?: string;
  suffix?: string;
}

export interface RenameStepNumbering {
  type: 'numbering';
  position: 'start' | 'end';
  startAt: number;
  padWithZeroes: number;
  separator: string;
}

export interface RenameStepDateInsert {
  type: 'date_insert';
  position: 'start' | 'end';
  format: 'YYYY-MM-DD' | 'YYYYMMDD' | 'MM-DD-YYYY';
  separator: string;
}

export type RenameStep = RenameStepFindReplace | RenameStepPrefixSuffix | RenameStepNumbering | RenameStepDateInsert;

export interface RenamePatternDomain {
  id: string;
  name: string;
  steps: RenameStep[];
  createdAt: string;
}

export interface RenamePreviewItem {
  originalPath: string;
  newName: string;
  conflict?: string;
}

export class RenameEvaluator {
  /**
   * Applies the sequence of rename steps to generate new names for a batch of files.
   * Also detects intra-batch and disk collisions.
   */
  static evaluateBatch(filePaths: string[], pattern: RenamePatternDomain): RenamePreviewItem[] {
    const preview: RenamePreviewItem[] = [];
    const newNamesSet = new Set<string>(); // Used to detect intra-batch collisions

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      let newName = path.basename(filePath);

      for (const step of pattern.steps) {
        newName = this.applyStep(newName, step, i);
      }

      // Check intra-batch collision
      let conflictMsg: string | undefined = undefined;
      const originalName = path.basename(filePath);

      if (newName !== originalName) {
        let uniqueName = newName;
        let counter = 1;

        // Ensure unique within this batch
        while (newNamesSet.has(uniqueName.toLowerCase())) {
          const ext = path.extname(newName);
          const base = path.basename(newName, ext);
          uniqueName = `${base} (${counter})${ext}`;
          conflictMsg = 'Name collision resolved automatically.';
          counter++;
        }
        
        newName = uniqueName;
        newNamesSet.add(newName.toLowerCase());
      } else {
        newNamesSet.add(originalName.toLowerCase());
      }

      preview.push({
        originalPath: filePath,
        newName,
        conflict: conflictMsg,
      });
    }

    return preview;
  }

  private static applyStep(currentName: string, step: RenameStep, index: number): string {
    const ext = path.extname(currentName);
    const base = path.basename(currentName, ext);

    switch (step.type) {
      case 'find_replace':
        return this.applyFindReplace(base, step) + ext;
      case 'prefix_suffix':
        return `${step.prefix || ''}${base}${step.suffix || ''}${ext}`;
      case 'numbering':
        return this.applyNumbering(base, step, index) + ext;
      case 'date_insert':
        return this.applyDateInsert(base, step) + ext;
      default:
        return currentName;
    }
  }

  private static applyFindReplace(base: string, step: RenameStepFindReplace): string {
    if (!step.find) return base;

    if (step.useRegex) {
      try {
        const flags = step.caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(step.find, flags);
        return base.replace(regex, step.replace);
      } catch (e) {
        return base; // If invalid regex, just return unchanged
      }
    } else {
      if (step.caseSensitive) {
        return base.split(step.find).join(step.replace);
      } else {
        // Case insensitive string replace all
        const regex = new RegExp(this.escapeRegExp(step.find), 'gi');
        return base.replace(regex, step.replace);
      }
    }
  }

  private static applyNumbering(base: string, step: RenameStepNumbering, index: number): string {
    const numStr = String(step.startAt + index).padStart(step.padWithZeroes, '0');
    if (step.position === 'start') {
      return `${numStr}${step.separator}${base}`;
    } else {
      return `${base}${step.separator}${numStr}`;
    }
  }

  private static applyDateInsert(base: string, step: RenameStepDateInsert): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');

    let dateStr = '';
    if (step.format === 'YYYY-MM-DD') dateStr = `${yyyy}-${mm}-${dd}`;
    else if (step.format === 'YYYYMMDD') dateStr = `${yyyy}${mm}${dd}`;
    else if (step.format === 'MM-DD-YYYY') dateStr = `${mm}-${dd}-${yyyy}`;

    if (step.position === 'start') {
      return `${dateStr}${step.separator}${base}`;
    } else {
      return `${base}${step.separator}${dateStr}`;
    }
  }

  private static escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }
}
