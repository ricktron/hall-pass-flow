
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DestinationChartProps {
  data: Array<{
    destination: string;
    count: number;
    percentage: number;
  }>;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

const DestinationChart = ({ data }: DestinationChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No destination data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ destination, percentage }) => `${destination}: ${percentage}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="count"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value, name) => [value, 'Trips']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default DestinationChart;
