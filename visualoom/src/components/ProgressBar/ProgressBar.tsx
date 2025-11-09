interface ProgressBarProps {
  value: number;
}

export const ProgressBar = ({ value }: ProgressBarProps) => {
  return (
    <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
      <div
        className="bg-blue-500 h-full transition-all duration-300"
        style={{ width: `${value}%` }}
      ></div>
    </div>
  );
};
