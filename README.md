# 管理类论文全生命周期 AI 辅助撰写系统 (v1.0.0 发布说明)

这是一个专为 **管理类硕士** 设计的学术论文辅助撰写工具。它不仅提供简单的内容生成，更核心的是通过首创的“**生成管线 (Generation Pipeline)**”实现从选题到正文的全流程逻辑统筹与学术合规性管理。

## 🌟 本次发布核心特性 (Release Notes)

- **生成管线管理 (核心)**：首创论文生成全流程节点控制，涵盖：题目 -> 风格 -> 大纲 -> 开题报告 -> 正文。
- **学术合规性驱动**：深度集成学位论文规范，内置逻辑闭环检查与学术化润色引擎。
- **多模型灵活配置**：原生支持 Google Gemini、OpenAI 以及 **硅基流动 (SiliconFlow)** 聚合平台。
- **节点级模型覆盖**：允许在生成管线中，针对不同的生成环节单独指定模型与 API Key（例如：大纲阶段使用逻辑较强的 GPT-4o，正文阶段使用对中文学术更友好的 DeepSeek-V3）。
- **风格克隆技术**：支持上传范文并自动提取学术写作风格，生成具有特定笔触的正文。
- **强制 Markdown 落地持久化防失忆机制**：系统自动在项目根目录的 `outputs/` 文件夹下生成并同步最新的 `[论文选题].md` 副本，每一阶段成果都会实时落盘为标准可读文件，彻底杜绝数据在浏览器缓存中的丢失问题。

### Version 1.0.0 Updates

#### Core New Features & Enhancements
- **Global Prompt / Research Ideas Support**: Introduced a capability to parse scattered user thinking (auxiliary writing ideas) and academicize them into strict global constraints, guiding both outline structures and deep chapter generation.
- **Outline Regeneration Capability**: Users can now re-visit their project's global constraints from the project list and completely regenerate the initial outline based on refined global boundaries.
- **"Specialised Research" Standardized & Defaulted**: "专题研究" (Special Research) is now structurally refined and set as the default thesis mode, enforcing strict architectural requirements (e.g., problem diagnostics, root-cause analyses, robust solutions).
- **Multi-Thesis Management Improvements**: Enhanced multi-project management. Users can now easily delete projects and view configurations transparently tied to remote and local storage.

#### File-Level Implementation Details

- **`src/App.tsx`**:
  - Augmented `handleStartProject` to extract user concepts using `SYSTEM_PROMPTS.IDEAS_OPTIMIZER` and persist the resulting global prompt.
  - Implemented `handleRegenerateOutline` core logic to recreate an outline dynamically for an existing thesis without disturbing the master tracking state.
  - Safely managed component state for thesis deletion (`onDeleteThesis`) and mapped explicit research types (`special`, `case`, `design`) to parsed, human-readable prompts.

- **`src/types.ts`**:
  - Updated the `Thesis` interface to securely track `globalPrompt` and `rawWritingIdeas` alongside other attributes.

- **`src/services/aiService.ts`**:
  - Created the robust `IDEAS_OPTIMIZER` system prompt.
  - Updated `STRUCTURE_GENERATOR` and `CHAPTER_STRUCTURE_GENERATOR` to vigorously enforce the user's `globalPrompt` as an absolute constraint.
  - Enforced a rigorous 7-chapter foundational structure for the "专题研究" (Special Research) template, preventing academic deviance.

- **`src/components/ProjectStartup.tsx`**:
  - Set the research type default to `special`.
  - Added new form UI specifically for gathering auxiliary research idea definitions.
  - Expanded the project list UI to include a dedicated modal for inspecting, editing, and initiating a re-generation sequence for existing projects based on their semantic global prompts.
  - Embedded an irreversible project deletion flow to clear unwanted proposals.

- **`src/components/OutlineView.tsx`**:
  - Modified the AI generation parameters for sub-sections (`CHAPTER_STRUCTURE_GENERATOR`) to incorporate `globalPrompt` constraints during on-the-fly chapter building.
  - Adjusted the `CONTENT_EXPANDER` payload to seamlessly absorb the `globalPrompt`, guiding generated text and stopping thematic drift.

- **`src/components/EditorView.tsx`**:
  - Adapted the localized `prompt` configuration directly inside the editor view to observe `globalConstraint`, ensuring that any granular, manual AI prompt operations run within the user's broader academic boundaries.

---

## 📝 流程节点、上下文提示词 (Context Prompts) 与上下文字数需求 (Context Size)

系统通过不同的“学术专家人格”串联起整个写作流程。由于各环节对理解范围的要求不同，以下列出了每一步的设计细节及**建议的上下文窗口大小**：

