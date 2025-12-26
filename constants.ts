import { ErrorCode, Part, RubricRow } from './types';

export const ERROR_CODES: ErrorCode[] = [
  // Content
  { mode: 'content', code: 'LOG', label: 'Logic Issue', description: 'Idea does not make sense.' },
  { mode: 'content', code: 'REF', label: 'Unclear Reference', description: 'A word like "it" or "they" is not clear.' },
  { mode: 'content', code: 'MP', label: 'Major Problem', description: 'Sentence is not understandable.' },

  // Communicative Achievement
  { mode: 'communicative', code: 'FOR', label: 'Formal', description: 'Language is too casual for the situation.' },
  { mode: 'communicative', code: 'WCH', label: 'Word Choice', description: 'Word choice is not the best for the meaning.' },
  { mode: 'communicative', code: 'COL', label: 'Collocation', description: 'Words that normally go together are used wrong.' },
  { mode: 'communicative', code: 'SIM', label: 'Simplify', description: 'Sentence is too long or wordy.' },
  { mode: 'communicative', code: 'XTR', label: 'Extra', description: 'There is an extra word you can remove.' },
  { mode: 'communicative', code: 'AWK', label: 'Awkward', description: 'Sentence is grammatically correct but sounds awkward.' },

  // Organisation
  { mode: 'organisation', code: 'CON', label: 'Connector', description: 'A connector is missing or wrong.' },
  { mode: 'organisation', code: 'CD', label: 'Cohesive Device', description: 'Cohesive device is missing.' },
  { mode: 'organisation', code: 'SST', label: 'Sentence Structure', description: 'Sentence is incomplete or word order is wrong.' },
  { mode: 'organisation', code: 'RO', label: 'Run-on Sentence', description: 'Two or more sentences joined without proper punctuation.' },
  { mode: 'organisation', code: 'LIST', label: 'Listing', description: 'Items in a list are not parallel.' },

  // Language
  { mode: 'language', code: 'V', label: 'Verb-related', description: 'Wrong verb form or tense.' },
  { mode: 'language', code: 'SVA', label: 'Subj-Verb Agreement', description: 'Subject and verb do not match.' },
  { mode: 'language', code: 'PRO', label: 'Pronouns', description: 'Missing or wrong pronouns.' },
  { mode: 'language', code: 'WCL', label: 'Word Class', description: 'Wrong form of a word.' },
  { mode: 'language', code: 'WO', label: 'Word Order', description: 'Words are in the wrong order.' },
  { mode: 'language', code: 'AUX', label: 'Auxiliary Verb', description: 'Missing or wrong auxiliary/modal verb.' },
  { mode: 'language', code: 'ART', label: 'Articles', description: 'Wrong or missing article.' },
  { mode: 'language', code: 'PREP', label: 'Prepositions', description: 'Wrong preposition.' },
  { mode: 'language', code: 'COU', label: 'Number', description: 'Wrong noun form or wrong number.' },
  { mode: 'language', code: 'MIS', label: 'Missing Word', description: 'A word is missing.' },
  { mode: 'language', code: 'SP', label: 'Spelling', description: 'Spelling mistake.' },
  { mode: 'language', code: 'P', label: 'Punctuation', description: 'Punctuation error.' },
  { mode: 'language', code: 'US', label: 'Usage', description: 'Wrong word usage.' },
];

