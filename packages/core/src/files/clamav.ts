import { parseServerEnv } from "@h2india/config";
import { connect } from "node:net";

// Virus scan with the ClamAV daemon over its INSTREAM command (step 3.7). Throws when clamd can't be reached, so the
// worker retries; a file is never marked clean without an answer.

export type ScanResult = { clean: true } | { clean: false; threat: string };

const CHUNK = 64 * 1024;

export async function scanBytes(bytes: Uint8Array, timeoutMs = 60_000): Promise<ScanResult> {
  const env = parseServerEnv();
  return new Promise<ScanResult>((resolve, reject) => {
    const socket = connect({ host: env.CLAMAV_HOST, port: env.CLAMAV_PORT });
    const replies: Buffer[] = [];
    const fail = (error: Error) => {
      socket.destroy();
      reject(error);
    };
    socket.setTimeout(timeoutMs, () => {
      fail(new Error("clamd did not answer in time"));
    });
    socket.on("error", fail);
    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      for (let at = 0; at < bytes.length; at += CHUNK) {
        const part = bytes.subarray(at, at + CHUNK);
        const size = Buffer.alloc(4);
        size.writeUInt32BE(part.length);
        socket.write(size);
        socket.write(part);
      }
      socket.write(Buffer.alloc(4));
    });
    socket.on("data", (data) => replies.push(data));
    socket.on("end", () => {
      const reply = Buffer.concat(replies).toString("utf8").replace(/\0/g, "").trim();
      if (/^stream: OK$/.test(reply)) resolve({ clean: true });
      else {
        const found = /^stream: (.+) FOUND$/.exec(reply);
        if (found?.[1]) resolve({ clean: false, threat: found[1] });
        else reject(new Error(`clamd: ${reply || "no answer"}`));
      }
    });
  });
}
