import { FiFolder } from "react-icons/fi";

// Dummy: Simulate folder permission (replace with real logic)
const getUserFolders = () =>
  Array.from({ length: 30 }, (_, i) => ({
    name: `Folder ${i + 1}`,
    count: Math.floor(Math.random() * 150),
  }));

function FolderList() {
  const folders = getUserFolders(); // Replace with permission-based data

  return (
    <div className="max-h-64 overflow-y-auto">
      <ul className="flex flex-col gap-2">
        {folders.map((folder, idx) => (
          <li
            key={idx}
            className="flex items-center justify-between px-2 py-2 hover:bg-gray-200 rounded transition"
          >
            <span className="flex items-center gap-2">
              <FiFolder size={20} /> {folder.name}
            </span>
            <span className="text-gray-400">{folder.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
export default FolderList;
