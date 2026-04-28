| Functional Modules | Corresponding Operations/APIs | Implicit Context of System Default Injection (Injection Source) | Core Purpose |
| :--- | :--- | :--- | :--- |
| **Topic Generation** | `TITLE_GENERATOR` | Research subject, core problem, theoretical methods, supplementary keywords | Generate topic selection by combining multi-dimensional key information |
**Structure and Outline** | `STRUCTURE_GENERATOR` | Thesis Title, Research Type, Industry Field | Ensure the overall structure and direction are correct |
| **Outline Subsection Generation** | `CHAPTER_STRUCTURE_GENERATOR` | Global outline structure tree, current chapter title | Generates subsections for a specific chapter, conforming to the global structure |
| **Project Proposal Generation** | `PROPOSAL_GENERATOR` | Overall thesis outline, specific objectives and requirements for this report | Prevents duplication of proposal content and conflicts with the outline |
| **Academic Style Extraction** | `STYLE_EXTRACTOR` | User-submitted sample paper excerpts | Establishing structured formatting and tone guidelines for the entire text |
| **AI-Enlarged Text** | `CONTENT_EXPANDER` | **Global Outline Summary**, Current Chapter/Section Title, **Strongly Unique Writing Style**, **Core Constraints of the Proposal** | When generating content locally, it forces alignment with the proposal, style, and overall logic to prevent deviation from the topic.
| **AI-assisted continuation** | `CONTENT_CONTINUER` | Text fragments before truncation, **strong and unique writing style**, **core constraints of the research proposal** | Accurately connect the incomplete text while maintaining the logical structure.
| **Academic Polishing** | `ACADEMIC_REWRITER` | Polished source text and **core constraints of the research proposal** | Rewrites vocabulary without losing or distorting the original core ideas.
| **Revision and Restructuring** | `CONTENT_REVISER` | Original text content, user's [revision comments] | Restructuring the original text's logic and theoretical support based on specific revision comments |
| **Full-scale logical review** | `LOGIC_AUDITOR` | Summary and excerpt of the full text, including the paper title and **features of chapter/section headings** | Conduct a large-scale, continuous blind review, raising issues for revision of any inconsistencies |


---


## 🛠 Project Structure and Core Modification Path (Dev Path)


To support the above pipeline design, the following core developments and modifications were made to the underlying architecture:


1. **State Structure Refactoring (`src/types.ts`)**
Added `GenerationNode` and `GenerationStepId` types to bind a status (idle/running/success/error) and an independent `customConfig` (supports overriding the global model) to each generation stage (topic, style, outline, opening, body).
2. **Centralized Pipeline Control Console (`src/components/GenerationManager.tsx`)**
**(Newly Introduced)** Serves as the overall control panel for the entire process. It includes progress visualization, direct redistribution of "outline to proposal" workflow instructions, and implementation of node-level independent API model form configuration functionality.
3. **AI Underlying Service Distribution (`src/services/aiService.ts`)**
The request sending logic driven by `AskAI` has been refactored, and it now supports accepting `overrideApiConfig` interceptors from pipeline pages to dynamically redirect traffic (e.g., global Gemini, single-step reload to OpenAI/SiliconFlow). All academic expert commands (SYSTEM_PROMPTS) are now included.
4. **Model supports matrix extensions (`src/components/ApiSettingsModal.tsx` & `src/lib/apiConfig.ts`)**
The `ApiConfig` structure has been expanded. In addition to the official OpenAI and Gemini, it is natively integrated into the "SiliconFlow" ecosystem (recommended dropdown menus for DeepSeek-V3, Qwen, etc.), lowering the barrier to entry for domestic users or those seeking cost-effective configurations.


---


*This project provides an auxiliary environment for automated writing. Users are strongly encouraged to perform "human-in-the-loop" outline revisions and key paragraph restructuring on this platform to achieve the highest academic standards.*


---


## 🚀 Deployment & Initialization


This system **does not have a built-in default API Key**. You will need to configure the relevant API information manually before initial deployment or project startup. Please follow these steps for initialization:


1. **Environment Preparation and Dependency Installation**:
Run the following command in the project root directory to install all frontend dependency resources:
bash
npm install
```
2. **Start the local development server:**
Execute the command to start the system locally:
bash
npm run dev
```
3. **System Built-in API Initialization**:
- When you first open your browser to access the system, please click the **⚙️ API Settings** button in the upper right corner (or sidebar) of the interface to open the global API configuration panel.
- In the pop-up configuration panel, select the AI ​​platform service you wish to use (e.g., Google Gemini, OpenAI, SiliconFlow, etc.).
- Enter your own API Key and (if necessary) the Base URL and the Default Model Series.
- The system will only function properly after the configuration is saved.


*(Note: The system supports specifying API Keys and models for specific generation nodes. If you have additionally configured node-specific models in the generation dashboard, the node configuration will be used first.)*


---


## 📜 Open Source License & Notice


1. **Strictly Prohibited for Commercial Use:** This open-source project and all related derivative products are **prohibited from any form of commercial profit-making purpose**. They are intended solely for personal academic assistance, technical exchange, technical learning, and research.
2. **Liability Waiver:** This project aims to provide creators with textual and logical support. Any theoretical frameworks, analyses, experimental data, and related conclusions generated by this application are generated by the General Large Language Model and **do not represent the position of this system or its developers.**
3. **Academic Integrity Notice:** This software is intended solely to assist in conceptualization and overall structure optimization. Users must strictly adhere to the relevant academic norms and disciplinary guidelines of their university and the nation. Its use for ghostwriting, data fabrication, or any other conduct that undermines academic fairness and research ethics is strictly prohibited. Users are solely responsible for the legality, originality, and validity of their final submissions.


## Sponsorship Support
1. **wallet**: BSC or ETH : 0xb42f84a4891b47c5cc4e3f8030b774260d03c7b6
