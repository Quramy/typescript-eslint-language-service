export async function useInvalidAwait() {
  await "value";
}

export function useImpliedEval() {
  setTimeout("alert(`Hi!`);", 100);
}

export function unexpectedToStringResult() {
  return "" + {};
}

export function useUnneededIndexSignature() {
  const obj = { prop: 100 };
  return obj["prop"];
}

export function useVoid() {
  const res = alert("Are you sure?");
  return res;
}
