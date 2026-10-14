import { expect, it, vi } from "vitest";
import { ApiRequestError } from "./errors";
import { recoverProjectCreation } from "./project-creation-recovery";
it("recovers a completed project after a response timeout without another write", async () => {
  const read=vi.fn().mockRejectedValueOnce(new ApiRequestError("pending",undefined,404)).mockResolvedValue({project:{title:"My story"}});
  const result=await recoverProjectCreation("proj-fixed","My story",read,new ApiRequestError("timeout",undefined,503),async()=>{});
  expect(result.project.title).toBe("My story");expect(read).toHaveBeenNthCalledWith(1,"proj-fixed");expect(read).toHaveBeenCalledTimes(2);
});
it("does not recover validation or access failures", async () => {
  const read=vi.fn();const error=new ApiRequestError("denied",undefined,403);
  await expect(recoverProjectCreation("proj-fixed","My story",read,error,async()=>{})).rejects.toBe(error);expect(read).not.toHaveBeenCalled();
});
it("never reports a partial project with a different title as completed", async () => {
  const error=new ApiRequestError("lost",undefined,504);const read=vi.fn().mockResolvedValue({project:{title:"incomplete"}});
  await expect(recoverProjectCreation("proj-fixed","My story",read,error,async()=>{})).rejects.toBe(error);expect(read).toHaveBeenCalledTimes(10);
});
