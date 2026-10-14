import { ApiRequestError } from "./errors";

/** Read back the same project after an ambiguous write; never repeat the POST. */
export async function recoverProjectCreation<T extends { project: { title?: string } }>(
  name: string,
  title: string,
  read: (name: string) => Promise<T>,
  originalError: unknown,
  wait: () => Promise<void> = () => new Promise(resolve => setTimeout(resolve, 2000)),
): Promise<T> {
  const status = originalError instanceof ApiRequestError ? originalError.status : undefined;
  if (status !== undefined && status < 500 && ![400, 408, 409].includes(status)) throw originalError;
  for (let attempt = 0; attempt < (status === 400 ? 1 : 10); attempt++) {
    try {
      const result = await read(name);
      if (result.project.title === title.trim()) return result;
    } catch (error) {
      if (error instanceof ApiRequestError && error.status !== undefined && error.status < 500 && error.status !== 404) throw originalError;
    }
    if (attempt < 9 && status !== 400) await wait();
  }
  throw originalError;
}
