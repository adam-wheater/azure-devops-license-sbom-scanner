import * as React from "react";
import { ScanProgress as ScanProgressType } from "@/models/types";
import { Progress } from "./ui";

interface ScanProgressProps {
  progress: ScanProgressType;
}

export const ScanProgress: React.FC<ScanProgressProps> = ({ progress }) => {
  if (progress.phase === "complete") return null;

  const cached = progress.cachedRepos ?? 0;
  const failed = progress.failedRepos?.length ?? 0;

  return (
    <div className="ax-section">
      <Progress
        label={progress.message}
        current={progress.reposCompleted}
        total={progress.reposTotal}
        indeterminate={progress.reposTotal === 0}
      />
      {(cached > 0 || failed > 0) && (
        <div className="ax-row" style={{ marginTop: 6 }}>
          {cached > 0 && <span className="ax-fine">{cached} from cache</span>}
          {failed > 0 && (
            <span className="ax-fine" role="status">
              {failed} failed
            </span>
          )}
        </div>
      )}
    </div>
  );
};
