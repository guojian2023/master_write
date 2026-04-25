export interface Citation {
  id: string;
  type: 'article' | 'book' | 'thesis' | 'conference' | 'web';
  authors: string;
  title: string;
  journalOrPublisher: string; // Journal, Publisher, University, or Conference Name
  year: string;
  volume?: string;
  issue?: string;
  pages?: string;
  url?: string;
  city?: string;
}

export interface Section {
  id: string;
  title: string;
  content: string;
  targetWordCount?: number;
  status: 'empty' | 'draft' | 'complete';
}

export interface Chapter {
  id: string;
  title: string;
  sections: Section[];
  description?: string;
}

export interface Thesis {
  id: string;
  topic: string;
  researchType: 'special' | 'case' | 'design';
  field: string;
  chapters: Chapter[];
  problems: string[]; // Identified problems
  solutions: string[]; // Proposed solutions
  citations: Citation[];
  targetTotalWords?: number;
  updatedAt: string;
}

export interface LogicIssue {
  type: 'inconsistency' | 'vagueness' | 'gap' | 'methodology';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
  sectionId?: string;
  chapterTitle?: string;
  sectionTitle?: string;
}
