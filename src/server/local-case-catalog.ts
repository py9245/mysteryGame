import seedCase0 from "../../data/cases/case-001.json";
import seedCase1 from "../../data/cases/case-002.json";
import seedCase2 from "../../data/cases/case-003.json";
import generatedCase3 from "../../data/generated-cases/generated-1778480974140-ff861018.json";
import generatedCase4 from "../../data/generated-cases/generated-1778481108587-42060c51.json";
import generatedCase5 from "../../data/generated-cases/generated-1778481109264-bd7f3aa3.json";
import generatedCase6 from "../../data/generated-cases/generated-1778481110746-d3072791.json";
import generatedCase7 from "../../data/generated-cases/generated-1778481118624-e52ebd47.json";
import generatedCase8 from "../../data/generated-cases/generated-1778481206955-c85a340d.json";
import generatedCase9 from "../../data/generated-cases/generated-1778481209696-d17d9778.json";
import generatedCase10 from "../../data/generated-cases/generated-1778481215714-b31031a2.json";
import generatedCase11 from "../../data/generated-cases/generated-1778481227347-ecd91e1d.json";
import generatedCase12 from "../../data/generated-cases/generated-1778481309588-44961cd0.json";
import generatedCase13 from "../../data/generated-cases/generated-1778481318688-f7587cf6.json";
import generatedCase14 from "../../data/generated-cases/generated-1778481326283-34e3b718.json";
import generatedCase15 from "../../data/generated-cases/generated-1778481346667-cc5e1530.json";
import generatedCase16 from "../../data/generated-cases/generated-1778481410067-040d9190.json";
import generatedCase17 from "../../data/generated-cases/generated-1778481431789-5d06d1d4.json";
import generatedCase18 from "../../data/generated-cases/generated-1778481437246-2ceca29e.json";
import generatedCase19 from "../../data/generated-cases/generated-1778481463222-07934ec3.json";
import generatedCase20 from "../../data/generated-cases/generated-1778481520442-e4f43555.json";
import generatedCase21 from "../../data/generated-cases/generated-1778481539061-ecb6db5f.json";
import generatedCase22 from "../../data/generated-cases/generated-1778481544760-aa53e4fc.json";
import generatedCase23 from "../../data/generated-cases/generated-1778481561315-383b3057.json";
import generatedCase24 from "../../data/generated-cases/generated-1778634146520-b7595476.json";
import generatedCase25 from "../../data/generated-cases/generated-1778634449689-2405ae04.json";
import generatedCase26 from "../../data/generated-cases/generated-1778634824526-6b60213d.json";
import generatedCase27 from "../../data/generated-cases/generated-1778634838981-d8995fd9.json";
import generatedCase28 from "../../data/generated-cases/generated-1778634841393-c342f2c9.json";
import generatedCase29 from "../../data/generated-cases/generated-1778635105870-2c4e6547.json";
import generatedCase30 from "../../data/generated-cases/generated-1778635119850-b8a27763.json";
import generatedCase31 from "../../data/generated-cases/generated-1778635122991-720f59e9.json";
import generatedCase32 from "../../data/generated-cases/generated-1778635126834-17fe0445.json";
import generatedCase33 from "../../data/generated-cases/generated-1778635206302-dae660d6.json";
import generatedCase34 from "../../data/generated-cases/generated-1778635227913-0a04dc75.json";
import generatedCase35 from "../../data/generated-cases/generated-1778635260007-ce72cae7.json";
import generatedCase36 from "../../data/generated-cases/generated-1778635260778-d3b86c20.json";
import generatedCase37 from "../../data/generated-cases/generated-1778635308470-58c31bcc.json";
import generatedCase38 from "../../data/generated-cases/generated-1778635327323-4d0d111b.json";
import generatedCase39 from "../../data/generated-cases/generated-1778635368161-2188a17f.json";
import generatedCase40 from "../../data/generated-cases/generated-1778635368685-23a91106.json";
import generatedCase41 from "../../data/generated-cases/generated-1778635438815-d8492837.json";
import generatedCase42 from "../../data/generated-cases/generated-1778635440048-931e801b.json";
import generatedCase43 from "../../data/generated-cases/generated-1778635481884-37d92047.json";
import generatedCase44 from "../../data/generated-cases/generated-1778635512047-49b08289.json";
import generatedCase45 from "../../data/generated-cases/generated-1778635542793-ea92ee46.json";

export interface BundledCaseCatalogEntry {
  key: string;
  payload: Record<string, unknown>;
  isPracticePool: boolean;
}