### 1. 题目确定 (Topic)
- **提示词角色**: `TITLE_GENERATOR` (资深导师视角)
- **上下文要求**: 深度对标管理类选题规范，要求生成的题目具备“理论+对象+管理方向”的三段式结构。
- **上下文大小预估**: **极小 (约 2K - 4K Tokens)**。
  - *分析*：仅需处理少量行业设定、研究方向和关键词，任何主流小模型（如 DeepSeek-Chat, Gemini-1.5-Flash）均可无压力且快速胜任。

### 2. 风格提取 (Style)
- **提示词角色**: `STYLE_EXTRACTOR` (语言学与期刊编辑视角)
- **上下文要求**: 读取参考文献文本，从“全局基调”、“各章节专门指标（如绪论的背景铺垫节奏、结论的精炼度）”提取出结构化的参考风格指南。
- **上下文大小预估**: **中到大 (约 32K - 128K Tokens)**。
  - *分析*：取决于用户投入系统的参考范篇幅。若输入多篇完整的核心期刊文献，极耗上下文。强烈建议使用支持超大上下文窗口的模型（如 Gemini-1.5-Pro 或 DeepSeek-V3 128K版本）。

### 3. 大纲生成 (Outline)
- **提示词角色**: `STRUCTURE_GENERATOR` (答辩委员会评审专家视角)
- **上下文要求**: 强制要求“提出问题 -> 分析问题 -> 解决问题 -> 验证效果”的闭环逻辑。针对“案例研究”、“应用研究”、“设计类”三种应用差异化三级架构。
- **上下文大小预估**: **偏小 (约 8K - 16K Tokens)**。
  - *分析*：需要结合前期提取的风格设定、用户自定义方向，输出严格的层级树状 JSON 目录。推荐逻辑推理与指令遵从性度高的模型（如 GPT-4o 或 DeepSeek-V3/R1）。

### 4. 开题报告 (Proposal)
- **提示词角色**: `PROPOSAL_GENERATOR` (资深导师开题指导视角)
- **上下文要求**: 根据大纲展开为详细的规划报告。**关键节点**：在输出末尾使用 `<CONSTRAINT>` 标签提炼“**核心逻辑提示词 (Constraint Prompt)**”，此提示词会作为后续所有正文生成的“永久基因定义”，保障全篇核心不偏移。
- **上下文大小预估**: **中等 (约 16K - 32K Tokens)**。
  - *分析*：主要考验模型的长文本输出能力（需生成数千字的结构化论述），以及根据输入大纲精准扩写的理解力。

### 5. 正文扩展 (Body)
- **提示词角色**: `CONTENT_EXPANDER` (高质量学术写手)
- **上下文要求**: 引入“防 AIGC 检测”防线，通过提升 Perplexity (困惑度) 和 Burstiness (突发性)，破坏 AI 机械、千篇一律的排比句与连接词。
- **上下文大小预估**: **偏大 (单次生成需求约 32K - 64K Tokens)**。
  - *分析*：单节生成时，需要囊括：① 包含全篇逻辑的 Constraint Prompt，② 全局大纲结构树，③ 本节专属的文献素材或数据输入。由于需要多次调用，不仅要求上下文窗口足够大，也对成本有要求。这是 **最适合** 挂载本地开源高配模型 或 SiliconFlow 高性价比大模型（DeepSeek）的环节。

---

## 🔍 各功能的隐式/默认上下文注入统计

在AI辅助生成过程中，系统会自动替用户附加关键上下文，以保障全局连贯与学术合规。详见下表：

| 功能模块 | 对应操作 / API | 系统默认注入的隐含上下文 (注入源) | 核心目的 |
| :--- | :--- | :--- | :--- |
| **题目生成** | `TITLE_GENERATOR` | 研究对象、核心问题、理论方法、补充关键词 | 结合多维度关键信息生成选题 |
| **架构与大纲** | `STRUCTURE_GENERATOR` | 论文题目、研究类型、行业领域 | 保障大结构方向无误 |
| **大纲子节生成** | `CHAPTER_STRUCTURE_GENERATOR` | 全局大纲结构树、当前章标题 | 补充生成特定章节的小节，并符合全局脉络 |
| **开题报告生成** | `PROPOSAL_GENERATOR` | 论文全局大纲、本报告的具体目标小节要求 | 防止开题内容的重复和与大纲的冲突 |
| **学术风格提取** | `STYLE_EXTRACTOR` | 用户贴入的论文范文片段 | 给全文定立结构化的排版与语气基准 |
| **AI 扩写正文** | `CONTENT_EXPANDER` | **全局大纲摘要**、当前章/节标题、**强独有写作风格**、**开题报告核心约束** | 在局部生成内容时，强制与开题、风格及全文逻辑看齐，防止偏题 |
| **AI 续写** | `CONTENT_CONTINUER` | 截断前的正文文本片段、**强独有写作风格**、**开题报告核心约束** | 顺着残缺文本精准衔接，并保持逻辑架构不被带跑 |
| **学术化润色** | `ACADEMIC_REWRITER` | 代润色的源文本文段、**开题报告核心约束** | 在改写词汇的同时，不损失或扭曲原有核心思想 |
| **修订与重构** | `CONTENT_REVISER` | 原正文内容、用户的【修改意见】 | 针对特定修改意见重组原文逻辑和理论支撑 |
| **全篇逻辑审查** | `LOGIC_AUDITOR` | 论文题目、**附带章/小节标题特征的全文内容总结摘录** | 进行大规模的连贯性盲审，对脱节的地方抛出Issue以供修改 |

