import { spawn } from "child_process";

export async function runUpdateMonthlyPreviewFor(date: Date): Promise<void> {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "node",
      [
        "scripts/update-monthly-preview.mjs",
        `--year=${year}`,
        `--month=${month}`,
      ],
      {
        stdio: "inherit",
      },
    );

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `update-monthly-preview.mjs exited with code ${code} for ${year}-${month}`,
          ),
        );
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

