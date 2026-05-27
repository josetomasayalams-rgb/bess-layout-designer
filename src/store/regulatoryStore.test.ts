/**
 * Phase 14.2 — regulatoryStore.
 *
 * Pins the small surface of `useRegulatoryStore`: initial state, the
 * three setters, and the jurisdiction derivation in `setActiveProfileId`.
 *
 * Coverage gap addressed: regulatoryStore.ts went from 28 % to actively
 * exercised. No persistence layer — these tests assert in-memory state
 * only.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useRegulatoryStore } from "@/store/regulatoryStore";
import { DEFAULT_REGULATORY_CONTEXT } from "@/rules/regulatoryProfileMetadata";

const INITIAL = useRegulatoryStore.getState();

function reset(): void {
  useRegulatoryStore.setState({
    activeProfileId: INITIAL.activeProfileId,
    activeRuleProfileId: INITIAL.activeRuleProfileId,
    context: INITIAL.context,
  });
}

beforeEach(reset);
afterEach(reset);

describe("regulatoryStore — initial state", () => {
  it("starts with the conservative international profile", () => {
    const s = useRegulatoryStore.getState();
    expect(s.activeProfileId).toBe("ifc-2024-nfpa-855-conservative");
    expect(s.activeRuleProfileId).toBe("chile-utility-predesign");
    expect(s.context).toEqual(DEFAULT_REGULATORY_CONTEXT);
  });
});

describe("regulatoryStore — setActiveProfileId derives jurisdiction", () => {
  it("maps the Chile SEC profile to jurisdiction 'chile'", () => {
    useRegulatoryStore.getState().setActiveProfileId("chile-sec-rgr-06-2024");
    const s = useRegulatoryStore.getState();
    expect(s.activeProfileId).toBe("chile-sec-rgr-06-2024");
    expect(s.context.jurisdiction).toBe("chile");
  });

  it("maps 'custom' profile to jurisdiction 'custom'", () => {
    useRegulatoryStore.getState().setActiveProfileId("custom");
    expect(useRegulatoryStore.getState().context.jurisdiction).toBe("custom");
  });

  it("maps other profiles to jurisdiction 'international'", () => {
    useRegulatoryStore
      .getState()
      .setActiveProfileId("ifc-2024-nfpa-855-conservative");
    expect(useRegulatoryStore.getState().context.jurisdiction).toBe(
      "international"
    );
  });
});

describe("regulatoryStore — setActiveRuleProfileId", () => {
  it("replaces the active rule profile id", () => {
    useRegulatoryStore
      .getState()
      .setActiveRuleProfileId("chile-pmgd-predesign");
    expect(useRegulatoryStore.getState().activeRuleProfileId).toBe(
      "chile-pmgd-predesign"
    );
  });
});

describe("regulatoryStore — updateContext merges partials", () => {
  it("merges a partial context patch without clobbering other fields", () => {
    const initialContext = useRegulatoryStore.getState().context;
    useRegulatoryStore.getState().updateContext({ jurisdiction: "chile" });
    const after = useRegulatoryStore.getState().context;
    expect(after.jurisdiction).toBe("chile");
    // Other fields preserved verbatim
    const restAfter = { ...after };
    const restInitial = { ...initialContext };
    delete (restAfter as Partial<typeof after>).jurisdiction;
    delete (restInitial as Partial<typeof initialContext>).jurisdiction;
    expect(restAfter).toEqual(restInitial);
  });
});
