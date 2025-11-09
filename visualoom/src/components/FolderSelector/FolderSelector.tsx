import { useState } from "react";
import { Button } from "@mui/material";
import { Input } from "@mui/material";

interface FolderSelectorProps {
    onSelectFolder: (folderPath: string) => void;
}

export const FolderSelector: React.FC<FolderSelectorProps> = ({ onSelectFolder }) => {
    const [folderPath, setFolderPath] = useState("");

    const handleSelect = () => {
        if(!folderPath.trim()) return;
        onSelectFolder(folderPath);
    }

    return (
        <div className="flex flex-col gap-3 bg-white/5 p-4 rounded-2xl shadow-md">
      <h2 className="text-xl font-semibold">📁 Select Folder</h2>
        <Input
            type="text"
            placeholder="Enter folder path (e.g. /Users/you/Pictures)"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            className="w-full"
        />
        <Button onClick={handleSelect}>Select Folder</Button>
    </div>
    )
}

