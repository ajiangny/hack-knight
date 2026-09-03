// Shared judge shapes/helpers for the judges tab.

import type { AdminJudge, JudgeForm, RawJudge } from "../adminTypes";

export const EMPTY_JUDGE: JudgeForm = {
  name: "",
  title: "",
  company1_id: "",
  company2_id: "",
  photo_url: null,
  _photoFile: null,
  _photoPreview: null,
};

export function normalizeJudge(j: RawJudge): AdminJudge {
  return {
    ...j,
    company1_id: j.company1_id ?? "",
    company2_id: j.company2_id ?? "",
  };
}

type JudgeFields = Pick<AdminJudge, "name" | "title" | "company1_id" | "company2_id">;

export function judgeFieldsEqual(a: JudgeFields, b: JudgeFields): boolean {
  return (
    a.name === b.name &&
    a.title === b.title &&
    a.company1_id === b.company1_id &&
    a.company2_id === b.company2_id
  );
}