---

## 🛠 项目结构与核心修改路径 (Dev Path)

为了支撑以上生成管线设计，对底层架构进行了如下核心开发与修改：

1. **状态结构重构 (`src/types.ts`)**  
   新增 `GenerationNode` 与 `GenerationStepId` 类型，为每个生成阶段（题目、风格、大纲、开题、正文）绑定状态（idle/running/success/error）与独立的 `customConfig`（支持覆盖全局模型）。
2. **中心化管线控制台 (`src/components/GenerationManager.tsx`)**  
   **(全新引入)** 作为整个流程的总控大盘界面。包含进度可视化、直接重分布“提纲至开题”流转指令，并实现节点级独立 API 模型表单配置功能。
3. **AI 底层服务分发 (`src/services/aiService.ts`)**  
   重构了由 `AskAI` 驱动的请求发送逻辑，现在支持接受从管线页面传来的 `overrideApiConfig` 拦截器，动态重定向流量（比如：全局 Gemini，单步重载至 OpenAI/SiliconFlow）。囊括了所有学术专家指令 (SYSTEM_PROMPTS)。
4. **模型支持矩阵扩展 (`src/components/ApiSettingsModal.tsx` & `src/lib/apiConfig.ts`)**  
   扩展 `ApiConfig` 结构。除了官方 OpenAI、Gemini，原生写入了“硅基流动 SiliconFlow”生态链（DeepSeek-V3, Qwen 等推荐下拉菜单），降低国内用户或性价比优选配置的使用门槛。

---

*本项目为自动化写作提供辅助环境，强烈建议使用者在此平台上进行“人工干预（Human in the loop）”的大纲修订与关键段落重构，以达最高学术水准。*

---

## 🚀 部署与初始化 (Deployment & Initialization)

本系统**没有内置默认的 API Key**，在首次部署或启动项目前，需要您自行配置相关的 API 信息。请按照以下步骤进行初始化操作：

1. **环境准备与依赖安装**：
   在项目根目录下运行如下命令安装所有前端依赖资源：
   ```bash
   npm install
   ```
2. **启动本地开发服务器**：
   执行运行指命，在本地启动系统：
   ```bash
   npm run dev
   ```
3. **系统内置 API 初始化**：
   - 首次打开浏览器访问系统时，请点击界面右上角（或侧边栏）的 **⚙️ API设置** 按钮，打开全局 API 配置面板。
   - 在弹出的配置面板中，选择您希望使用的 AI 平台服务（例如：Google Gemini、OpenAI、SiliconFlow 硅基流动 等）。
   - 填入您自己申请的 **API Key** 以及（如有必要的）**Base URL** 和 **默认模型系列**。
   - 保存配置后，系统方可正常运转。

*(注：系统支持为特定生成节点单独指定 API Key 与模型，如果您在生成大盘中额外配置了节点专用的模型，则以节点配置为首选)*

---

## 📜 开源协议与声明 (Open Source License & Notice)

1. **严禁商用**：本开源项目及一切相关衍生产品**禁止用于任何形式的商业盈利目的**（Non-commercial use only）。仅供个人学术辅助、技术交流、技术学习及研究使用。
2. **责任豁免**：本项目旨在为创作者提供文字与逻辑辅助参考，由本应用所生成的任何理论框架、分析内容、实验数据及相关结论均由通用大语言模型生成，**不代表本系统及开发者的立场**。
3. **学术诚信提示**：本软件仅用于辅助构思与整体结构优化，请严格遵守所在高校与国家相关学术规范及纪律准则。严禁将其用于代写、数据造假或任何破坏学术公平及科研道德的违规行为。最终提交成果的合法性、原创性和有效性均由使用者独立承担全部责任。

---

## ☕ 赞助与支持 (Sponsor)

如果您觉得本项目对您的论文写作有帮助，欢迎对我进行赞助，以支持后续的持续开发和维护！

- **ETH / BSC / Polygon 钱包地址**: `0xb42f84a4891b47c5cc4e3f8030b774260d03c7b6`
