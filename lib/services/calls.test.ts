import { describe, expect, it } from "vitest";
import { CALL_DATA_KEY, extractStructuredData, pickIntakeData } from "./calls";

const fields = {
  caller_name: "Jane Doe",
  issue_summary: "Leaking pipe under the sink",
  urgency_level: "urgent",
  outcome: "booked",
  matter_type: "family",
};

describe("extractStructuredData", () => {
  it("reads the multi-plan array shape", () => {
    expect(
      extractStructuredData({ structuredDataMulti: [{ key: CALL_DATA_KEY, data: fields }] })
    ).toEqual(fields);
  });

  it("reads the keyed structured-outputs shape", () => {
    expect(
      extractStructuredData({ structuredDataMulti: { abc: { name: CALL_DATA_KEY, result: fields } } })
    ).toEqual(fields);
  });

  it("falls back to the legacy structuredData", () => {
    expect(extractStructuredData({ structuredData: fields })).toEqual(fields);
  });

  it("returns an empty object when there is no call data", () => {
    expect(extractStructuredData(null)).toEqual({});
    expect(extractStructuredData({ structuredDataMulti: [{ unrelated: 1 }] })).toEqual({});
  });
});

describe("pickIntakeData", () => {
  const intake = [{ key: "matter_type" }, { key: "other_parties" }, { key: "key_deadline" }];

  it("keeps only the industry's declared keys, trimmed", () => {
    expect(
      pickIntakeData(
        { ...fields, matter_type: "  family ", other_parties: "John Doe", stray: "x" },
        intake
      )
    ).toEqual({ matter_type: "family", other_parties: "John Doe" });
  });

  it("drops empty and 'unknown' values, and non-strings", () => {
    expect(
      pickIntakeData({ matter_type: "", other_parties: "Unknown", key_deadline: 42 }, intake)
    ).toBeNull();
  });

  it("returns null for industries with no intake fields", () => {
    expect(pickIntakeData(fields, [])).toBeNull();
  });
});