export const RUBRICS: Record<Part, Record<string, RubricRow[]>> = {
  '1': {
    content: [
      { score: 5, desc: "All content is **relevant** (related/relatable to task). **Target reader** (intended recipient) is **fully informed** (all requirements addressed)." },
      { score: 4, desc: "**Performance shares features of scores 3 and 5**" },
      { score: 3, desc: "Minor **irrelevances** (unrelated points) and/or **omissions** (missing requirements) present. **Target reader** is **on the whole informed**." },
      { score: 2, desc: "**Performance shares features of scores 1 and 3**" },
      { score: 1, desc: "**Irrelevances** and/or misinterpretation of task present. **Target reader** is **minimally informed**." },
      { score: 0, desc: "Content is **totally irrelevant** (nothing to do with task). **Target reader** is **not informed**." }
    ],
    communicative: [
      { score: 5, desc: "Communicates **straightforward ideas** (clearly communicated) using **conventions** (genre, format, register) reasonably well." },
      { score: 4, desc: "**Performance shares features of scores 3 and 5**" },
      { score: 3, desc: "Communicates **simple ideas** (clear, simple ways)." },
      { score: 2, desc: "**Performance shares features of scores 1 and 3**" },
      { score: 1, desc: "Produces isolated short units about simple/concrete matters; not always communicating successfully." },
      { score: 0, desc: "**Performance below band 1**" }
    ],
    organisation: [
      { score: 5, desc: "Uses simple connectors and a **limited number of cohesive devices** (linking words, pronouns, substitution) appropriately." },
      { score: 4, desc: "**Performance shares features of scores 3 and 5**" },
      { score: 3, desc: "Text is connected using **basic, high frequency connectors** (e.g., *and, so, because*)." },
      { score: 2, desc: "**Performance shares features of scores 1 and 3**" },
      { score: 1, desc: "**Production unlikely to be connected** (lacks cohesion), though punctuation and simple connectors (i.e., *and*) may occur." },
      { score: 0, desc: "**Performance below band 1**" }
    ],
    language: [
      { score: 5, desc: "Uses **basic vocabulary** appropriately. Uses **simple grammatical forms** (basic tenses, simple clauses) with **good control** (consistent accuracy). **Errors** (systematic mistakes) are noticeable; meaning is still determined." },
      { score: 4, desc: "**Performance shares features of scores 3 and 5**" },
      { score: 3, desc: "Uses basic vocabulary reasonably. Uses simple grammatical forms with some degree of control. **Errors** may **impede** (get in the way of) meaning at times." },
      { score: 2, desc: "**Performance shares features of scores 1 and 3**" },
      { score: 1, desc: "Produces **basic vocabulary** of isolated words/phrases. Few simple grammatical forms with **limited control**." },
      { score: 0, desc: "**Performance below band 1**" }
    ]
  },
  '2': {
    content: [
      { score: 5, desc: "All content is **relevant** (related/relatable to task). **Target reader** (intended recipient) is **fully informed** (all requirements addressed)." },
      { score: 4, desc: "**Performance shares features of scores 3 and 5**" },
      { score: 3, desc: "Minor **irrelevances** (unrelated points) and/or **omissions** (missing requirements) present. **Target reader** is **on the whole informed**." },
      { score: 2, desc: "**Performance shares features of scores 1 and 3**" },
      { score: 1, desc: "**Irrelevances** and/or misinterpretation of task present. **Target reader** is **minimally informed**." },
      { score: 0, desc: "Content is **totally irrelevant** (nothing to do with task). **Target reader** is **not informed**." }
    ],
    communicative: [
      { score: 5, desc: "Uses **conventions** (genre, format, register) to hold reader’s attention and communicate **straightforward ideas**." },
      { score: 4, desc: "**Performance shares features of scores 3 and 5**" },
      { score: 3, desc: "Communicates **straightforward ideas** (clearly communicated) using **conventions** reasonably well." },
      { score: 2, desc: "**Performance shares features of scores 1 and 3**" },
      { score: 1, desc: "Communicates **simple ideas** in simple ways." },
      { score: 0, desc: "**Performance below band 1**" }
    ],
    organisation: [
      { score: 5, desc: "Text is generally **well-organised and coherent** (well planned, united whole), using a **variety of cohesive devices**." },
      { score: 4, desc: "**Performance shares features of scores 3 and 5**" },
      { score: 3, desc: "Uses **simple connectors** and a **limited number of cohesive devices** (linking words, pronouns) appropriately." },
      { score: 2, desc: "**Performance shares features of scores 1 and 3**" },
      { score: 1, desc: "Text is connected using **basic, high frequency connectors** (e.g., *and, so, because*)." },
      { score: 0, desc: "**Performance below band 1**" }
    ],
    language: [
      { score: 5, desc: "Uses a **range** (variety) of **everyday vocabulary** with occasional inappropriate use of **less common lexis**. Uses a **range of simple and some complex grammatical forms** (e.g., noun clauses, passives) with **good control**. **Errors** do not **impede** communication." },
      { score: 4, desc: "**Performance shares features of scores 3 and 5**" },
      { score: 3, desc: "Uses **basic vocabulary** appropriately. Uses **simple grammatical forms** with **good control** (consistent accuracy). While **errors** (systematic mistakes) are noticeable, meaning can still be determined." },
      { score: 2, desc: "**Performance shares features of scores 1 and 3**" },
      { score: 1, desc: "Uses **basic vocabulary** reasonably. Uses **simple grammatical forms** with some degree of control. **Errors** may **impede** (get in the way of) meaning at times." },
      { score: 0, desc: "**Performance below band 1**" }
    ]
  },
  '3': {
    content: [
      { score: 5, desc: "All content is **relevant** (related/relatable to task). **Target reader** (intended recipient) is **fully informed** (all requirements addressed)." },
      { score: 4, desc: "**Performance shares features of Scores 3 and 5**" },
      { score: 3, desc: "Minor **irrelevances** (unrelated points) and/or **omissions** (missing requirements) may be present. **Target reader** is **on the whole informed**." },
      { score: 2, desc: "**Performance shares features of Scores 1 and 3**" },
      { score: 1, desc: "**Irrelevances** and/or misinterpretation of the task may be present. **Target reader** is **minimally informed**." },
      { score: 0, desc: "Content is **totally irrelevant** (nothing to do with task). **Target reader** is **not informed**." }
    ],
    communicative: [
      { score: 5, desc: "Uses the **conventions** (genre, format, register) of the communicative task effectively to hold the **target reader's** attention and communicate with ease, fulfilling all communicative purposes." },
      { score: 4, desc: "**Performance shares features of Scores 3 and 5**" },
      { score: 3, desc: "Uses the **conventions** (genre, format, register) of the communicative task to hold the reader's attention and communicate **straightforward ideas** (clearly communicated) appropriately." },
      { score: 2, desc: "**Performance shares features of Scores 1 and 3**" },
      { score: 1, desc: "Produces a text that communicates **straightforward ideas** using the **conventions** of the communicative task reasonably appropriately." },
      { score: 0, desc: "**Performance below Score 1**" }
    ],
    organisation: [
      { score: 5, desc: "Text is **well-organised and coherent** (well planned, united whole), using a **variety of cohesive devices** (linking words, pronouns) with generally good effect." },
      { score: 4, desc: "**Performance shares features of Scores 3 and 5**" },
      { score: 3, desc: "Text is generally **well-organised and coherent**, using a **variety of cohesive devices**." },
      { score: 2, desc: "**Performance shares features of Scores 1 and 3**" },
      { score: 1, desc: "Uses **simple connectors** and a **limited number of cohesive devices** appropriately." },
      { score: 0, desc: "**Performance below Score 1**" }
    ],
    language: [
      { score: 5, desc: "Uses a **range** (variety) of vocabulary, including **less common lexis** (not frequently used), appropriately. Uses a **range** of **simple and complex grammatical forms** (e.g., noun clauses, passives) with control and flexibility. Occasional **errors** (systematic mistakes) and **slips** (non-systematic mistakes) may be present." },
      { score: 4, desc: "**Performance shares features of Scores 3 and 5**" },
      { score: 3, desc: "Uses a **range** of **everyday vocabulary** with occasional inappropriate use of **less common lexis**. Uses a **range** of **simple and some complex grammatical forms** with a good degree of control. **Errors** do not **impede** (get in the way of) communication." },
      { score: 2, desc: "**Performance shares features of Scores 1 and 3**" },
      { score: 1, desc: "Uses **basic vocabulary** appropriately. Uses **simple grammatical forms** (basic tenses, simple clauses) with a good degree of control. While **errors** are noticeable, meaning can still be determined." },
      { score: 0, desc: "**Performance below Score 1**" }
    ]
  }
};