export const BUNDLED_CASE_CATALOG: BundledCaseCatalogEntry[] = [
  { key: "case-001", payload: seedCase0, isPracticePool: true },
  { key: "case-002", payload: seedCase1, isPracticePool: true },
  { key: "case-003", payload: seedCase2, isPracticePool: true },
  { key: "generated-1778480974140-ff861018", payload: generatedCase3, isPracticePool: false },
  { key: "generated-1778481108587-42060c51", payload: generatedCase4, isPracticePool: false },
  { key: "generated-1778481109264-bd7f3aa3", payload: generatedCase5, isPracticePool: false },
  { key: "generated-1778481110746-d3072791", payload: generatedCase6, isPracticePool: false },
  { key: "generated-1778481118624-e52ebd47", payload: generatedCase7, isPracticePool: false },
  { key: "generated-1778481206955-c85a340d", payload: generatedCase8, isPracticePool: false },
  { key: "generated-1778481209696-d17d9778", payload: generatedCase9, isPracticePool: false },
  { key: "generated-1778481215714-b31031a2", payload: generatedCase10, isPracticePool: false },
  { key: "generated-1778481227347-ecd91e1d", payload: generatedCase11, isPracticePool: false },
  { key: "generated-1778481309588-44961cd0", payload: generatedCase12, isPracticePool: false },
  { key: "generated-1778481318688-f7587cf6", payload: generatedCase13, isPracticePool: false },
  { key: "generated-1778481326283-34e3b718", payload: generatedCase14, isPracticePool: false },
  { key: "generated-1778481346667-cc5e1530", payload: generatedCase15, isPracticePool: false },
  { key: "generated-1778481410067-040d9190", payload: generatedCase16, isPracticePool: false },
  { key: "generated-1778481431789-5d06d1d4", payload: generatedCase17, isPracticePool: false },
  { key: "generated-1778481437246-2ceca29e", payload: generatedCase18, isPracticePool: false },
  { key: "generated-1778481463222-07934ec3", payload: generatedCase19, isPracticePool: false },
  { key: "generated-1778481520442-e4f43555", payload: generatedCase20, isPracticePool: false },
  { key: "generated-1778481539061-ecb6db5f", payload: generatedCase21, isPracticePool: false },
  { key: "generated-1778481544760-aa53e4fc", payload: generatedCase22, isPracticePool: false },
  { key: "generated-1778481561315-383b3057", payload: generatedCase23, isPracticePool: false },
  { key: "generated-1778634146520-b7595476", payload: generatedCase24, isPracticePool: false },
  { key: "generated-1778634449689-2405ae04", payload: generatedCase25, isPracticePool: false },
  { key: "generated-1778634824526-6b60213d", payload: generatedCase26, isPracticePool: false },
  { key: "generated-1778634838981-d8995fd9", payload: generatedCase27, isPracticePool: false },
  { key: "generated-1778634841393-c342f2c9", payload: generatedCase28, isPracticePool: false },
  { key: "generated-1778635105870-2c4e6547", payload: generatedCase29, isPracticePool: false },
  { key: "generated-1778635119850-b8a27763", payload: generatedCase30, isPracticePool: false },
  { key: "generated-1778635122991-720f59e9", payload: generatedCase31, isPracticePool: false },
  { key: "generated-1778635126834-17fe0445", payload: generatedCase32, isPracticePool: false },
  { key: "generated-1778635206302-dae660d6", payload: generatedCase33, isPracticePool: false },
  { key: "generated-1778635227913-0a04dc75", payload: generatedCase34, isPracticePool: false },
  { key: "generated-1778635260007-ce72cae7", payload: generatedCase35, isPracticePool: false },
  { key: "generated-1778635260778-d3b86c20", payload: generatedCase36, isPracticePool: false },
  { key: "generated-1778635308470-58c31bcc", payload: generatedCase37, isPracticePool: false },
  { key: "generated-1778635327323-4d0d111b", payload: generatedCase38, isPracticePool: false },
  { key: "generated-1778635368161-2188a17f", payload: generatedCase39, isPracticePool: false },
  { key: "generated-1778635368685-23a91106", payload: generatedCase40, isPracticePool: false },
  { key: "generated-1778635438815-d8492837", payload: generatedCase41, isPracticePool: false },
  { key: "generated-1778635440048-931e801b", payload: generatedCase42, isPracticePool: false },
  { key: "generated-1778635481884-37d92047", payload: generatedCase43, isPracticePool: false },
  { key: "generated-1778635512047-49b08289", payload: generatedCase44, isPracticePool: false },
  { key: "generated-1778635542793-ea92ee46", payload: generatedCase45, isPracticePool: false },
];
