import React, { useEffect } from "react";
import { useState } from "react";
import { startIndexing, getIndexStatus } from "../../api/indexApi";
import { Button } from "@mui/material";
import { ProgressBar } from "../ProgressBar/ProgressBar";
interface IndexingPanelProps {
    folderPath: string;
}
export const IndexingPanelProps : React.FC<IndexingPanelProps> = ({ folderPath }) => {

    const [jobId, setJobId] = useState<string | null>(null);
    const [status, setStatus] = useState<string>("Not started");
    const [progress, setProgress] = useState<number>(0);
    
    const handleStartIndexing = async () => {
        try{
            const response = await startIndexing(folderPath);
            setJobId(response.job_id);
            setStatus("Indexing started");
        }
        catch(error){
            console.error("Error starting indexing:", error);
            setStatus("Error starting indexing");
        }
    }
     useEffect(() => {
        if (!jobId) return;
        const interval = setInterval(async () => {
        const data = await getIndexStatus(jobId);
        setProgress(data.progress);
        if (data.done) {
            setStatus("done");
            clearInterval(interval);
        }
        }, 2000);
        return () => clearInterval(interval);
    }, [jobId]);

    return (
        <div className="flex flex-col gap-3 bg-white/5 p-4 rounded-2xl shadow-md">
      <h2 className="text-xl font-semibold">⚙️ Indexing</h2>
      <p className="text-gray-400">
        {status === "idle" && "Click to start indexing."}
        {status === "indexing" && `Indexing in progress...`}
        {status === "done" && "✅ Indexing complete!"}
      </p>
      {status !== "done" && <ProgressBar value={progress} />}
      {status === "idle" && (
        <Button onClick={handleStartIndexing}>Start Indexing</Button>
      )}
    </div>
    )
}