import { Thesis } from '../types';

export function formatThesisToMarkdown(thesis: Thesis): string {
    let md = `# ${thesis.topic || "未命名论文"}\n\n`;
    
    md += `> **研究类型**：${thesis.researchType || "未知"}\n`;
    md += `> **所在领域**：${thesis.field || "未知"}\n`;
    if (thesis.writingStyle) {
        md += `> **风格设定**：${thesis.writingStyle}\n`;
    }
    md += `> **最后更新**：${new Date(thesis.updatedAt).toLocaleString()}\n\n`;

    md += `---\n\n`;

    // Proposal
    if (thesis.proposal) {
        md += `## 【开题报告】\n\n`;
        if (thesis.proposal.sections && thesis.proposal.sections.length > 0) {
            thesis.proposal.sections.forEach(sec => {
                md += `### ${sec.title}\n\n`;
                if (sec.content) {
                    md += `${sec.content}\n\n`;
                } else {
                    md += `*(尚未生成)*\n\n`;
                }
            });
        } else if (thesis.proposal.content) {
            md += `${thesis.proposal.content}\n\n`;
        }
    }

    // Body Chapters
    if (thesis.chapters && thesis.chapters.length > 0) {
        md += `## 【论文正文】\n\n`;
        
        // Print general outline first
        md += `### 目录大纲\n\n`;
        thesis.chapters.forEach(chapter => {
            md += `- **${chapter.title}**\n`;
            chapter.sections.forEach(sec => {
                md += `  - ${sec.title}\n`;
            });
        });
        md += `\n---\n\n`;

        // Content
        thesis.chapters.forEach(chapter => {
            md += `# ${chapter.title}\n\n`;
            if (chapter.description) {
                md += `> *${chapter.description}*\n\n`;
            }
            chapter.sections.forEach(sec => {
                md += `## ${sec.title}\n\n`;
                if (sec.content) {
                    md += `${sec.content}\n\n`;
                } else {
                    md += `*(本节内容尚在酝酿中...)*\n\n`;
                }
            });
        });
    }

    return md;
}
