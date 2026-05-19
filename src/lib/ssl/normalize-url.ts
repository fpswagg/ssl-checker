const HOST_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export function normalizeHost(input: string): string {
  let value = input.trim().toLowerCase();
  if (!value) {
    throw new Error("URL is required");
  }

  value = value.replace(/^https?:\/\//, "");
  value = value.split("/")[0] ?? value;
  value = value.split(":")[0] ?? value;
  value = value.replace(/\.$/, "");

  if (!value || !HOST_PATTERN.test(value)) {
    throw new Error("Invalid hostname");
  }

  return value;
}
